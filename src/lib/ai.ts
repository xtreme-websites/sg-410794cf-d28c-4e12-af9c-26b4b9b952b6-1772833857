// ─── Storage wrapper: window.storage (Claude sandbox) → localStorage (Vercel) ─
export const store = {
  get: async (key: string): Promise<string | null> => {
    try {
      if (typeof (window as any).storage?.get === "function") {
        const r = await (window as any).storage.get(key);
        return r?.value ?? null;
      }
    } catch {}
    try { return localStorage.getItem(key); } catch {}
    return null;
  },
  set: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof (window as any).storage?.set === "function") {
        await (window as any).storage.set(key, value);
        return;
      }
    } catch {}
    try { localStorage.setItem(key, value); } catch {}
  },
};

// ─── Claude API (standard completion) ────────────────────────────────────────
export async function callClaude(
  userContent: string,
  system = "",
  maxTokens = 1000,
  apiKey = ""
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

// ─── Claude with web_search tool (for website crawling) ──────────────────────
export async function callGemini(prompt: string, apiKey = ""): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  const text = (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  if (!text) throw new Error("Empty response");
  return text;
}
