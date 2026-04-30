// All Supabase calls go through the supabase-proxy edge function,
// which runs server-side on Supabase's own infrastructure (no allowlist issue).
export const SUPABASE_URL  = "https://rsaoscgotumlvsbzwdiy.supabase.co";
export const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYW9zY2dvdHVtbHZzYnp3ZGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTkwNzAsImV4cCI6MjA4ODQzNTA3MH0.eZfmlFg-bg_g5uWruw2xBDFTIvmxHV1lAHrKQdv8aSk";

const PROXY = `${SUPABASE_URL}/functions/v1/supabase-proxy`;

const call = async (body: Record<string, unknown>) => {
  const res  = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
};

export const supabase = {
  from: (table: string) => ({
    select: (cols = "*") => ({
      eq: (col: string, val: string) => ({
        order: (orderCol: string, { ascending }: { ascending?: boolean } = {}) => ({
          limit: (n: number) => ({
            single: () => call({ table, operation: "select", select: cols, eq: { [col]: val }, order: { col: orderCol, ascending }, limit: n }),
          }),
        }),
      }),
    }),
    insert: (row: Record<string, unknown>) =>
      call({ table, operation: "insert", data: row }),
    upsert: (row: Record<string, unknown>, { onConflict }: { onConflict?: string } = {}) =>
      call({ table, operation: "upsert", data: row, onConflict }),
  }),
};
