export const SUPABASE_URL  = "https://rsaoscgotumlvsbzwdiy.supabase.co";
export const SUPABASE_ANON = "sb_publishable_Yo7e6dxrIaya7Q5-TurGLA_Zk9Tuheq";

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
