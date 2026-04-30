const EDGE_URL = "https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/claude-websearch";

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

// ─── Standard Claude completion (routed through edge function) ─────────────────
export async function callClaude(
  userContent: string,
  system = "",
  maxTokens = 1000,
  _apiKey = ""  // kept for signature compat — key lives in Supabase secret
): Promise<string> {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "completion", prompt: userContent, system, maxTokens }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

// ─── Claude with web_search tool (routed through edge function) ───────────────
export async function callGemini(
  prompt: string,
  _apiKey = ""  // kept for signature compat — key lives in Supabase secret
): Promise<string> {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}
