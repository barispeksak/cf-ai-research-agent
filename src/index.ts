import {
  decomposeQuestion,
  researchSubQuestion,
  synthesizeReport,
  handleFollowUp,
} from "./agent";
import HTML from "./frontend.html";

export { ResearchSession } from "./session";

interface Env {
  AI: Ai;
  RESEARCH_SESSION: DurableObjectNamespace;
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function getSessionStub(env: Env, sessionId: string): DurableObjectStub {
  const id = env.RESEARCH_SESSION.idFromName(sessionId);
  return env.RESEARCH_SESSION.get(id);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      // Frontend
      if (path === "/" && request.method === "GET") {
        return new Response(HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // API routes
      if (path === "/api/research" && request.method === "POST") {
        return handleResearch(request, env);
      }

      if (path === "/api/followup" && request.method === "POST") {
        return handleFollowUpRoute(request, env);
      }

      if (path.startsWith("/api/session/") && request.method === "GET") {
        const sessionId = path.split("/api/session/")[1];
        if (!sessionId) return json({ error: "Session ID required" }, 400);
        const stub = getSessionStub(env, sessionId);
        const res = await stub.fetch(new Request("http://do/session"));
        const data = await res.json();
        return json(data);
      }

      if (path.startsWith("/api/session/") && request.method === "DELETE") {
        const sessionId = path.split("/api/session/")[1];
        if (!sessionId) return json({ error: "Session ID required" }, 400);
        const stub = getSessionStub(env, sessionId);
        await stub.fetch(new Request("http://do/reset", { method: "DELETE" }));
        return json({ ok: true });
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      return json({ error: message }, 500);
    }
  },
};

async function handleResearch(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { topic?: string; sessionId?: string };
  const topic = body.topic?.trim();
  if (!topic) {
    return json({ error: "topic is required" }, 400);
  }

  const sessionId = body.sessionId || crypto.randomUUID();
  const stub = getSessionStub(env, sessionId);

  // Save user message
  await stub.fetch(
    new Request("http://do/messages", {
      method: "POST",
      body: JSON.stringify({ role: "user", content: `Research topic: ${topic}` }),
    })
  );

  // Update state: decomposing
  await stub.fetch(
    new Request("http://do/state", {
      method: "POST",
      body: JSON.stringify({ topic, status: "decomposing" }),
    })
  );

  // Step 1: Decompose
  let subQuestions: string[];
  try {
    subQuestions = await decomposeQuestion(env.AI, topic);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Decomposition failed";
    await stub.fetch(
      new Request("http://do/state", {
        method: "POST",
        body: JSON.stringify({ status: "error" }),
      })
    );
    return json({ error: msg, sessionId }, 500);
  }

  await stub.fetch(
    new Request("http://do/state", {
      method: "POST",
      body: JSON.stringify({ subQuestions, status: "researching" }),
    })
  );

  // Step 2: Research each sub-question
  const findings: string[] = [];
  for (let i = 0; i < subQuestions.length; i++) {
    try {
      const finding = await researchSubQuestion(
        env.AI,
        subQuestions[i],
        findings
      );
      findings.push(finding);

      await stub.fetch(
        new Request("http://do/state", {
          method: "POST",
          body: JSON.stringify({ findings }),
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Research failed";
      findings.push(`Error researching: ${msg}`);
    }
  }

  // Step 3: Synthesize
  await stub.fetch(
    new Request("http://do/state", {
      method: "POST",
      body: JSON.stringify({ status: "synthesizing" }),
    })
  );

  let finalReport: string;
  try {
    finalReport = await synthesizeReport(env.AI, topic, subQuestions, findings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Synthesis failed";
    await stub.fetch(
      new Request("http://do/state", {
        method: "POST",
        body: JSON.stringify({ status: "error" }),
      })
    );
    return json({ error: msg, sessionId }, 500);
  }

  // Save final state
  await stub.fetch(
    new Request("http://do/state", {
      method: "POST",
      body: JSON.stringify({ finalReport, status: "complete" }),
    })
  );

  // Save assistant message
  await stub.fetch(
    new Request("http://do/messages", {
      method: "POST",
      body: JSON.stringify({ role: "assistant", content: finalReport }),
    })
  );

  return json({
    sessionId,
    topic,
    subQuestions,
    findings,
    report: finalReport,
    status: "complete",
  });
}

async function handleFollowUpRoute(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    question?: string;
    sessionId?: string;
  };
  const question = body.question?.trim();
  const sessionId = body.sessionId;

  if (!question || !sessionId) {
    return json({ error: "question and sessionId are required" }, 400);
  }

  const stub = getSessionStub(env, sessionId);

  // Get current state and messages
  const stateRes = await stub.fetch(new Request("http://do/state"));
  const { state } = (await stateRes.json()) as {
    state: { finalReport: string };
  };

  const msgRes = await stub.fetch(new Request("http://do/messages"));
  const { messages } = (await msgRes.json()) as {
    messages: { role: string; content: string }[];
  };

  if (!state.finalReport) {
    return json({ error: "No research report found for this session" }, 400);
  }

  // Save user follow-up message
  await stub.fetch(
    new Request("http://do/messages", {
      method: "POST",
      body: JSON.stringify({ role: "user", content: question }),
    })
  );

  // Get follow-up answer
  const answer = await handleFollowUp(
    env.AI,
    question,
    state.finalReport,
    messages
  );

  // Save assistant response
  await stub.fetch(
    new Request("http://do/messages", {
      method: "POST",
      body: JSON.stringify({ role: "assistant", content: answer }),
    })
  );

  return json({ answer, sessionId });
}
