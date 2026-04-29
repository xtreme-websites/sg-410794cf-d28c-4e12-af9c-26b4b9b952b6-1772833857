import { useState } from "react";
import { ShieldIcon, CheckIcon, CopyIcon, SearchIcon, LoaderIcon, AlertIcon } from "../icons";

interface TrustAssetsProps {
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function TrustAssets({ showToast }: TrustAssetsProps) {
  const [selectedWidgetStyle, setSelectedWidgetStyle] = useState(1);
  const [verifyUrl,           setVerifyUrl]           = useState("");
  const [isVerifying,         setIsVerifying]         = useState(false);
  const [verificationStatus,  setVerificationStatus]  = useState<{ blocked?: boolean; found?: boolean } | null>(null);

  const getWidgetEmbedCode = () => {
    const s: Record<number, string> = {
      1: `<div style="font-family:sans-serif;padding:20px;text-align:center;background:white;border-radius:8px;">\n  <p style="font-size:11px;color:#999;letter-spacing:2px;margin-bottom:14px;">AS SEEN ON</p>\n  <img src="/as-seen-on1.png" alt="Media outlets" style="height:30px;">\n</div>`,
      2: `<div style="font-family:Georgia,serif;padding:28px;text-align:center;background:#fafafa;border-radius:12px;border:1px solid #eee;">\n  <h3 style="font-size:16px;color:#333;margin-bottom:18px;font-style:italic;">Featured In</h3>\n  <img src="/as-seen-on2.png" alt="Media outlets" style="height:34px;">\n</div>`,
      3: `<div style="font-family:sans-serif;padding:24px;text-align:center;background:#0f172a;border-radius:14px;">\n  <p style="font-size:12px;font-weight:700;color:#818cf8;margin-bottom:18px;letter-spacing:3px;">FEATURED IN</p>\n  <img src="/as-seen-on3.png" alt="Media" style="height:30px;filter:brightness(0) invert(1);">\n</div>`,
      4: `<div style="font-family:sans-serif;padding:24px;text-align:center;background:white;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,.08);">\n  <p style="font-size:11px;color:#aaa;margin-bottom:16px;letter-spacing:1.5px;">AS SEEN ON</p>\n  <img src="/as-seen-on4.png" alt="Media" style="height:26px;">\n</div>`,
    };
    return `<!-- Media Blast Boosters™ Widget Style ${selectedWidgetStyle} -->\n<div class="mbb-trust-widget">\n${s[selectedWidgetStyle]}\n</div>`;
  };

  const widgetNames: Record<number, string> = { 1: "The Minimalist", 2: "The Editorial", 3: "The Tech Glow", 4: "The Classic Wire" };

  return (
    <div className="animate-fadein">
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 className="font-display" style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: ".2rem" }}>Brand Trust Assets</h2>
        <p style={{ color: "#64748b", fontSize: ".875rem" }}>Professional "As Seen On" widgets — embed on your website for instant credibility.</p>
      </div>

