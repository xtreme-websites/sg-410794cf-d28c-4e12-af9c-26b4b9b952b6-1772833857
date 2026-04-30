import { useState, useEffect } from "react";
import { Order } from "../../lib/constants";
import { store } from "../../lib/ai";
import { CheckIcon, CopyIcon, XIcon, SparklesIcon } from "../icons";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tier   = "starter" | "standard" | "premium";
type Layout = "horizontal" | "stacked" | "dark" | "compact";

interface BadgeConfig {
  id: string; name: string; layout: Layout;
  logoColor: string; bgColor: string;
  includeLinks: boolean; verificationBadge: boolean; outletCounter: boolean;
}

interface TrustAssetsProps {
  orders: Order[];
  locationId: string;
  showToast: (msg: string, type?: "success" | "error") => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const VERIFICATION_URL = "https://xtremewebsites.com/press-release-marketing/";
const OUTLET_COUNT: Record<Tier, string> = { starter: "200+", standard: "300+", premium: "450+" };
const LOGO_COLORS = ["#111111", "#534AB7", "#185FA5", "#D85A30", "#0f6e56"];
const BG_COLORS   = ["#ffffff", "#f8f9fb", "#EDF4FF", "#f0f4ff", "#f5f3ff"];
const LAYOUTS: { id: Layout; label: string }[] = [
  { id: "horizontal", label: "Horizontal" },
  { id: "stacked",    label: "Stacked"    },
  { id: "dark",       label: "Dark"       },
  { id: "compact",    label: "Compact"    },
];

interface LogoDef { id: string; label: string; font: string; size: string; weight: string; spacing?: string; lh?: string; style?: string }

const LOGOS: Record<Tier, LogoDef[]> = {
  starter: [
    { id: "motherlode", label: "myMOTHERLODE.com",    font: "Arial,sans-serif",  size: "11px", weight: "700", spacing: "-.3px" },
    { id: "chronicle",  label: "The Chronicle\nJournal", font: "Georgia,serif",   size: "12px", weight: "700", lh: "1.15" },
    { id: "minyan",     label: "MINYANVILLE",           font: "Arial,sans-serif",  size: "11px", weight: "700", spacing: "2px" },
  ],
  standard: [
    { id: "motherlode", label: "myMOTHERLODE.com",    font: "Arial,sans-serif",  size: "10px", weight: "700", spacing: "-.3px" },
    { id: "chronicle",  label: "The Chronicle\nJournal", font: "Georgia,serif",   size: "11px", weight: "700", lh: "1.15" },
    { id: "minyan",     label: "MINYANVILLE",           font: "Arial,sans-serif",  size: "10px", weight: "700", spacing: "1.5px" },
    { id: "benzinga",   label: "BENZINGA",              font: "Arial,sans-serif",  size: "12px", weight: "900", spacing: "1px" },
    { id: "barchart",   label: "barchart",              font: "Arial,sans-serif",  size: "12px", weight: "700" },
  ],
  premium: [
    { id: "motherlode", label: "myMOTHERLODE.com",    font: "Arial,sans-serif",  size: "9px",  weight: "700", spacing: "-.3px" },
    { id: "chronicle",  label: "The Chronicle\nJournal", font: "Georgia,serif",   size: "10px", weight: "700", lh: "1.15" },
    { id: "minyan",     label: "MINYANVILLE",           font: "Arial,sans-serif",  size: "9px",  weight: "700", spacing: "1.5px" },
    { id: "benzinga",   label: "BENZINGA",              font: "Arial,sans-serif",  size: "11px", weight: "900", spacing: "1px" },
    { id: "barchart",   label: "barchart",              font: "Arial,sans-serif",  size: "11px", weight: "700" },
    { id: "fox",        label: "FOX",                   font: "Arial,sans-serif",  size: "18px", weight: "900", spacing: "1px" },
    { id: "yahoo",      label: "Yahoo Finance",         font: "Georgia,serif",     size: "11px", weight: "400", style: "italic" },
  ],
};

const EMPTY_CONFIG: Omit<BadgeConfig, "id" | "name"> = {
  layout: "horizontal", logoColor: "#111111", bgColor: "#ffffff",
  includeLinks: true, verificationBadge: true, outletCounter: true,
};

// ─── Laurel SVG ───────────────────────────────────────────────────────────────
const Laurel = ({ flip, leafColor = "#ccc" }: { flip?: boolean; leafColor?: string }) => (
  <svg width="34" height="70" viewBox="0 0 34 70" fill="none" style={{ flexShrink: 0, opacity: 0.75, transform: flip ? "scaleX(-1)" : "none" }}>
    <path d="M17 66 Q16 43 17 8" stroke={leafColor} strokeWidth="1.2"/>
    <ellipse cx="10" cy="60" rx="7" ry="3.2" transform="rotate(-42 10 60)" fill={leafColor}/>
    <ellipse cx="8"  cy="50" rx="7" ry="3.2" transform="rotate(-30 8 50)"  fill={leafColor}/>
    <ellipse cx="8"  cy="40" rx="7" ry="3.2" transform="rotate(-18 8 40)"  fill={leafColor}/>
    <ellipse cx="9"  cy="30" rx="7" ry="3.2" transform="rotate(-8 9 30)"   fill={leafColor}/>
    <ellipse cx="11" cy="21" rx="6" ry="2.8" transform="rotate(-2 11 21)"  fill={leafColor}/>
    <ellipse cx="14" cy="13" rx="5" ry="2.5" transform="rotate(6 14 13)"   fill={leafColor}/>
  </svg>
);

// ─── Logo item ────────────────────────────────────────────────────────────────
function LogoItem({ logo, color, scale = 1 }: { logo: LogoDef; color: string; scale?: number }) {
  const parts = logo.label.split("\n");
  const fSize = `calc(${logo.size} * ${scale})`;
  return (
    <span style={{ fontFamily: logo.font, fontSize: fSize, fontWeight: logo.weight, color, letterSpacing: logo.spacing ?? "normal", lineHeight: logo.lh ?? "1.2", fontStyle: logo.style ?? "normal", textAlign: "center", display: "block", whiteSpace: "nowrap" }}>
      {parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <br/>}</span>)}
    </span>
  );
}

