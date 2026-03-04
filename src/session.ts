export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ResearchState {
  topic: string;
  subQuestions: string[];
  findings: string[];
  finalReport: string;
  status: "idle" | "decomposing" | "researching" | "synthesizing" | "complete" | "error";
}

const MAX_MESSAGES = 30;

function emptyState(): ResearchState {
  return {
    topic: "",
    subQuestions: [],
    findings: [],
    finalReport: "",
    status: "idle",
  };
}

export class ResearchSession {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (method === "POST" && path === "/messages") {
        return this.addMessage(request);
      }
      if (method === "GET" && path === "/messages") {
        return this.getMessages();
      }
      if (method === "POST" && path === "/state") {
        return this.updateState(request);
      }
      if (method === "GET" && path === "/state") {
        return this.getState();
      }
      if (method === "DELETE" && path === "/reset") {
        return this.resetSession();
      }
      if (method === "GET" && path === "/session") {
        return this.getFullSession();
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      return json({ error: message }, 500);
    }
  }

  private async addMessage(request: Request): Promise<Response> {
    const body = (await request.json()) as { role: string; content: string };
    if (!body.role || !body.content) {
      return json({ error: "role and content required" }, 400);
    }

    const messages: Message[] =
      (await this.ctx.storage.get<Message[]>("messages")) ?? [];

    const msg: Message = {
      role: body.role as Message["role"],
      content: body.content,
      timestamp: Date.now(),
    };

    messages.push(msg);

    // Keep only last MAX_MESSAGES
    const trimmed = messages.slice(-MAX_MESSAGES);
    await this.ctx.storage.put("messages", trimmed);

    return json({ ok: true, messageCount: trimmed.length });
  }

  private async getMessages(): Promise<Response> {
    const messages: Message[] =
      (await this.ctx.storage.get<Message[]>("messages")) ?? [];
    return json({ messages });
  }

  private async updateState(request: Request): Promise<Response> {
    const partial = (await request.json()) as Partial<ResearchState>;
    const current: ResearchState =
      (await this.ctx.storage.get<ResearchState>("state")) ?? emptyState();

    const updated: ResearchState = { ...current, ...partial };
    await this.ctx.storage.put("state", updated);

    return json({ ok: true, state: updated });
  }

  private async getState(): Promise<Response> {
    const state: ResearchState =
      (await this.ctx.storage.get<ResearchState>("state")) ?? emptyState();
    return json({ state });
  }

  private async resetSession(): Promise<Response> {
    await this.ctx.storage.deleteAll();
    return json({ ok: true });
  }

  private async getFullSession(): Promise<Response> {
    const messages: Message[] =
      (await this.ctx.storage.get<Message[]>("messages")) ?? [];
    const state: ResearchState =
      (await this.ctx.storage.get<ResearchState>("state")) ?? emptyState();
    return json({ messages, state });
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