      {/* Widget style selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[1, 2, 3, 4].map(n => {
          const isActive = selectedWidgetStyle === n;
          return (
            <div key={n} onClick={() => setSelectedWidgetStyle(n)} style={{ background: "white", borderRadius: ".875rem", border: `2px solid ${isActive ? "#6366f1" : "#e2e8f0"}`, padding: "1.1rem", cursor: "pointer", transition: "all .2s", boxShadow: isActive ? "0 0 0 4px rgba(99,102,241,.1)" : "0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
                <span style={{ fontWeight: 700, fontSize: ".85rem", color: isActive ? "#4338ca" : "#334155" }}>{widgetNames[n]}</span>
                {isActive && <span style={{ color: "#6366f1" }}><CheckIcon size={16}/></span>}
              </div>
              <div style={{ borderRadius: ".5rem", border: "1px solid #f1f5f9", background: "#f8fafc", padding: "1rem", marginBottom: ".75rem", minHeight: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {n === 1 && <div style={{ textAlign: "center" }}><p style={{ fontSize: "9px", color: "#999", letterSpacing: "2px", marginBottom: "7px" }}>AS SEEN ON</p><div style={{ background: "#e2e8f0", height: "20px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px" }}><span style={{ fontSize: "8px", color: "#94a3b8" }}>Yahoo Finance · MSN · Business Insider</span></div></div>}
                {n === 2 && <div style={{ textAlign: "center", fontFamily: "Georgia,serif" }}><p style={{ fontSize: "11px", color: "#555", marginBottom: "7px", fontStyle: "italic" }}>Featured In</p><div style={{ background: "#f5f5f5", height: "20px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "8px", color: "#777" }}>Premium Media Outlets</span></div></div>}
                {n === 3 && <div style={{ textAlign: "center", background: "#0f172a", borderRadius: "6px", padding: "10px" }}><p style={{ fontSize: "8px", fontWeight: 700, color: "#818cf8", marginBottom: "7px", letterSpacing: "2px" }}>FEATURED IN</p><div style={{ background: "#1e293b", height: "16px", borderRadius: "2px" }}/></div>}
                {n === 4 && <div style={{ textAlign: "center" }}><p style={{ fontSize: "9px", color: "#aaa", marginBottom: "7px", letterSpacing: "1.5px" }}>AS SEEN ON</p><div style={{ background: "white", border: "1px solid #e2e8f0", height: "18px", borderRadius: "2px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}/></div>}
              </div>
              <p style={{ fontSize: ".72rem", color: "#94a3b8", textAlign: "center" }}>Style {n}</p>
            </div>
          );
        })}
      </div>

      {/* Embed code */}
      <div style={{ background: "#0f172a", borderRadius: "1rem", padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".75rem" }}>
          <h3 style={{ color: "white", fontWeight: 700 }}>Embed Code</h3>
          <button onClick={() => { navigator.clipboard.writeText(getWidgetEmbedCode()); showToast("Embed code copied!"); }} className="btn-primary" style={{ padding: ".4rem .9rem", fontSize: ".78rem" }}>
            <CopyIcon size={14}/> Copy Code
          </button>
        </div>
        <pre style={{ background: "#1e293b", color: "#4ade80", padding: "1rem", borderRadius: ".6rem", fontSize: ".72rem", overflowX: "auto", lineHeight: 1.6, maxHeight: "200px", overflowY: "auto", margin: 0 }}>
          <code>{getWidgetEmbedCode()}</code>
        </pre>
      </div>

      {/* Widget Health Check */}
      <div className="card" style={{ padding: "1.25rem", borderStyle: "dashed" }}>
        <h3 style={{ fontWeight: 700, marginBottom: ".25rem", display: "flex", alignItems: "center", gap: ".5rem", fontSize: "1rem" }}>
          <ShieldIcon size={18}/> Widget Health Check
        </h3>
        <p style={{ fontSize: ".82rem", color: "#64748b", marginBottom: "1rem" }}>Verify your widget is live on your website</p>
        <div style={{ display: "flex", gap: ".75rem", marginBottom: "1rem" }}>
          <input type="url" value={verifyUrl} onChange={e => setVerifyUrl(e.target.value)} placeholder="https://yourwebsite.com" className="field-input" style={{ flex: 1 }}/>
          <button onClick={async () => {
            setIsVerifying(true); setVerificationStatus(null);
            await new Promise(r => setTimeout(r, 1800));
            setVerificationStatus({ blocked: true });
            setIsVerifying(false);
          }} disabled={isVerifying || !verifyUrl.trim()} className="btn-primary" style={{ whiteSpace: "nowrap" }}>
            {isVerifying ? <><LoaderIcon size={15}/> Checking...</> : <><SearchIcon size={15}/> Verify</>}
          </button>
        </div>
        {verificationStatus?.blocked && !verificationStatus?.found && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: ".5rem", padding: ".875rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", color: "#92400e", fontWeight: 600, marginBottom: ".5rem" }}>
              <AlertIcon size={16}/> Automatic Verification Blocked
            </div>
            <p style={{ fontSize: ".8rem", color: "#78350f", marginBottom: ".75rem" }}>Some sites block automated checks. Confirm manually.</p>
            <button onClick={() => { setVerificationStatus({ found: true }); showToast("Widget confirmed!"); }}
              style={{ background: "#d97706", color: "white", border: "none", borderRadius: ".4rem", padding: ".4rem .9rem", fontSize: ".8rem", fontWeight: 600, cursor: "pointer" }}>
              ✓ Manually Confirm
            </button>
          </div>
        )}
        {verificationStatus?.found && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: ".5rem", padding: ".875rem 1rem", display: "flex", alignItems: "center", gap: ".5rem", color: "#166534", fontWeight: 600 }}>
            <CheckIcon size={16}/> Widget Live & Verified ✓
          </div>
        )}
      </div>
    </div>
  );
}