// ─── Badge preview (React) ────────────────────────────────────────────────────
function BadgePreview({ config, logos, tier, scale = 1 }: { config: BadgeConfig; logos: LogoDef[]; tier: Tier; scale?: number }) {
  const isDark     = config.layout === "dark";
  const isCompact  = config.layout === "compact";
  const isStacked  = config.layout === "stacked";
  const bg         = isDark ? "#1a1a2e" : config.bgColor;
  const lc         = isDark ? "#ffffff" : config.logoColor;
  const lineC      = isDark ? "#334155" : "#d1d5db";
  const textC      = isDark ? "#64748b" : "#9ca3af";
  const leafC      = isDark ? "#334155" : "#d1d5db";
  const mid        = Math.ceil(logos.length / 2);
  const row1       = isStacked ? logos.slice(0, mid) : logos;
  const row2       = isStacked ? logos.slice(mid) : [];
  const pad        = `${14 * scale}px ${isCompact ? 20 * scale : 8 * scale}px`;
  const logoGap    = `${Math.max(10, 16 * scale)}px`;

  const Row = ({ items }: { items: LogoDef[] }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: logoGap, flexWrap: "wrap" }}>
      {items.map(l => <LogoItem key={l.id} logo={l} color={lc} scale={scale}/>)}
    </div>
  );

  return (
    <div style={{ background: bg, padding: pad, borderRadius: "6px", display: "flex", alignItems: "center", gap: `${6 * scale}px`, width: "100%" }}>
      {!isCompact && <Laurel leafColor={leafC}/>}
      <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", gap: `${8 * scale}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: `${8 * scale}px` }}>
          <div style={{ flex: 1, height: "0.5px", background: lineC }}/>
          <span style={{ fontFamily: "Arial,sans-serif", fontSize: `${10 * scale}px`, letterSpacing: ".22em", color: textC, fontWeight: 600, whiteSpace: "nowrap" }}>AS SEEN ON</span>
          <div style={{ flex: 1, height: "0.5px", background: lineC }}/>
        </div>
        <Row items={row1}/>
        {isStacked && row2.length > 0 && <Row items={row2}/>}
        {!isCompact && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: `${3 * scale}px` }}>
            {config.outletCounter && (
              <span style={{ fontFamily: "Arial,sans-serif", fontSize: `${9 * scale}px`, letterSpacing: ".18em", color: textC, fontWeight: 500 }}>AND OVER {OUTLET_COUNT[tier]} NEWS SITES</span>
            )}
            {config.verificationBadge && (
              <span style={{ fontFamily: "Arial,sans-serif", fontSize: `${8 * scale}px`, color: textC }}>
                ✓ Verified by{" "}
                {config.includeLinks
                  ? <a href={VERIFICATION_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#534AB7", textDecoration: "none", fontWeight: 600 }}>Media Blast Boosters</a>
                  : <strong style={{ color: "#534AB7", fontWeight: 600 }}>Media Blast Boosters</strong>}
              </span>
            )}
          </div>
        )}
      </div>
      {!isCompact && <Laurel flip leafColor={leafC}/>}
    </div>
  );
}

