import { useState, useEffect, ReactNode } from "react";

const VALIDATE_URL    = "https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/validate-embed-token";
const SESSION_KEY     = "mbb_session";
const ALLOWED_ORIGINS = ["https://app.xtremeautomator.com", "https://media-blast-boosters.vercel.app"];

// Dev mode: bypass iframe + token check
// Works locally (vite dev) OR when ?dev_access=mbb2026 is in the URL
const DEV_MODE = import.meta.env.DEV ||
  new URLSearchParams(window.location.search).get("dev_access") === "mbb2026";

interface Session { location_id: string; validated_at: number; }

export function getSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
}

function setSession(location_id: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ location_id, validated_at: Date.now() }));
}

interface Props { locationId: string | null; children: ReactNode; }

export default function AuthGuard({ locationId, children }: Props) {
  const [status, setStatus] = useState<"checking" | "ok" | "blocked">("checking");

  useEffect(() => {
    const validate = async () => {
      // DEV MODE: bypass all checks in local dev
      if (DEV_MODE) { setStatus("ok"); return; }

      // Already have a valid session for this location
      const session = getSession();
      if (session && session.location_id === locationId && locationId) {
        setStatus("ok"); return;
      }

      // No location_id in URL → block
      if (!locationId) { setStatus("blocked"); return; }

      // Must be in an iframe
      const inFrame = window !== window.top;
      if (!inFrame) { setStatus("blocked"); return; }

      // Check parent origin if accessible
      try {
        const parentOrigin = document.referrer ? new URL(document.referrer).origin : "";
        if (parentOrigin && !ALLOWED_ORIGINS.includes(parentOrigin)) {
          setStatus("blocked"); return;
        }
      } catch { /* referrer may be empty, continue */ }

      // Get token from URL
      const params = new URLSearchParams(window.location.search);
      const token  = params.get("token");
      if (!token) { setStatus("blocked"); return; }

      // Validate token with edge function
      try {
        const res  = await fetch(VALIDATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.valid && data.location_id === locationId) {
          setSession(locationId);
          setStatus("ok");
        } else {
          setStatus("blocked");
        }
      } catch {
        setStatus("blocked");
      }
    };
    validate();
  }, [locationId]);

  if (status === "checking") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0f0a1e" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid rgba(255,255,255,.1)", borderTopColor:"#8929bd", borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 1rem" }}/>
        <div style={{ color:"rgba(255,255,255,.4)", fontSize:".85rem" }}>Loading…</div>
      </div>
    </div>
  );

  if (status === "blocked") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0f0a1e", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:360, padding:"2rem" }}>
        <img src="/logo.png" alt="MBB" style={{ width:64, height:64, objectFit:"contain", marginBottom:"1.5rem", opacity:.8 }}/>
        <h2 style={{ color:"white", fontWeight:700, marginBottom:".5rem", fontSize:"1.25rem" }}>Access Restricted</h2>
        <p style={{ color:"rgba(255,255,255,.4)", fontSize:".85rem", lineHeight:1.6 }}>
          This dashboard must be accessed through your platform account. Please log in to your account to continue.
        </p>
      </div>
    </div>
  );

  return <>{children}</>;
}
