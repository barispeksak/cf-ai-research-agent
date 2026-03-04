const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as const;

function extractText(response: unknown): string {
  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;
    if (typeof obj.response === "string") return obj.response;
    // ReadableStream check
    if (typeof obj.response === "object" && obj.response !== null) {
      return JSON.stringify(obj.response);
    }
    // Some models return { result: { response: "..." } }
    if (obj.result && typeof obj.result === "object") {
      const result = obj.result as Record<string, unknown>;
      if (typeof result.response === "string") return result.response;
    }
  }
  // Last resort: stringify and try to find useful text
  const s = JSON.stringify(response);
  // If stringified, unescape it
  return s;
}

function findJsonArray(text: string): string[] {
  // Find the first [ and its matching ]
  const start = text.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in: " + text.slice(0, 200));

  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error("Unbalanced brackets in: " + text.slice(0, 200));

  const jsonStr = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed.map(q => String(q));
  } catch {
    // Try cleaning
    const cleaned = jsonStr.replace(/,\s*\]/g, "]");
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(q => String(q));
  }
  throw new Error("Failed to parse array from: " + jsonStr.slice(0, 200));
}

export async function decomposeQuestion(
  ai: Ai,
  topic: string
): Promise<string[]> {
  const response = (await ai.run(MODEL, {
    messages: [
      {
        role: "system",
        content:
          "You are a research planner. Break this topic into 3-4 specific sub-questions that would give a comprehensive understanding. Return ONLY a JSON array of strings. No explanation, no markdown, just the JSON array.",
      },
      {
        role: "user",
        content: topic,
      },
    ],
  }));

  const text = extractText(response);
  return findJsonArray(text);
}

export async function researchSubQuestion(
  ai: Ai,
  subQuestion: string,
  context: string[]
): Promise<string> {
  const contextBlock =
    context.length > 0
      ? `\n\nPrevious findings for context:\n${context.join("\n---\n")}`
      : "";

  const response = (await ai.run(MODEL, {
    messages: [
      {
        role: "system",
        content: `You are a research analyst. Answer this specific question concisely in 2-3 paragraphs. Be factual and specific. Provide concrete details, data points, and examples where possible.${contextBlock}`,
      },
      {
        role: "user",
        content: subQuestion,
      },
    ],
  }));

  const text = extractText(response);
  if (!text.trim()) {
    throw new Error(`No response for sub-question: ${subQuestion}`);
  }

  return text;
}

export async function synthesizeReport(
  ai: Ai,
  topic: string,
  subQuestions: string[],
  findings: string[]
): Promise<string> {
  const findingsBlock = subQuestions
    .map((q, i) => `## Sub-question: ${q}\n\n${findings[i] ?? "No data"}`)
    .join("\n\n---\n\n");

  const response = (await ai.run(MODEL, {
    messages: [
      {
        role: "system",
        content:
          "You are a research synthesizer. Given these research findings, create a structured research brief with: Executive Summary, Key Findings (organized by sub-topic), and Conclusion. Use markdown formatting. Make it professional and well-organized.",
      },
      {
        role: "user",
        content: `Research Topic: ${topic}\n\n${findingsBlock}`,
      },
    ],
  }));

  const text = extractText(response);
  if (!text.trim()) {
    throw new Error("Failed to synthesize report");
  }

  return text;
}

export async function handleFollowUp(
  ai: Ai,
  question: string,
  report: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const historyMessages = history.slice(-10).map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  const response = (await ai.run(MODEL, {
    messages: [
      {
        role: "system",
        content: `You are a research assistant. You have completed a research report on a topic. Answer the user's follow-up question based on the research context below. Be concise and specific.\n\nResearch Report:\n${report}`,
      },
      ...historyMessages,
      {
        role: "user",
        content: question,
      },
    ],
  }));

  const text = extractText(response);
  if (!text.trim()) {
    throw new Error("No response for follow-up question");
  }

  return text;
}