// ─── Embed HTML generator ─────────────────────────────────────────────────────
function generateEmbedHTML(config: BadgeConfig, logos: LogoDef[], tier: Tier): string {
  const isDark    = config.layout === "dark";
  const isCompact = config.layout === "compact";
  const isStacked = config.layout === "stacked";
  const bg        = isDark ? "#1a1a2e" : config.bgColor;
  const lc        = isDark ? "#ffffff" : config.logoColor;
  const lineC     = isDark ? "#334155" : "#d1d5db";
  const textC     = isDark ? "#64748b" : "#9ca3af";
  const leafC     = isDark ? "#334155" : "#d1d5db";
  const laurelSVG = (flip: boolean) => `<svg width="34" height="70" viewBox="0 0 34 70" fill="none" style="flex-shrink:0;opacity:0.75;${flip ? "transform:scaleX(-1)" : ""}"><path d="M17 66 Q16 43 17 8" stroke="${leafC}" stroke-width="1.2"/><ellipse cx="10" cy="60" rx="7" ry="3.2" transform="rotate(-42 10 60)" fill="${leafC}"/><ellipse cx="8" cy="50" rx="7" ry="3.2" transform="rotate(-30 8 50)" fill="${leafC}"/><ellipse cx="8" cy="40" rx="7" ry="3.2" transform="rotate(-18 8 40)" fill="${leafC}"/><ellipse cx="9" cy="30" rx="7" ry="3.2" transform="rotate(-8 9 30)" fill="${leafC}"/><ellipse cx="11" cy="21" rx="6" ry="2.8" transform="rotate(-2 11 21)" fill="${leafC}"/><ellipse cx="14" cy="13" rx="5" ry="2.5" transform="rotate(6 14 13)" fill="${leafC}"/></svg>`;
  const logoEl    = (l: LogoDef) => `<span style="font-family:${l.font};font-size:${l.size};font-weight:${l.weight};color:${lc};letter-spacing:${l.spacing ?? "normal"};line-height:${l.lh ?? "1.2"};font-style:${l.style ?? "normal"};text-align:center;display:block;white-space:nowrap">${l.label.replace("\n", "<br>")}</span>`;
  const row       = (items: LogoDef[]) => `<div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap">${items.map(logoEl).join("")}</div>`;
  const mid       = Math.ceil(logos.length / 2);
  const row1      = isStacked ? logos.slice(0, mid) : logos;
  const row2      = isStacked ? logos.slice(mid)    : [];
  const counter   = config.outletCounter ? `<div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:.18em;color:${textC};font-weight:500">AND OVER ${OUTLET_COUNT[tier]} NEWS SITES</div>` : "";
  const verif     = config.verificationBadge ? `<div style="font-family:Arial,sans-serif;font-size:8px;color:${textC}">&#10003; Verified by <a href="${VERIFICATION_URL}" target="_blank" rel="noopener noreferrer" style="color:#534AB7;text-decoration:none;font-weight:600">Media Blast Boosters</a></div>` : "";
  const header    = `<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:0.5px;background:${lineC}"></div><span style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:.22em;color:${textC};font-weight:600;white-space:nowrap">AS SEEN ON</span><div style="flex:1;height:0.5px;background:${lineC}"></div></div>`;
  const footer    = !isCompact ? `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">${counter}${verif}</div>` : "";
  const content   = `<div style="flex:1;text-align:center;display:flex;flex-direction:column;gap:8px">${header}${row(row1)}${isStacked && row2.length > 0 ? row(row2) : ""}${footer}</div>`;
  return `<div style="background:${bg};padding:16px 8px;border-radius:6px;display:flex;align-items:center;gap:6px;max-width:100%">${!isCompact ? laurelSVG(false) : ""}${content}${!isCompact ? laurelSVG(true) : ""}</div>`;
}

