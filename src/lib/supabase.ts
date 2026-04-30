export const SUPABASE_URL  = "https://rsaoscgotumlvsbzwdiy.supabase.co";
export const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYW9zY2dvdHVtbHZzYnp3ZGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTkwNzAsImV4cCI6MjA4ODQzNTA3MH0.eZfmlFg-bg_g5uWruw2xBDFTIvmxHV1lAHrKQdv8aSk";

const _headers = (extra: Record<string, string> = {}) => ({
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
  ...extra,
});

export const supabase = {
  from: (table: string) => ({
    select: (cols = "*") => ({
      eq: (col: string, val: string) => ({
        order: (col2: string, { ascending }: { ascending?: boolean } = {}) => ({
          limit: (n: number) => ({
            single: async () => {
              const asc = ascending ? "asc" : "desc";
              const res = await fetch(
                `${SUPABASE_URL}/rest/v1/${table}?select=${cols}&${col}=eq.${val}&order=${col2}.${asc}&limit=${n}`,
                { headers: _headers() }
              );
              const data = await res.json();
              return { data: Array.isArray(data) ? data[0] ?? null : null, error: null };
            },
          }),
        }),
      }),
    }),
    insert: async (row: Record<string, unknown>) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: _headers(),
        body: JSON.stringify(row),
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    upsert: async (
      row: Record<string, unknown>,
      { onConflict }: { onConflict?: string } = {}
    ) => {
      const qs = onConflict ? `?on_conflict=${onConflict}` : "";
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
        method: "POST",
        headers: _headers({ "Prefer": "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(row),
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
  }),
};