// ─── Mini thumbnail ───────────────────────────────────────────────────────────
function MiniThumb({ config, tier }: { config: BadgeConfig; tier: Tier }) {
  const isDark = config.layout === "dark";
  const bg     = isDark ? "#1a1a2e" : config.bgColor;
  const lc     = isDark ? "#aaa"    : config.logoColor;
  const tc     = isDark ? "#4a5568" : "#c0c8d4";
  return (
    <div style={{ background: bg, borderRadius: "4px", padding: "7px 8px", textAlign: "center" }}>
      <div style={{ fontSize: "6px", letterSpacing: ".15em", color: tc, fontFamily: "Arial", fontWeight: 600, marginBottom: "5px" }}>AS SEEN ON</div>
      <div style={{ display: "flex", gap: "5px", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        {LOGOS[tier].slice(0, 3).map(l => (
          <span key={l.id} style={{ fontFamily: l.font, fontSize: "5.5px", fontWeight: l.weight, color: lc, whiteSpace: "nowrap" }}>
            {l.label.split("\n")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TrustAssets({ orders, locationId, showToast }: TrustAssetsProps) {
  const [tier,       setTier]       = useState<Tier>("starter");
  const [variations, setVariations] = useState<BadgeConfig[]>([]);
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [draft,      setDraft]      = useState<BadgeConfig>({ id: "", name: "", ...EMPTY_CONFIG });

  useEffect(() => {
    const rank: Record<string, number> = { Starter: 1, Standard: 2, Premium: 3 };
    const max = orders.reduce((m, o) => Math.max(m, rank[o.productName] ?? 0), 0);
    if (max >= 3) setTier("premium");
    else if (max >= 2) setTier("standard");
  }, [orders]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await store.get(`mbb:variations:${locationId}`);
        if (saved) {
          const v: BadgeConfig[] = JSON.parse(saved);
          setVariations(v); setActiveId(v[0]?.id ?? null);
        } else {
          const def: BadgeConfig = { id: crypto.randomUUID(), name: "Horizontal · light", ...EMPTY_CONFIG };
          setVariations([def]); setActiveId(def.id);
          store.set(`mbb:variations:${locationId}`, JSON.stringify([def]));
        }
      } catch {}
    })();
  }, [locationId]);

  const persist = async (vars: BadgeConfig[]) => {
    setVariations(vars);
    try { await store.set(`mbb:variations:${locationId}`, JSON.stringify(vars)); } catch {}
  };

  const logos   = LOGOS[tier];
  const active  = variations.find(v => v.id === activeId) ?? variations[0];

  const openNew = () => {
    setDraft({ id: crypto.randomUUID(), name: `Variation ${variations.length + 1}`, ...EMPTY_CONFIG });
    setEditingId(null); setShowModal(true);
  };
  const openEdit = (v: BadgeConfig) => { setDraft({ ...v }); setEditingId(v.id); setShowModal(true); };

  const saveVariation = () => {
    const updated = editingId
      ? variations.map(v => v.id === editingId ? draft : v)
      : [...variations, draft];
    persist(updated);
    if (!editingId) setActiveId(draft.id);
    setShowModal(false);
    showToast(editingId ? "Variation updated!" : "Variation saved!");
  };

  const deleteVariation = (id: string) => {
    const updated = variations.filter(v => v.id !== id);
    persist(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? null);
    showToast("Variation deleted");
  };

  const copyHTML = (cfg: BadgeConfig) => {
    navigator.clipboard.writeText(generateEmbedHTML(cfg, logos, tier));
    showToast("HTML copied!");
  };

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 99, border: "none", cursor: "pointer", background: on ? "#534AB7" : "#cbd5e1", position: "relative", flexShrink: 0, transition: "background .2s" }}>
      <span style={{ position: "absolute", top: 3, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left .2s", left: on ? "19px" : "3px" }}/>
    </button>
  );

  return (
    <div className="animate-fadein">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: ".75rem" }}>
        <div>
          <h2 className="font-display" style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: ".2rem" }}>Brand Trust Assets</h2>
          <p style={{ color: "#64748b", fontSize: ".875rem" }}>Embed a professional trust badge on your website</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
          {(["starter", "standard", "premium"] as Tier[]).map(t => (
            <button key={t} onClick={() => setTier(t)} style={{ padding: ".3rem .75rem", borderRadius: "99px", fontSize: ".75rem", fontWeight: 600, border: tier === t ? "1.5px solid #534AB7" : "0.5px solid #e2e8f0", background: tier === t ? "#EEEDFE" : "white", color: tier === t ? "#3C3489" : "#64748b", cursor: "pointer", transition: "all .15s", textTransform: "capitalize" }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <span style={{ fontSize: ".62rem", color: "#94a3b8", paddingLeft: "2px" }}>admin</span>
        </div>
      </div>

      {/* Live badge preview */}
      {active && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
            <span style={{ fontSize: ".72rem", fontWeight: 600, color: "#64748b", letterSpacing: ".04em", textTransform: "uppercase" }}>Active badge · {active.name}</span>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button onClick={() => copyHTML(active)} className="btn-secondary" style={{ fontSize: ".78rem", padding: ".4rem .85rem" }}><CopyIcon size={13}/> Copy HTML</button>
              <button onClick={() => openEdit(active)} className="btn-primary" style={{ fontSize: ".78rem", padding: ".4rem .85rem" }}><SparklesIcon size={13}/> Customize</button>
            </div>
          </div>
          <div className="card" style={{ padding: "1rem", overflow: "hidden" }}>
            <BadgePreview config={active} logos={logos} tier={tier}/>
          </div>
        </div>
      )}

      {/* Variations grid */}
      <div className="card" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 600, color: "#64748b", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: ".75rem" }}>
          Saved variations ({variations.length}/3)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: ".65rem" }}>
          {variations.map(v => (
            <div key={v.id} onClick={() => setActiveId(v.id)} style={{ border: activeId === v.id ? "1.5px solid #534AB7" : "0.5px solid #e2e8f0", borderRadius: ".65rem", padding: ".65rem", cursor: "pointer", background: "white", transition: "all .15s", boxShadow: activeId === v.id ? "0 0 0 3px rgba(83,74,183,.1)" : "none" }}>
              <MiniThumb config={v} tier={tier}/>
              <div style={{ fontSize: ".72rem", color: activeId === v.id ? "#3C3489" : "#64748b", textAlign: "center", marginTop: ".4rem", fontWeight: 600 }}>{v.name}</div>
              <div style={{ display: "flex", gap: ".3rem", marginTop: ".4rem", justifyContent: "center" }}>
                <button onClick={e => { e.stopPropagation(); openEdit(v); }} style={{ fontSize: ".65rem", color: "#6366f1", background: "none", border: "0.5px solid #c7d2fe", borderRadius: ".3rem", padding: ".18rem .45rem", cursor: "pointer" }}>Edit</button>
                <button onClick={e => { e.stopPropagation(); copyHTML(v); }} style={{ fontSize: ".65rem", color: "#475569", background: "none", border: "0.5px solid #e2e8f0", borderRadius: ".3rem", padding: ".18rem .45rem", cursor: "pointer" }}>Copy</button>
                {variations.length > 1 && <button onClick={e => { e.stopPropagation(); deleteVariation(v.id); }} style={{ fontSize: ".65rem", color: "#be123c", background: "none", border: "0.5px solid #fecdd3", borderRadius: ".3rem", padding: ".18rem .45rem", cursor: "pointer" }}>Del</button>}
              </div>
            </div>
          ))}
          {variations.length < 3 && (
            <div onClick={openNew} style={{ border: "1.5px dashed #e2e8f0", borderRadius: ".65rem", padding: ".65rem", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100px", gap: ".35rem", background: "white", transition: "border-color .15s" }}
              onMouseOver={e => e.currentTarget.style.borderColor = "#a5b4fc"}
              onMouseOut={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
              <div style={{ fontSize: "1.5rem", color: "#94a3b8", lineHeight: 1 }}>+</div>
              <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>New variation</div>
            </div>
          )}
        </div>
      </div>

      {/* Customize Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div className="card modal-panel" style={{ maxWidth: "540px", width: "100%", padding: "1.5rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
              <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700 }}>Customize badge</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><XIcon size={18}/></button>
            </div>

            <div style={{ marginBottom: ".9rem" }}>
              <label className="field-label">Variation name</label>
              <input value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} className="field-input" placeholder="e.g. Horizontal · dark"/>
            </div>

            <div style={{ marginBottom: ".9rem" }}>
              <div className="field-label" style={{ marginBottom: ".5rem" }}>Live preview</div>
              <div style={{ background: "#f8fafc", borderRadius: ".6rem", padding: "1rem", border: "0.5px solid #e2e8f0" }}>
                <BadgePreview config={draft} logos={logos} tier={tier} scale={0.88}/>
              </div>
            </div>

            <div style={{ marginBottom: ".9rem" }}>
              <div className="field-label" style={{ marginBottom: ".5rem" }}>Layout</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: ".45rem" }}>
                {LAYOUTS.map(lo => (
                  <button key={lo.id} onClick={() => setDraft(p => ({ ...p, layout: lo.id }))} style={{ padding: ".4rem", borderRadius: ".45rem", fontSize: ".75rem", fontWeight: 600, border: draft.layout === lo.id ? "1.5px solid #534AB7" : "0.5px solid #e2e8f0", background: draft.layout === lo.id ? "#EEEDFE" : "white", color: draft.layout === lo.id ? "#3C3489" : "#64748b", cursor: "pointer", transition: "all .15s" }}>
                    {lo.label}
                  </button>
                ))}
              </div>
            </div>

            {draft.layout !== "dark" && (
              <div style={{ marginBottom: ".9rem" }}>
                <div className="field-label" style={{ marginBottom: ".5rem" }}>Colors</div>
                <div style={{ display: "flex", gap: "1.5rem" }}>
                  {([["Logo color", "logoColor", LOGO_COLORS], ["Background", "bgColor", BG_COLORS]] as [string, keyof BadgeConfig, string[]][]).map(([label, key, swatches]) => (
                    <div key={key}>
                      <div style={{ fontSize: ".72rem", color: "#64748b", marginBottom: ".35rem" }}>{label}</div>
                      <div style={{ display: "flex", gap: ".3rem" }}>
                        {swatches.map(c => (
                          <button key={c} onClick={() => setDraft(p => ({ ...p, [key]: c }))} style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: draft[key] === c ? "2px solid #534AB7" : "0.5px solid #d1d5db", cursor: "pointer", outline: draft[key] === c ? "2px solid #a5b4fc" : "none", outlineOffset: "1px", transition: "all .15s" }}/>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <div className="field-label" style={{ marginBottom: ".5rem" }}>Options</div>
              {([
                ["includeLinks",       "Include links on logos & verification"],
                ["verificationBadge",  "Show: Verified by Media Blast Boosters"],
                ["outletCounter",      "Show outlet counter (e.g. 200+ news sites)"],
              ] as [keyof BadgeConfig, string][]).map(([key, label]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".55rem 0", borderBottom: "0.5px solid #f1f5f9" }}>
                  <span style={{ fontSize: ".875rem", color: "#374151" }}>{label}</span>
                  <Toggle on={!!draft[key]} onToggle={() => setDraft(p => ({ ...p, [key]: !p[key] }))}/>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: ".75rem" }}>
              <button onClick={() => copyHTML(draft)} className="btn-secondary" style={{ flex: 1, justifyContent: "center" }}><CopyIcon size={14}/> Copy HTML</button>
              <button onClick={saveVariation} disabled={!draft.name.trim()} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}><CheckIcon size={14}/> {editingId ? "Update" : "Save variation"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
