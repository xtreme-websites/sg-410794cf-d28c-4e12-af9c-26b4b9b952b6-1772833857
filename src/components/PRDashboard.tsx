import { useState, useMemo, useEffect } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";

// ─── Supabase Client (REST API — no library needed) ──────────────────────────
// ── Stripe Package Config ──────────────────────────────────────────────────
const PR_PACKAGES = {
  Starter:  { price: "$497",  outlets: 200, words: 350,  readers: "2.2M",   authority: 69,  paymentLink: "https://buy.stripe.com/fZu6oHdbu3zH6DTdMl6J201" },
  Standard: { price: "$797",  outlets: 300, words: 500,  readers: "26.4M",  authority: 88,  paymentLink: "https://buy.stripe.com/aFadR9gnGb290fveQp6J202" },
  Premium:  { price: "$997",  outlets: 450, words: 1000, readers: "224.5M", authority: 94,  paymentLink: "https://buy.stripe.com/bJeeVd3AU5HP7HXeQp6J203" },
};

const SUPABASE_URL  = "https://rsaoscgotumlvsbzwdiy.supabase.co";
const SUPABASE_ANON = "sb_publishable_Yo7e6dxrIaya7Q5-TurGLA_Zk9Tuheq";

const supabase = {
  _headers: (extra={}) => ({
    "apikey": SUPABASE_ANON,
    "Authorization": `Bearer ${SUPABASE_ANON}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    ...extra
  }),
  from: (table) => ({
    select: (cols="*") => ({
      eq: (col, val) => ({
        order: (col2, {ascending}={}) => ({
          limit: (n) => ({
            single: async () => {
              const asc = ascending ? "asc" : "desc";
              const res = await fetch(
                `${SUPABASE_URL}/rest/v1/${table}?select=${cols}&${col}=eq.${val}&order=${col2}.${asc}&limit=${n}`,
                { headers: supabase._headers() }
              );
              const data = await res.json();
              return { data: Array.isArray(data) ? data[0] ?? null : null, error: null };
            }
          })
        })
      })
    }),
    insert: async (row) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: supabase._headers(),
        body: JSON.stringify(row)
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    upsert: async (row, { onConflict }={}) => {
      const headers = supabase._headers({ "Prefer": `resolution=merge-duplicates,return=representation` });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify(row)
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
  }),
};

// ─── Global Styles ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    .mbb-root { font-family: 'DM Sans', sans-serif; }
    .font-display, .mbb-root h1, .mbb-root h2, .mbb-root h3 { font-family: 'Outfit', sans-serif; }
    .mbb-root .prose h1 { font-size:1.5rem; font-weight:700; margin-bottom:.75rem; line-height:1.3; font-family:'Outfit',sans-serif; }
    .mbb-root .prose h2 { font-size:1.1rem; font-weight:700; margin-top:1.5rem; margin-bottom:.5rem; color:#1e293b; }
    .mbb-root .prose p  { margin-bottom:.75rem; line-height:1.7; color:#374151; }
    .mbb-root .prose em { font-style:italic; }
    .mbb-root .prose strong { font-weight:600; }
    .mbb-root .prose a  { color:#4f46e5; text-decoration:underline; }
    .card { background:white; border-radius:.875rem; box-shadow:0 1px 3px rgba(0,0,0,.06); border:1px solid #f1f5f9; }
    .btn-primary { background:linear-gradient(135deg,#4f46e5,#7c3aed); color:white; font-weight:600; padding:.6rem 1.2rem; border-radius:.5rem; display:inline-flex; align-items:center; gap:.45rem; transition:all .2s; font-size:.875rem; border:none; cursor:pointer; }
    .btn-primary:hover:not(:disabled) { background:linear-gradient(135deg,#4338ca,#6d28d9); transform:translateY(-1px); box-shadow:0 4px 14px rgba(79,70,229,.35); }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none !important; box-shadow:none !important; }
    .btn-secondary { background:#f1f5f9; color:#475569; font-weight:600; padding:.6rem 1.2rem; border-radius:.5rem; display:inline-flex; align-items:center; gap:.45rem; transition:all .15s; font-size:.875rem; border:1px solid #e2e8f0; cursor:pointer; }
    .btn-secondary:hover { background:#e2e8f0; }
    .field-input { width:100%; border:1px solid #e2e8f0; border-radius:.5rem; padding:.6rem .75rem; font-size:.875rem; outline:none; font-family:'DM Sans',sans-serif; transition:border-color .15s; background:white; }
    .field-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
    .field-label { display:block; font-size:.78rem; font-weight:600; color:#374151; margin-bottom:.4rem; }
    @keyframes spin { to { transform:rotate(360deg); } }
    @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .animate-spin { animation:spin .8s linear infinite; }
    .animate-fadein { animation:fadeSlideIn .35s ease both; }
    .modal-backdrop { animation: fadeIn .2s ease; }
    .modal-panel { animation: slideUp .25s ease; }
    .topic-card { background:white; border-radius:.75rem; border:1px solid #e8edf5; padding:1.25rem; transition:all .2s; }
    .topic-card:hover { border-color:#c7d2fe; box-shadow:0 4px 16px rgba(99,102,241,.1); transform:translateY(-1px); }
    .cd-option { border:2px solid #e2e8f0; border-radius:.875rem; padding:1.1rem 1.25rem; cursor:pointer; transition:all .2s; text-align:left; background:white; width:100%; }
    .cd-option:hover { border-color:#a5b4fc; background:#fafbff; }
    .cd-option.selected { border-color:#6366f1; background:#f0f4ff; }
  `}</style>
);

// ─── KeywordTagInput ──────────────────────────────────────────────────────────
function KeywordTagInput({ keywords, onChange, maxKeywords = 5 }) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim();
    if (t && !keywords.includes(t) && keywords.length < maxKeywords) { onChange([...keywords, t]); setInput(""); }
  };
  return (
    <div className="field-input" style={{ display:"flex", flexWrap:"wrap", gap:".35rem", minHeight:"42px", padding:".35rem .5rem", cursor:"text" }}>
      {keywords.map((kw, i) => (
        <span key={i} style={{ background:"#eef2ff", color:"#4338ca", fontSize:".75rem", fontWeight:600, padding:".18rem .5rem", borderRadius:".35rem", display:"flex", alignItems:"center", gap:".2rem" }}>
          {kw}<button onClick={() => onChange(keywords.filter((_,j)=>j!==i))} style={{ color:"#6366f1", fontWeight:700, background:"none", border:"none", cursor:"pointer", lineHeight:1, padding:0 }}>×</button>
        </span>
      ))}
      {keywords.length < maxKeywords && (
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"){e.preventDefault();add();} }}
          placeholder={keywords.length===0?"Type + Enter":"Add more..."} style={{ flex:1, outline:"none", fontSize:".875rem", minWidth:"100px", background:"transparent", border:"none", padding:".1rem 0" }}/>
      )}
    </div>
  );
}

// ─── Claude API ───────────────────────────────────────────────────────────────
async function callClaude(userContent, system = "", maxTokens = 1000, apiKey = "") {
  const headers = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (apiKey) headers["x-api-key"] = apiKey;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: userContent }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

// Claude with web_search tool — proxied via Supabase Edge Function to avoid CORS
async function callGemini(prompt, apiKey = "") {
  const res = await fetch("https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/claude-websearch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, apiKey })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!data.text) throw new Error("Empty response");
  return data.text;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const OUTLETS = ["Yahoo Finance","Business Insider","Digital Journal","Associated Press","NewsBreak","TechBullion","MSN","Street Insider","openPR","Minyanville","The Chronicle Journal","Big News Network"];
const RADAR_COLORS = ["#818cf8","#34d399","#fb923c","#f472b6"];
const FOCUS_OPTIONS = [
  { value:"Company News",       emoji:"📢", desc:"Announcements, partnerships, updates" },
  { value:"How-to Guide",       emoji:"📚", desc:"Step-by-step tutorial or instructional" },
  { value:"Thought Leadership", emoji:"💡", desc:"Expert perspectives and insights" },
  { value:"Opinion/Editorial",  emoji:"✍️", desc:"Commentary on current topics" },
  { value:"Best Practices",     emoji:"⭐", desc:"Proven strategies and recommendations" },
  { value:"Case Study",         emoji:"📋", desc:"Real-world examples and lessons" },
];
const THEME_OPTIONS = [
  { value:"thought-provoking", emoji:"💭", label:"Thought-Provoking", desc:"Intellectual, encourages deep reflection" },
  { value:"investigative",     emoji:"🔎", label:"Investigative",     desc:"In-depth, fact-finding, analytical" },
  { value:"breaking-news",     emoji:"📰", label:"Breaking News",     desc:"Urgent, immediate, time-sensitive" },
  { value:"scientific",        emoji:"📊", label:"Scientific",        desc:"Data-driven, objective, precise" },
];
const EMPTY_COMPANY = { name:"", industry:"", websiteUrl:"", googleProfileUrl:"", summaryFileUrl:"", quoteAttribution:"", about:"", services:"", address:"", phone:"", email:"" };
const GEMINI_MODEL  = "gemini-3.1-pro-preview";

// ─── Icons ────────────────────────────────────────────────────────────────────
const SparklesIcon  = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.88 5.76L19.64 9l-4.76 3.46L16.76 18 12 14.54 7.24 18l1.88-5.54L4.36 9l5.76-.24z"/></svg>;
const LoaderIcon    = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const CheckIcon     = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon         = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CopyIcon      = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const SearchIcon    = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const ZapIcon       = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const ExternalLinkIcon = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const BackIcon      = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;
const LockIcon      = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const TrendUpIcon   = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const TrendDownIcon = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>;
const ShieldIcon    = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const CartIcon      = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const NewsIcon      = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>;
const BarIcon       = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
const BriefIcon     = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const AlertIcon     = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const ClipboardIcon = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>;
const UploadIcon    = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const BuildingIcon  = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="9" width="18" height="13" rx="1"/><path d="M8 22V12h8v10"/><path d="M3 9l9-6 9 6"/></svg>;
const GlobeIcon     = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const SaveIcon      = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const PhoneIcon     = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const MailIcon      = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2-2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const MapPinIcon    = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const SettingsIcon  = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PRDashboard() {

  // ── Company Data (persisted to window.storage) ────────────────────────────
  const [companyData, setCompanyData] = useState(EMPTY_COMPANY);
  const [dataLoaded,  setDataLoaded]  = useState(false);

  // ── API Keys ───────────────────────────────────────────────────────────────
  const [geminiApiKey,    setGeminiApiKey]    = useState("");
  const [geminiKeyDraft,  setGeminiKeyDraft]  = useState("");
  const [claudeApiKey,    setClaudeApiKey]    = useState("");
  const [claudeKeyDraft,  setClaudeKeyDraft]  = useState("");
  const [webhookUrl,      setWebhookUrl]      = useState("");
  const [webhookDraft,    setWebhookDraft]    = useState("");

  // ── HighLevel Location ID (from URL params, no login needed) ─────────────
  const locationId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("location_id") || params.get("locationId") || "preview-mode";
    } catch { return "preview-mode"; }
  }, []);

  useEffect(() => {
    (async () => {
      // Load Claude API key from local storage
      try {
        const r = await window.storage.get("mbb:claudeKey");
        if (r?.value) { setClaudeApiKey(r.value); setClaudeKeyDraft(r.value); }
      } catch {}
      try {
        const r = await window.storage.get("mbb:webhookUrl");
        if (r?.value) { setWebhookUrl(r.value); setWebhookDraft(r.value); }
      } catch {}

      // Load company profile from Supabase using location_id
      try {
        const { data } = await supabase.from("company_profiles").select("*")
          .eq("location_id", locationId).order("updated_at", { ascending: false }).limit(1).single();
        if (data) {
          setCompanyData({
            name:             data.company_name    || "",
            industry:         data.industry         || "",
            websiteUrl:       data.website_url      || "",
            about:            data.about_company    || "",
            services:         data.list_of_services || "",
            address:          data.address          || "",
            phone:            data.phone            || "",
            email:            data.email            || "",
            quoteAttribution: data.quote_attribution|| "",
            googleProfileUrl: "",
            summaryFileUrl:   "",
          });
        } else {
          // Fall back to local cache
          const cached = await window.storage.get("mbb:companyData");
          if (cached?.value) setCompanyData(JSON.parse(cached.value));
        }
      } catch {
        try {
          const cached = await window.storage.get("mbb:companyData");
          if (cached?.value) setCompanyData(JSON.parse(cached.value));
        } catch {}
      }

      // Load orders from Supabase
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?location_id=eq.${locationId}&order=created_at.desc`,
          { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` } }
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOrders(data.map(o => ({
            id:          o.id,
            prTitle:     o.pr_title,
            productName: o.product_name,
            price:       `$${o.price}`,
            date:        new Date(o.created_at).toLocaleDateString("en-US"),
            prContent:   o.pr_content,
          })));
        }
      } catch {}

      setDataLoaded(true);
    })();
  }, [locationId]);

  const saveCompanyData = async (data) => {
    setCompanyData(data);
    try { await window.storage.set("mbb:companyData", JSON.stringify(data)); } catch {}
    try {
      await supabase.from("company_profiles").upsert({
        location_id:      locationId,
        company_name:     data.name,
        industry:         data.industry,
        website_url:      data.websiteUrl      || "",
        about_company:    data.about           || "",
        list_of_services: data.services        || "",
        address:          data.address         || "",
        phone:            data.phone           || "",
        email:            data.email           || "",
        quote_attribution:data.quoteAttribution|| "",
        updated_at:       new Date().toISOString(),
      }, { onConflict: "location_id" });
    } catch {}
  };

  const { name: companyName, industry, websiteUrl: siteUrl, quoteAttribution } = companyData;

  // Wrappers that inject the stored API key automatically
  const ai  = (content, system="", tokens=1000) => callClaude(content, system, tokens, claudeApiKey);
  const aiW = (prompt) => callGemini(prompt, claudeApiKey); // web_search variant

  // ── UI State ──────────────────────────────────────────────────────────────
  const [activeTab,          setActiveTab]          = useState("topics");
  const [showCompanyData,    setShowCompanyData]    = useState(false);
  const [showSettings,       setShowSettings]       = useState(false);
  const [showRefineDialog,   setShowRefineDialog]   = useState(false);
  const [showGeneratedView,  setShowGeneratedView]  = useState(false);
  const [showThankYou,       setShowThankYou]       = useState(false);
  const [showFocusDropdown,  setShowFocusDropdown]  = useState(false);
  const [showThemeDropdown,  setShowThemeDropdown]  = useState(false);
  const [cdMode,             setCdMode]             = useState("ai");

  // Company Data modal local state
  const [cdDraft,         setCdDraft]         = useState(EMPTY_COMPANY);
  const [aiCrawlUrl,      setAiCrawlUrl]      = useState("");
  const [crawlSourceType, setCrawlSourceType] = useState("website"); // "website"|"google"|"summary"
  const [isCrawling,      setIsCrawling]      = useState(false);
  const [crawlError,      setCrawlError]      = useState(null);
  const [crawlStatus,     setCrawlStatus]     = useState("");
  const [crawlPages,      setCrawlPages]      = useState([]);

  const openCompanyData = () => {
    setCdDraft({ ...companyData });
    setAiCrawlUrl(companyData.websiteUrl || "");
    setCrawlSourceType("website");
    setCrawlError(null);
    setCrawlStatus("");
    setCrawlPages([]);
    setShowCompanyData(true);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  const [isLoading,   setIsLoading]   = useState(false);
  const [isScanning,  setIsScanning]  = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error,       setError]       = useState(null);
  const [marketError, setMarketError] = useState(null);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Data State ─────────────────────────────────────────────────────────────
  const [trendingTopics,    setTrendingTopics]    = useState([]);
  const [topicsPage,        setTopicsPage]        = useState(0);
  const [topicsFetched,     setTopicsFetched]     = useState(0); // live count during load
  const [competitorData,    setCompetitorData]    = useState(null);
  const [generatedPR,       setGeneratedPR]       = useState("");
  const [contentIdeas,      setContentIdeas]      = useState({});
  const [showContentIdeas,  setShowContentIdeas]  = useState({});
  const [selectedTopic,     setSelectedTopic]     = useState(null);
  const [orders,            setOrders]            = useState([]);
  const [selectedOrder,     setSelectedOrder]     = useState(null);
  const [verifyUrl,         setVerifyUrl]         = useState("");
  const [verificationStatus,setVerificationStatus]= useState(null);
  const [selectedWidgetStyle,setSelectedWidgetStyle] = useState(1);
  const [widgetResolution,  setWidgetResolution]  = useState("starter");
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [refinementInstructions, setRefinementInstructions] = useState("");
  const [refinementCount,   setRefinementCount]   = useState(0);
  const [customPRPrompt,    setCustomPRPrompt]    = useState("");

  const [prFormData, setPrFormData] = useState({
    about:"", quote:"", keywords:[], wordCount:"500",
    mainFocus:"Company News", theme:"thought-provoking",
    videoUrl:"", mapsEmbed:"", featuredImage:null
  });

  // ── AI: Crawl Website via Claude web_search tool ─────────────────────────
  const crawlWebsite = async () => {
    const rawUrl = aiCrawlUrl.trim().replace(/\/$/, "");
    if (!rawUrl) { setCrawlError("Please enter a URL"); return; }

    setIsCrawling(true);
    setCrawlError(null);
    setCrawlPages([]);

    // Build the priority URL list for website crawls
    const PRIORITY_PATHS = [
      { path:"",            label:"Home"       },
      { path:"/about",      label:"About"      },
      { path:"/about-us",   label:"About Us"   },
      { path:"/services",   label:"Services"   },
      { path:"/contact",    label:"Contact"    },
      { path:"/contact-us", label:"Contact Us" },
      { path:"/blog",       label:"Blog"       },
      { path:"/news",       label:"News"       },
    ];

    const isWebsite = crawlSourceType === "website";
    const isSummary = crawlSourceType === "summary";
    const allPages  = isWebsite ? PRIORITY_PATHS : [{ path:"", label:"Summary File" }];

    setCrawlPages(allPages.map(p => ({ ...p, status:"loading" })));

    // ── SUMMARY FILE: fetch raw markdown and parse directly (no AI needed) ──
    if (isSummary) {
      setCrawlStatus("Fetching summary file…");
      try {
        const edgeRes  = await fetch(`${SUPABASE_URL}/functions/v1/claude-websearch`, {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ mode:"fetch-summary", url: rawUrl })
        });
        const edgeData = await edgeRes.json();
        if (!edgeData.content) throw new Error(edgeData.error || "Empty response");

        const md = edgeData.content;

        // Parse markdown fields — handles "**Label**: Value" and "- Value" list items
        const field = (patterns) => {
          for (const pat of patterns) {
            const m = md.match(pat);
            if (m && m[1] && m[1].trim() && m[1].trim() !== "null") return m[1].trim();
          }
          return "";
        };
        const listItems = (section) => {
          const m = md.match(new RegExp(`##\\s*${section}[\\s\\S]*?\\n((?:\\s*-[^\\n]+\\n?)+)`, "i"));
          if (!m) return "";
          return m[1].split("\n").map(l => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean).join(", ");
        };

        const parsed = {
          name:             field([/\*\*Company Name\*\*:\s*(.+)/i, /^#\s+BRAND IDENTITY:\s*(.+)/im]),
          industry:         field([/\*\*Industry\*\*:\s*(.+)/i, /\*\*Sector\*\*:\s*(.+)/i]),
          websiteUrl:       field([/\*\*Website\*\*:\s*(.+)/i]),
          quoteAttribution: "",
          about:            field([/\*\*Tagline\*\*:\s*(.+)/i, /\*\*Description\*\*:\s*(.+)/i]),
          services:         listItems("CORE SERVICES"),
          address:          field([/\*\*Address\*\*:\s*(.+)/i]),
          phone:            field([/\*\*Phone\*\*:\s*(.+)/i]),
          email:            field([/\*\*Email\*\*:\s*(.+)/i]),
        };

        setCrawlPages(allPages.map(p => ({ ...p, status:"ok" })));
        setCdDraft(prev => ({ ...prev, ...parsed }));
        setCdMode("manual");
        showToast("Summary file loaded — review and save!");
      } catch(e) {
        setCrawlPages(prev => prev.map(p => ({ ...p, status:"skip" })));
        setCrawlError("Failed to fetch summary: " + (e.message || "unknown error"));
      }
      setCrawlStatus("");
      setIsCrawling(false);
      return;
    }

    // ── WEBSITE: AI web crawl ───────────────────────────────────────────────
    setCrawlStatus("Searching with AI…");
    const urlList = allPages.map(p => rawUrl + p.path);

    const prompt = `Please visit and read the following URL(s) to extract company information.

These are pages from the company website. Prioritise: Home for company name/industry, About for company description, Services for list of services, Contact for address/phone/email. For the Blog/News page, look ONLY for the author name in byline elements — common patterns include: <div class="authorBar"><span>By Carlos Medina</span></div>, "Written by [Name]", "Posted by [Name]", or "By [Name]" anywhere on the page. IMPORTANT: Email addresses are often displayed as plain text (e.g. admin@company.com) inside paragraph tags on the Contact page — NOT as mailto: links. Read all visible text carefully.

URLs to visit:
${urlList.map((u,i) => `${i+1}. ${u}`).join("\n")}

Extract and return ONLY this JSON (empty string "" for anything not found — never null or invented data):
{
  "name": "Company name",
  "industry": "Industry or sector",
  "websiteUrl": "${rawUrl}",
  "quoteAttribution": "Full Name — Title, Company (find owner/CEO/founder from About page, or from blog post bylines — look for authorBar divs, 'By [Name]', 'Written by [Name]' patterns on the Blog/News page)",
  "about": "2-3 sentence company description",
  "services": "Comma-separated list of main services or products",
  "address": "Full street address (from Contact page only)",
  "phone": "Phone number (from Contact page only)",
  "email": "Contact email — look for plain text email addresses (e.g. admin@domain.com) in paragraph text on the Contact page. They are usually displayed as visible text, NOT as mailto: links. Also check footer and About page."
}`;

    try {
      const text    = await aiW(prompt);
      const clean   = text.replace(/```json|```/g, "").trim();
      const jsonStr = clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1);
      const parsed  = JSON.parse(jsonStr);

      setCrawlPages(allPages.map(p => ({ ...p, status:"ok" })));
      setCdDraft(prev => ({ ...prev, ...parsed, websiteUrl: rawUrl }));
      setCdMode("manual");
      showToast("Data extracted — review and save!");
    } catch(e) {
      setCrawlPages(prev => prev.map(p => ({ ...p, status:"skip" })));
      setCrawlError("Extraction failed: " + (e.message || "unknown error"));
    }

    setCrawlStatus("");
    setIsCrawling(false);
  };

  // ── Place Order ────────────────────────────────────────────────────────────
  const placeOrder = async (packageType) => {
    const pkg = PR_PACKAGES[packageType];
    const price = pkg.price;
    const newOrder = {
      id:          crypto.randomUUID(),
      prTitle:     prFormData.about.slice(0,80) || "Press Release",
      productName: packageType,
      price,
      date:        new Date().toLocaleDateString("en-US"),
      prContent:   generatedPR,
    };
    setOrders(prev => [newOrder, ...prev]);
    if (locationId !== "preview-mode") {
      try {
        await supabase.from("orders").insert({
          location_id:  locationId,
          pr_title:     newOrder.prTitle,
          product_name: packageType,
          package_type: packageType,
          price:        parseFloat(price.replace("$","")),
          pr_content:   generatedPR,
        });
      } catch {}
    }
    // Fire outbound webhook if configured
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event:        "order.placed",
            location_id:  locationId,
            order_id:     newOrder.id,
            pr_title:     newOrder.prTitle,
            package:      packageType,
            price,
            pr_content:   generatedPR,
            company_name: companyName,
            industry,
            timestamp:    new Date().toISOString(),
          })
        });
      } catch {}
    }
    // Redirect to Stripe payment page
    window.open(pkg.paymentLink, "_blank");
  };

  // ── AI: Trending Topics — Google News RSS (real live articles) ───────────
  const fetchTrendingTopics = async (cd = companyData) => {
    const ind  = (cd.industry  || companyData.industry  || "").trim();
    const svcs = (cd.services  || companyData.services  || "").trim();
    if (!ind) { showToast("Add your industry in Company Data first", "error"); return; }

    setIsLoading(true);
    setError(null);
    setTrendingTopics([]);
    setTopicsPage(0);
    setTopicsFetched(0);

    const q1 = svcs ? `${ind} ${svcs.split(",")[0].trim()}` : `${ind} news`;
    const q2 = svcs && svcs.split(",").length > 1
      ? `${ind} ${svcs.split(",")[1].trim()}`
      : `${ind} industry trends`;

    const parseXml = (xml) => {
      const doc   = new DOMParser().parseFromString(xml, "text/xml");
      const items = Array.from(doc.querySelectorAll("item")).slice(0, 20);
      const isLowQuality = (title, desc) => {
        // Filter: description too short (pure SEO filler / no content)
        if (desc.length < 80) return true;
        // Filter: title is just 1-2 words (bare keyword, not a headline)
        const words = title.trim().split(/\s+/);
        if (words.length < 3) return true;
        // (3-word titles like "Window Cleaning Tips" are valid — allow them)
        return false;
      };
      const normT = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
      const seenT = new Set();
      return items.map(el => {
        const title   = el.querySelector("title")?.textContent?.replace(/\s*-\s*[^-]+$/, "").trim() || "";
        const link    = el.querySelector("link")?.textContent?.trim() || "";
        const pubDate = el.querySelector("pubDate")?.textContent?.trim() || "";
        const source  = el.querySelector("source")?.textContent?.trim() || "";
        const rawDesc = el.querySelector("description")?.textContent?.replace(/<[^>]+>/g,"").trim() || "";
        // Decode HTML entities (&nbsp; &#160; &amp; etc.)
        const desc = rawDesc.replace(/&nbsp;/g," ").replace(/&#160;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#\d+;/g," ").replace(/\s{2,}/g," ").trim();
        const d       = pubDate ? new Date(pubDate) : null;
        const date    = d && !isNaN(d)
          ? `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`
          : "";
        return { title, summary: desc.slice(0,286)+"…", source, date, url: link, relevance:"High", _desc: desc };
      }).filter(t => {
        if (!t.title || !t.url) return false;
        if (isLowQuality(t.title, t._desc)) return false;
        const key = normT(t.title);
        if (seenT.has(key)) return false;
        seenT.add(key);
        return true;
      }).map(({ _desc, ...t }) => t)
        .slice(0, 6);
    };

    const fetchRSS = async (query) => {
      try {
        const res = await fetch("https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/rss-fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (data.error || !data.xml || data.xml.length < 100) return [];
        const results = parseXml(data.xml);
        return results;
      } catch(e) { return []; }
    };

    // Normalize title for dedup: lowercase, strip punctuation, collapse spaces
    const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

    let all = [];
    try {
      const b1 = await fetchRSS(q1);
      all = [...b1];
      setTrendingTopics([...all]);
      setTopicsFetched(all.length);
    } catch(e) {}

    try {
      const b2 = await fetchRSS(q2);
      const seenUrls   = new Set(all.map(t => t.url));
      const seenTitles = new Set(all.map(t => normTitle(t.title)));
      const fresh = b2.filter(t => !seenUrls.has(t.url) && !seenTitles.has(normTitle(t.title)));
      all = [...all, ...fresh].slice(0, 12);
      setTrendingTopics([...all]);
      setTopicsFetched(all.length);
    } catch(e) {}

    if (all.length === 0) setError("Could not load articles — try again in a moment.");
    else showToast(`${all.length} live articles found!`);
    setIsLoading(false);
  };

  // ── AI: Competitor Analysis ────────────────────────────────────────────────
  const scanMarket = async () => {
    if (!companyName.trim() || !industry.trim()) { showToast("Add company name and industry in Company Data first", "error"); return; }
    setIsScanning(true); setMarketError(null); setCompetitorData(null);
    try {
      const text = await ai(
        `Analyze competitive PR landscape for "${companyName}" in "${industry}". Use 3 real named competitors. Return ONLY this JSON:
{"userCompany":{"name":"${companyName}","scores":{"aiCitation":72,"mediaAuthority":65,"newsVolume":58,"sentimentPositivity":80,"topicLeadership":61}},"competitors":[{"name":"CompetitorName","scores":{"aiCitation":85,"mediaAuthority":78,"newsVolume":70,"sentimentPositivity":75,"topicLeadership":82},"trend":"up","gapAnalysis":"One sentence describing where they outperform you"}],"competitiveIntelligence":["Actionable insight 1","Actionable insight 2","Actionable insight 3","Actionable insight 4","Actionable insight 5"]}
Replace example numbers with realistic varied scores 0-100. Include exactly 3 competitors.`,
        "You are a PR intelligence analyst. Return ONLY valid JSON, no markdown."
      );
      const data = JSON.parse(text.replace(/```json|```/g, "").trim());
      setCompetitorData(data);
      // Save to Supabase
      try {
        await supabase.from("competitor_analysis").insert({
          location_id:              locationId,
          company_name:             companyName,
          industry:                 industry,
          competitors:              data.competitors,
          user_scores:              data.userCompany.scores,
          competitive_intelligence: data.competitiveIntelligence.join("\n"),
        });
      } catch {}
      showToast("Competitor analysis complete!");
    } catch(e) {
      setMarketError("Analysis failed — try again.");
    }
    setIsScanning(false);
  };

  // ── AI: Content Ideas ──────────────────────────────────────────────────────
  const generateContentIdeas = async (topic) => {
    const tid = topic.title;
    setShowContentIdeas(p => ({ ...p, [tid]: true }));
    if (contentIdeas[tid]) return;
    try {
      const text = await ai(
        `For the topic "${topic.title}" in the ${industry || "business"} industry, generate 4 compelling press release angles for ${companyName || "a company"}. Return ONLY a JSON array of 4 short headline strings.`,
        "Return ONLY a JSON array of 4 strings. No markdown."
      );
      const ideas = JSON.parse(text.replace(/```json|```/g, "").trim());
      setContentIdeas(p => ({ ...p, [tid]: ideas }));
    } catch {
      setContentIdeas(p => ({ ...p, [tid]: [
        `How ${industry||"Business"} Leaders Can Leverage This Trend`,
        `5 Actionable Insights from the Latest ${industry||"Industry"} Data`,
        `What This Means for Your ${industry||"Business"} in 2025`,
        `Expert Take: The ${industry||"Industry"} Strategy You Need Now`
      ]}));
    }
  };

  // ── AI: Generate Press Release ─────────────────────────────────────────────
  const generatePressRelease = async () => {
    if (!prFormData.about.trim() || !prFormData.quote.trim()) {
      showToast("Please fill in both the About and Quote fields", "error"); return;
    }
    setIsLoading(true); setShowGeneratedView(false); setRefinementCount(0);
    try {
      const { about, quote, keywords: kw, wordCount, mainFocus, theme, videoUrl } = prFormData;
      const kwText = kw.length > 0 ? kw.join(", ") : "no specific keywords";
      const topicRef = selectedTopic ? `\nBase this on trending angle: "${selectedTopic.selectedIdea || selectedTopic.title}"` : "";
      const coAbout = companyData.about ? `\nCompany background: ${companyData.about}` : "";
      const contact = [companyData.email, companyData.phone, companyData.address].filter(Boolean).join(" | ");
      const prompt = customPRPrompt
        ? customPRPrompt.replace(/{companyName}/g,companyName).replace(/{industry}/g,industry)
            .replace(/{websiteUrl}/g,siteUrl).replace(/{mainFocus}/g,mainFocus)
            .replace(/{theme}/g,theme).replace(/{targetWords}/g,wordCount)
            .replace(/{keywordsText}/g,kwText).replace(/{about}/g,about)
            .replace(/{quote}/g,quote).replace(/{quoteAttribution}/g,quoteAttribution)
        : `Write a professional press release for ${companyName||"our company"} in the ${industry||"business"} industry.
REQUIREMENTS: ~${wordCount} words, focus: ${mainFocus}, tone: ${theme}, keywords: ${kwText}, website: ${siteUrl||"N/A"}.${topicRef}${coAbout}
CONTENT: ${about}
QUOTE: "${quote}" — ${quoteAttribution||"Company Spokesperson"}${videoUrl?`\nVIDEO REFERENCE: ${videoUrl}`:""}
FORMAT with HTML tags: <h1> headline, <p><strong>FOR IMMEDIATE RELEASE</strong></p>, dateline paragraph, 3-4 body paragraphs, quote with <em>, <h2>About ${companyName||"Company"}</h2> with description, <h2>Contact Information</h2> with ${contact||siteUrl||"contact details"}.
Make it genuinely newsworthy and professionally written.`;
      const text = await ai(prompt, "You are an expert PR writer at a top agency. Write polished, publish-ready HTML press releases.", 2000);
      setGeneratedPR(text);
      setShowGeneratedView(true);
      showToast("Press release generated!");
    } catch(e) {
      showToast("Generation failed — please try again", "error");
    }
    setIsLoading(false);
  };

  // ── AI: Refine Press Release ───────────────────────────────────────────────
  const refinePressRelease = async () => {
    if (!refinementInstructions.trim() || refinementCount >= 5) return;
    setIsLoading(true);
    try {
      const text = await ai(
        `Refine this press release per these instructions: "${refinementInstructions}"\n\nCurrent press release:\n${generatedPR}\n\nReturn the complete refined version in proper HTML.`,
        "You are an expert PR editor. Apply the requested changes while maintaining professional quality.",
        2000
      );
      setGeneratedPR(text);
      setRefinementCount(p => p + 1);
      setShowRefineDialog(false);
      setRefinementInstructions("");
      showToast(`PR refined! (${refinementCount+1}/5 used)`);
    } catch { showToast("Refinement failed — try again", "error"); }
    setIsLoading(false);
  };

  // ── Widget Embed Code ──────────────────────────────────────────────────────
  const getWidgetEmbedCode = () => {
    const s = {
      1:`<div style="font-family:sans-serif;padding:20px;text-align:center;background:white;border-radius:8px;">\n  <p style="font-size:11px;color:#999;letter-spacing:2px;margin-bottom:14px;">AS SEEN ON</p>\n  <img src="/as-seen-on1.png" alt="Media outlets" style="height:30px;">\n</div>`,
      2:`<div style="font-family:Georgia,serif;padding:28px;text-align:center;background:#fafafa;border-radius:12px;border:1px solid #eee;">\n  <h3 style="font-size:16px;color:#333;margin-bottom:18px;font-style:italic;">Featured In</h3>\n  <img src="/as-seen-on2.png" alt="Media outlets" style="height:34px;">\n</div>`,
      3:`<div style="font-family:sans-serif;padding:24px;text-align:center;background:#0f172a;border-radius:14px;">\n  <p style="font-size:12px;font-weight:700;color:#818cf8;margin-bottom:18px;letter-spacing:3px;">FEATURED IN</p>\n  <img src="/as-seen-on3.png" alt="Media" style="height:30px;filter:brightness(0) invert(1);">\n</div>`,
      4:`<div style="font-family:sans-serif;padding:24px;text-align:center;background:white;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,.08);">\n  <p style="font-size:11px;color:#aaa;margin-bottom:16px;letter-spacing:1.5px;">AS SEEN ON</p>\n  <img src="/as-seen-on4.png" alt="Media" style="height:26px;">\n</div>`,
    };
    return `<!-- Media Blast Boosters™ Widget Style ${selectedWidgetStyle} -->\n<div class="mbb-trust-widget">\n${s[selectedWidgetStyle]}\n</div>`;
  };

  // ── Radar data ─────────────────────────────────────────────────────────────
  const radarChartData = useMemo(() => {
    if (!competitorData) return [];
    return ["aiCitation","mediaAuthority","newsVolume","sentimentPositivity","topicLeadership"].map((key,i) => {
      const names = ["AI Citation","Media Authority","News Volume","Sentiment","Topic Leadership"];
      const pt = { metric:names[i], [competitorData.userCompany.name]: competitorData.userCompany.scores[key] };
      competitorData.competitors.forEach(c => { pt[c.name] = c.scores[key]; });
      return pt;
    });
  }, [competitorData]);

  const hasCompanyData = !!(companyName || industry);

  const tabs = [
    { id:"topics",     icon:<NewsIcon size={15}/>,   label:"Trending Topics"    },
    { id:"competitor", icon:<BarIcon size={15}/>,    label:"Competitor Analysis" },
    { id:"widgets",    icon:<ShieldIcon size={15}/>, label:"Trust Assets"       },
    { id:"pr",         icon:<BriefIcon size={15}/>,  label:"PR Creator"         },
    { id:"orders",     icon:<CartIcon size={15}/>,   label:"Orders"             },
  ];

  // ── Reusable field row helper ──────────────────────────────────────────────
  const Field = ({label, icon, children}) => (
    <div>
      <label className="field-label" style={{ display:"flex", alignItems:"center", gap:".35rem" }}>
        {icon && icon}{label}
      </label>
      {children}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="mbb-root" style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#f1f5f9" }}>
      <GlobalStyles/>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <header style={{
        background:"#0b1120", borderBottom:"1px solid #1e2d45",
        padding:"0 1.5rem", display:"flex", alignItems:"center",
        gap:"1.25rem", minHeight:"56px", position:"sticky", top:0, zIndex:30,
        boxShadow:"0 2px 16px rgba(0,0,0,.35)"
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:".6rem", flexShrink:0 }}>
          <div style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:".45rem", padding:".38rem", display:"flex" }}>
            <ZapIcon size={16}/>
          </div>
          <span className="font-display" style={{ color:"white", fontWeight:800, fontSize:".95rem", letterSpacing:"-.01em", whiteSpace:"nowrap" }}>
            Media Blast Boosters<span style={{ color:"#6366f1", fontSize:".7rem", fontWeight:700, marginLeft:".2rem" }}>™</span>
          </span>
        </div>

        <div style={{ width:1, height:22, background:"#1e2d45", flexShrink:0 }}/>

        {/* Tab nav */}
        <nav style={{ display:"flex", gap:".1rem", flex:1, overflowX:"auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
              padding:".42rem .78rem", fontWeight:600, fontSize:".78rem",
              borderRadius:".35rem", whiteSpace:"nowrap", display:"flex",
              alignItems:"center", gap:".38rem", border:"none", cursor:"pointer",
              background: activeTab===t.id ? "rgba(99,102,241,.22)" : "transparent",
              color: activeTab===t.id ? "#a5b4fc" : "#64748b",
              transition:"all .15s"
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        {/* Company Data button — naked style */}
        <button onClick={openCompanyData} style={{
          display:"flex", alignItems:"center", gap:".45rem",
          padding:".38rem .85rem", background:"transparent",
          border:"1px solid #2d4060", borderRadius:".45rem",
          color: hasCompanyData ? "#a5b4fc" : "#475569",
          cursor:"pointer", fontSize:".78rem", fontWeight:600,
          transition:"all .2s", flexShrink:0, whiteSpace:"nowrap"
        }}
        onMouseOver={e=>{ e.currentTarget.style.background="rgba(99,102,241,.15)"; e.currentTarget.style.borderColor="#6366f1"; e.currentTarget.style.color="#a5b4fc"; }}
        onMouseOut={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="#2d4060"; e.currentTarget.style.color=hasCompanyData?"#a5b4fc":"#475569"; }}>
          <BuildingIcon size={14}/>
          Company Data
          {hasCompanyData && <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", flexShrink:0 }}/>}
        </button>

        {/* Settings */}
        <button onClick={()=>setShowSettings(true)} style={{ color:"#475569", background:"none", border:"none", cursor:"pointer", padding:".3rem", display:"flex", flexShrink:0, transition:"color .15s" }}
          onMouseOver={e=>e.currentTarget.style.color="#a5b4fc"} onMouseOut={e=>e.currentTarget.style.color="#475569"}>
          <SettingsIcon size={16}/>
        </button>
      </header>

      {/* ══ MAIN ════════════════════════════════════════════════════════════ */}
      <main style={{ flex:1, overflowY:"auto", padding:"1.5rem", maxWidth:"940px", width:"100%", margin:"0 auto" }}>

        {/* No-company nudge */}
        {!hasCompanyData && dataLoaded && (
          <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", border:"1px solid #4338ca", borderRadius:".875rem", padding:"1rem 1.5rem", marginBottom:"1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:".75rem" }}>
              <div style={{ background:"rgba(99,102,241,.25)", borderRadius:".5rem", padding:".5rem", display:"flex" }}><BuildingIcon size={20}/></div>
              <div>
                <p style={{ color:"white", fontWeight:600, fontSize:".9rem", margin:0 }}>Set up your company profile to get started</p>
                <p style={{ color:"#a5b4fc", fontSize:".78rem", margin:"2px 0 0" }}>AI uses your company data to personalize every output across the dashboard.</p>
              </div>
            </div>
            <button onClick={openCompanyData} className="btn-primary" style={{ flexShrink:0 }}>
              <BuildingIcon size={15}/> Add Company Data
            </button>
          </div>
        )}

        {/* ── TRENDING TOPICS ─────────────────────────────────────────────── */}
        {activeTab === "topics" && (
          <div className="animate-fadein">
            {/* Header — no button here */}
            <div style={{ marginBottom:"1.25rem" }}>
              <h2 className="font-display" style={{ fontSize:"1.3rem", fontWeight:700, color:"#0f172a", marginBottom:".2rem" }}>Trending Topics</h2>
              <p style={{ color:"#64748b", fontSize:".875rem" }}>
                AI-curated topics for <strong>{industry||"your industry"}</strong>
                {companyData.services && <span style={{ color:"#94a3b8" }}> · {companyData.services.split(",").slice(0,3).map(s=>s.trim()).join(", ")}{companyData.services.split(",").length>3?"…":""}</span>}
              </p>
            </div>

            {isLoading ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"5rem 0", gap:"1rem" }}>
                <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center" }}><LoaderIcon size={28}/></div>
                <p style={{ color:"#64748b", fontWeight:600, fontSize:".95rem" }}>Fetching live {industry||"industry"} articles…</p>
                <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
                  <div style={{ background:"#e0e7ff", borderRadius:"99px", height:6, width:160, overflow:"hidden" }}>
                    <div style={{ background:"linear-gradient(90deg,#4f46e5,#7c3aed)", height:"100%", width:`${Math.min((topicsFetched/12)*100,95)}%`, transition:"width .5s ease", borderRadius:"99px" }}/>
                  </div>
                  <span style={{ color:"#6366f1", fontSize:".82rem", fontWeight:700, minWidth:40 }}>{topicsFetched}/12</span>
                </div>
                <p style={{ color:"#94a3b8", fontSize:".78rem" }}>{topicsFetched < 6 ? "Loading batch 1…" : "Loading batch 2…"}</p>
              </div>
            ) : trendingTopics.length > 0 ? (
              <>
                {/* Page indicator */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".85rem" }}>
                  <span style={{ fontSize:".78rem", color:"#94a3b8", fontWeight:500 }}>
                    Showing {topicsPage*6+1}–{Math.min(topicsPage*6+6, trendingTopics.length)} of {trendingTopics.length} topics
                  </span>
                  <div style={{ display:"flex", gap:".35rem" }}>
                    {[0,1].filter(p=>p*6<trendingTopics.length).map(p=>(
                      <button key={p} onClick={()=>setTopicsPage(p)} style={{
                        width:28, height:28, borderRadius:".35rem", border:"none", cursor:"pointer", fontWeight:700, fontSize:".78rem",
                        background:topicsPage===p?"#4f46e5":"#f1f5f9",
                        color:topicsPage===p?"white":"#64748b", transition:"all .15s"
                      }}>{p+1}</button>
                    ))}
                  </div>
                </div>

                {/* Topic cards */}
                <div style={{ display:"flex", flexDirection:"column", gap:".75rem" }}>
                  {trendingTopics.slice(topicsPage*6, topicsPage*6+6).map((t,i)=>{
                    return (
                    <div key={`${topicsPage}-${i}`} className="topic-card animate-fadein" style={{ animationDelay:`${i*30}ms` }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:".75rem", marginBottom:".6rem" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:".5rem", marginBottom:".35rem" }}>
                            {t.relevance==="High"&&<span style={{ background:"#fef3c7",color:"#92400e",fontSize:".65rem",fontWeight:700,padding:".15rem .45rem",borderRadius:"99px",whiteSpace:"nowrap",marginTop:"2px" }}>🔥 HIGH</span>}
                            <h3 style={{ fontSize:".95rem", fontWeight:700, color:"#0f172a", lineHeight:1.4 }}>{t.title}</h3>
                          </div>
                          <p style={{ fontSize:".825rem", color:"#64748b", lineHeight:1.6 }}>{t.summary}</p>
                        </div>
                        <button onClick={()=>window.open(t.url,"_blank","noopener,noreferrer")} title="Open article" style={{ background:"none",border:"none",cursor:"pointer",color:"#818cf8",flexShrink:0,marginTop:"2px",padding:0 }}><ExternalLinkIcon size={15}/></button>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:".5rem" }}>
                        <div style={{ display:"flex", gap:".4rem" }}>
                          <button onClick={()=>generateContentIdeas(t)} style={{ background:"#f1f5f9",color:"#475569",fontSize:".75rem",fontWeight:600,padding:".35rem .75rem",borderRadius:".4rem",border:"1px solid #e2e8f0",cursor:"pointer" }}>💡 Content Ideas</button>
                          <button onClick={()=>{ setSelectedTopic({...t,selectedIdea:null}); setActiveTab("pr"); showToast("Topic selected!"); }} style={{ background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"white",fontSize:".75rem",fontWeight:600,padding:".35rem .75rem",borderRadius:".4rem",border:"none",cursor:"pointer" }}>✍️ Create PR</button>
                        </div>
                        <div style={{ display:"flex", gap:"1rem", fontSize:".75rem", color:"#94a3b8" }}>
                          <span>📰 {t.source}</span><span>📅 {t.date}</span>
                        </div>
                      </div>
                      {showContentIdeas[t.title]&&(
                        <div style={{ marginTop:".75rem",background:"#f8faff",borderRadius:".5rem",padding:".75rem 1rem",border:"1px solid #e0e7ff" }}>
                          <p style={{ fontSize:".72rem",fontWeight:700,color:"#4338ca",marginBottom:".5rem",letterSpacing:".04em" }}>💡 PRESS RELEASE ANGLES</p>
                          {contentIdeas[t.title]?(
                            <div style={{ display:"flex",flexDirection:"column",gap:".3rem" }}>
                              {contentIdeas[t.title].map((idea,j)=>(
                                <button key={j} onClick={()=>{ setSelectedTopic({...t,selectedIdea:idea}); setActiveTab("pr"); showToast("Angle selected!"); }}
                                  style={{ background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:".82rem",color:"#374151",padding:".3rem .4rem",borderRadius:".35rem" }}
                                  onMouseOver={e=>e.currentTarget.style.background="#e0e7ff"} onMouseOut={e=>e.currentTarget.style.background="none"}>
                                  {j+1}. {idea}
                                </button>
                              ))}
                            </div>
                          ):(
                            <div style={{ display:"flex",alignItems:"center",gap:".5rem",color:"#94a3b8",fontSize:".8rem" }}><LoaderIcon size={14}/> Generating...</div>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>

                {/* Bottom pagination */}
                {trendingTopics.length > 6 && (
                  <div style={{ display:"flex", justifyContent:"center", gap:".5rem", marginTop:"1.25rem" }}>
                    <button onClick={()=>setTopicsPage(p=>Math.max(0,p-1))} disabled={topicsPage===0}
                      className="btn-secondary" style={{ padding:".45rem .9rem",fontSize:".8rem",opacity:topicsPage===0?.4:1 }}>← Prev</button>
                    {[0,1].filter(p=>p*6<trendingTopics.length).map(p=>(
                      <button key={p} onClick={()=>setTopicsPage(p)} style={{
                        width:36,height:36,borderRadius:".4rem",border:"none",cursor:"pointer",fontWeight:700,fontSize:".85rem",
                        background:topicsPage===p?"linear-gradient(135deg,#4f46e5,#7c3aed)":"#f1f5f9",
                        color:topicsPage===p?"white":"#64748b"
                      }}>{p+1}</button>
                    ))}
                    <button onClick={()=>setTopicsPage(p=>Math.min(Math.ceil(trendingTopics.length/6)-1,p+1))}
                      disabled={topicsPage>=Math.ceil(trendingTopics.length/6)-1}
                      className="btn-secondary" style={{ padding:".45rem .9rem",fontSize:".8rem",opacity:topicsPage>=Math.ceil(trendingTopics.length/6)-1?.4:1 }}>Next →</button>
                  </div>
                )}

                {/* Rescan footer — matches Competitor Analysis style */}
                <div style={{ borderTop:"1px solid #f1f5f9", marginTop:"1.5rem", paddingTop:"1rem", display:"flex", justifyContent:"center" }}>
                  <button onClick={()=>fetchTrendingTopics()} disabled={isLoading}
                    style={{ display:"flex", alignItems:"center", gap:".5rem", background:"none", border:"none", color:"#64748b", fontSize:".875rem", cursor:"pointer", padding:".5rem 1rem", borderRadius:".5rem", fontWeight:500 }}
                    onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="none"}>
                    <SearchIcon size={15}/> Rescan Topics
                  </button>
                </div>
              </>
            ) : (
              <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"4rem 2rem", gap:"1.5rem" }}>
                {error && <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:".6rem", padding:".75rem 1rem", color:"#be123c", fontSize:".875rem", display:"flex", gap:".5rem", alignItems:"center" }}><AlertIcon size={16}/>{error}</div>}
                <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center" }}><NewsIcon size={36}/></div>
                <div style={{ textAlign:"center" }}>
                  <p className="font-display" style={{ fontSize:"1.1rem", fontWeight:700, color:"#0f172a", marginBottom:".5rem" }}>Discover What's Trending</p>
                  <p style={{ color:"#64748b", fontSize:".875rem", maxWidth:"360px" }}>
                    AI generates 12 relevant trending topics for <strong>{industry || "your industry"}</strong>{companyData.services ? `, tailored to your services` : ""} — ready to turn into press releases.
                  </p>
                </div>
                <button onClick={()=>fetchTrendingTopics()} disabled={isLoading} className="btn-primary" style={{ padding:".75rem 2rem" }}>
                  <ZapIcon size={16}/> Run Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── COMPETITOR ANALYSIS ─────────────────────────────────────────── */}
        {activeTab === "competitor" && (
          <div className="animate-fadein">
            <div style={{ marginBottom:"1.25rem" }}>
              <h2 className="font-display" style={{ fontSize:"1.3rem", fontWeight:700, color:"#0f172a", marginBottom:".2rem" }}>Competitor Analysis</h2>
              <p style={{ color:"#64748b", fontSize:".875rem" }}>AI-powered competitive PR benchmarking for <strong>{companyName||"your company"}</strong></p>
            </div>
            {!competitorData ? (
              <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"4rem 2rem", gap:"1.5rem" }}>
                {marketError && <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:".6rem", padding:".75rem 1rem", color:"#be123c", fontSize:".875rem", display:"flex", gap:".5rem", alignItems:"center" }}><AlertIcon size={16}/>{marketError}</div>}
                <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center" }}><BarIcon size={36}/></div>
                <div style={{ textAlign:"center" }}>
                  <p className="font-display" style={{ fontSize:"1.1rem", fontWeight:700, color:"#0f172a", marginBottom:".5rem" }}>Discover Your Competitive Position</p>
                  <p style={{ color:"#64748b", fontSize:".875rem", maxWidth:"360px" }}>AI benchmarks your PR performance against top competitors in {industry||"your industry"}.</p>
                </div>
                <button onClick={scanMarket} disabled={isScanning} className="btn-primary" style={{ padding:".75rem 2rem" }}>
                  {isScanning?<><LoaderIcon size={16}/> Scanning...</>:<><SearchIcon size={16}/> Scan Market</>}
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
                <div style={{ background:"linear-gradient(135deg,#0f172a,#1e293b)", borderRadius:"1rem", padding:"1.5rem 1rem", boxShadow:"0 8px 32px rgba(0,0,0,.2)" }}>
                  <h3 className="font-display" style={{ color:"white", fontSize:"1.05rem", fontWeight:700, marginBottom:"1rem", paddingLeft:".5rem" }}>Competitive PR Performance</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <RadarChart data={radarChartData}>
                      <PolarGrid stroke="#334155"/>
                      <PolarAngleAxis dataKey="metric" tick={{ fill:"#94a3b8", fontSize:12 }}/>
                      <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fill:"#475569", fontSize:10 }}/>
                      <Radar name={competitorData.userCompany.name} dataKey={competitorData.userCompany.name} stroke="#818cf8" fill="#818cf8" fillOpacity={0.45} strokeWidth={2.5} isAnimationActive animationDuration={900}/>
                      {competitorData.competitors.map((c,i) => (
                        <Radar key={i} name={c.name} dataKey={c.name} stroke={RADAR_COLORS[i+1]} fill={RADAR_COLORS[i+1]} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive animationDuration={900}/>
                      ))}
                      <Legend wrapperStyle={{ paddingTop:"12px" }} iconType="circle"/>
                      <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:".5rem", color:"#e2e8f0" }}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(195px,1fr))", gap:"1rem" }}>
                  {competitorData.competitors.map((c,i) => (
                    <div key={i} className="card" style={{ padding:"1rem 1.1rem" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".5rem" }}>
                        <h4 style={{ fontWeight:700, fontSize:".875rem", color:"#0f172a" }}>{c.name}</h4>
                        {c.trend==="up"?<span style={{ color:"#10b981" }}><TrendUpIcon size={16}/></span>:<span style={{ color:"#ef4444" }}><TrendDownIcon size={16}/></span>}
                      </div>
                      <p style={{ fontSize:".78rem", color:"#64748b", lineHeight:1.5 }}>{c.gapAnalysis}</p>
                      <div style={{ marginTop:".5rem", fontSize:".72rem", fontWeight:600, color:c.trend==="up"?"#10b981":"#ef4444" }}>PR: {c.trend==="up"?"↑ Increasing":"↓ Decreasing"}</div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding:"1.25rem", background:"linear-gradient(135deg,#f0f4ff,#f5f3ff)" }}>
                  <h3 style={{ fontWeight:700, color:"#1e1b4b", marginBottom:"1rem", display:"flex", alignItems:"center", gap:".5rem", fontSize:"1rem" }}><SparklesIcon size={18}/> Competitive Intelligence</h3>
                  <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
                    {competitorData.competitiveIntelligence.map((ins,i) => (
                      <div key={i} style={{ display:"flex", gap:".75rem", alignItems:"flex-start" }}>
                        <div style={{ background:"#4f46e5", color:"white", borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".7rem", fontWeight:700, flexShrink:0, marginTop:"1px" }}>{i+1}</div>
                        <p style={{ fontSize:".85rem", color:"#374151", lineHeight:1.6 }}>{ins}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={scanMarket} disabled={isScanning} className="btn-secondary" style={{ justifyContent:"center" }}>
                  {isScanning?<><LoaderIcon size={15}/> Rescanning...</>:<><SearchIcon size={15}/> Rescan Market</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TRUST ASSETS ────────────────────────────────────────────────── */}
        {activeTab === "widgets" && (
          <div className="animate-fadein">
            <div style={{ marginBottom:"1.25rem" }}>
              <h2 className="font-display" style={{ fontSize:"1.3rem", fontWeight:700, color:"#0f172a", marginBottom:".2rem" }}>Brand Trust Assets</h2>
              <p style={{ color:"#64748b", fontSize:".875rem" }}>Professional "As Seen On" widgets — embed on your website for instant credibility.</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
              {[1,2,3,4].map(n => {
                const names={1:"The Minimalist",2:"The Editorial",3:"The Tech Glow",4:"The Classic Wire"};
                const isActive=selectedWidgetStyle===n;
                return (
                  <div key={n} onClick={()=>setSelectedWidgetStyle(n)} style={{ background:"white", borderRadius:".875rem", border:`2px solid ${isActive?"#6366f1":"#e2e8f0"}`, padding:"1.1rem", cursor:"pointer", transition:"all .2s", boxShadow:isActive?"0 0 0 4px rgba(99,102,241,.1)":"0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".75rem" }}>
                      <span style={{ fontWeight:700, fontSize:".85rem", color:isActive?"#4338ca":"#334155" }}>{names[n]}</span>
                      {isActive&&<span style={{ color:"#6366f1" }}><CheckIcon size={16}/></span>}
                    </div>
                    <div style={{ borderRadius:".5rem", border:"1px solid #f1f5f9", background:"#f8fafc", padding:"1rem", marginBottom:".75rem", minHeight:"70px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {n===1&&<div style={{textAlign:"center"}}><p style={{fontSize:"9px",color:"#999",letterSpacing:"2px",marginBottom:"7px"}}>AS SEEN ON</p><div style={{background:"#e2e8f0",height:"20px",borderRadius:"3px",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 10px"}}><span style={{fontSize:"8px",color:"#94a3b8"}}>Yahoo Finance · MSN · Business Insider</span></div></div>}
                      {n===2&&<div style={{textAlign:"center",fontFamily:"Georgia,serif"}}><p style={{fontSize:"11px",color:"#555",marginBottom:"7px",fontStyle:"italic"}}>Featured In</p><div style={{background:"#f5f5f5",height:"20px",borderRadius:"3px",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:"8px",color:"#777"}}>Premium Media Outlets</span></div></div>}
                      {n===3&&<div style={{textAlign:"center",background:"#0f172a",borderRadius:"7px",padding:"9px"}}><p style={{fontSize:"9px",color:"#818cf8",letterSpacing:"2px",marginBottom:"7px",fontWeight:700}}>FEATURED IN</p><div style={{background:"#1e293b",height:"18px",borderRadius:"3px",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:"8px",color:"#475569"}}>Top News Networks</span></div></div>}
                      {n===4&&<div style={{textAlign:"center",background:"white",borderRadius:"5px",boxShadow:"0 2px 8px rgba(0,0,0,.08)",padding:"9px"}}><p style={{fontSize:"9px",color:"#aaa",letterSpacing:"1px",marginBottom:"7px"}}>AS SEEN ON</p><div style={{background:"#f9f9f9",height:"18px",borderRadius:"3px",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:"8px",color:"#999"}}>National Outlets</span></div></div>}
                    </div>
                    <div style={{ display:"flex", gap:".4rem" }}>
                      <button onClick={e=>{e.stopPropagation();setWidgetResolution("starter");}} style={{flex:1,fontSize:".72rem",padding:".35rem",borderRadius:".35rem",background:widgetResolution==="starter"?"#4f46e5":"#f1f5f9",color:widgetResolution==="starter"?"white":"#475569",border:"none",cursor:"pointer",fontWeight:600}}>Starter (3)</button>
                      <button onClick={e=>{e.stopPropagation();if(isPremiumUnlocked)setWidgetResolution("premium");}} disabled={!isPremiumUnlocked} style={{flex:1,fontSize:".72rem",padding:".35rem",borderRadius:".35rem",background:widgetResolution==="premium"&&isPremiumUnlocked?"#4f46e5":"#f1f5f9",color:widgetResolution==="premium"&&isPremiumUnlocked?"white":"#94a3b8",border:"none",cursor:isPremiumUnlocked?"pointer":"not-allowed",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:".2rem"}}>
                        {!isPremiumUnlocked&&<LockIcon size={11}/>} Premium
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background:"#0f172a", borderRadius:"1rem", padding:"1.25rem", marginBottom:"1.25rem" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".75rem" }}>
                <h3 style={{ color:"white", fontWeight:700 }}>Embed Code</h3>
                <button onClick={()=>{ navigator.clipboard.writeText(getWidgetEmbedCode()); showToast("Embed code copied!"); }} className="btn-primary" style={{ padding:".4rem .9rem", fontSize:".78rem" }}><CopyIcon size={14}/> Copy Code</button>
              </div>
              <pre style={{ background:"#1e293b", color:"#4ade80", padding:"1rem", borderRadius:".6rem", fontSize:".72rem", overflowX:"auto", lineHeight:1.6, maxHeight:"200px", overflowY:"auto", margin:0 }}><code>{getWidgetEmbedCode()}</code></pre>
            </div>
            <div className="card" style={{ padding:"1.25rem", borderStyle:"dashed" }}>
              <h3 style={{ fontWeight:700, marginBottom:".25rem", display:"flex", alignItems:"center", gap:".5rem", fontSize:"1rem" }}><ShieldIcon size={18}/> Widget Health Check</h3>
              <p style={{ fontSize:".82rem", color:"#64748b", marginBottom:"1rem" }}>Verify your widget is live on your website</p>
              <div style={{ display:"flex", gap:".75rem", marginBottom:"1rem" }}>
                <input type="url" value={verifyUrl} onChange={e=>setVerifyUrl(e.target.value)} placeholder="https://yourwebsite.com" className="field-input" style={{ flex:1 }}/>
                <button onClick={async()=>{ setIsVerifying(true); setVerificationStatus(null); await new Promise(r=>setTimeout(r,1800)); setVerificationStatus({blocked:true}); setIsVerifying(false); }} disabled={isVerifying||!verifyUrl.trim()} className="btn-primary" style={{ whiteSpace:"nowrap" }}>
                  {isVerifying?<><LoaderIcon size={15}/> Checking...</>:<><SearchIcon size={15}/> Verify</>}
                </button>
              </div>
              {verificationStatus?.blocked&&!verificationStatus?.found&&(
                <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:".5rem", padding:".875rem 1rem" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:".5rem", color:"#92400e", fontWeight:600, marginBottom:".5rem" }}><AlertIcon size={16}/> Automatic Verification Blocked</div>
                  <p style={{ fontSize:".8rem", color:"#78350f", marginBottom:".75rem" }}>Some sites block automated checks. Confirm manually.</p>
                  <button onClick={()=>{ setVerificationStatus({found:true}); showToast("Widget confirmed!"); }} style={{ background:"#d97706", color:"white", border:"none", borderRadius:".4rem", padding:".4rem .9rem", fontSize:".8rem", fontWeight:600, cursor:"pointer" }}>✓ Manually Confirm</button>
                </div>
              )}
              {verificationStatus?.found&&<div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:".5rem", padding:".875rem 1rem", display:"flex", alignItems:"center", gap:".5rem", color:"#166534", fontWeight:600 }}><CheckIcon size={16}/> Widget Live & Verified ✓</div>}
            </div>
          </div>
        )}

        {/* ── PR CREATOR ──────────────────────────────────────────────────── */}
        {activeTab === "pr" && (
          <div className="animate-fadein">
            {showGeneratedView && generatedPR ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
                <div className="card" style={{ padding:"1.5rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:".75rem" }}>
                    <h2 className="font-display" style={{ fontSize:"1.2rem", fontWeight:700, color:"#0f172a" }}>Generated Press Release</h2>
                    <button onClick={()=>setShowGeneratedView(false)} className="btn-secondary" style={{ fontSize:".8rem" }}><BackIcon size={14}/> Back to Edit</button>
                  </div>
                  <div className="prose" style={{ maxWidth:"none", padding:"1rem", background:"#f8fafc", borderRadius:".6rem", border:"1px solid #e2e8f0" }} dangerouslySetInnerHTML={{ __html:generatedPR }}/>
                  <div style={{ display:"flex", gap:".75rem", marginTop:"1.25rem", paddingTop:"1rem", borderTop:"1px solid #f1f5f9", flexWrap:"wrap" }}>
                    <button onClick={()=>{ navigator.clipboard.writeText(generatedPR.replace(/<[^>]*>/g,"")); showToast("Copied!"); }} className="btn-secondary"><ClipboardIcon size={15}/> Copy Text</button>
                    <button onClick={()=>{ navigator.clipboard.writeText(generatedPR); showToast("HTML copied!"); }} className="btn-secondary"><CopyIcon size={15}/> Copy HTML</button>
                    <button onClick={()=>setShowRefineDialog(true)} disabled={refinementCount>=5} className="btn-primary" style={{ marginLeft:"auto" }}>
                      <SparklesIcon size={15}/> Refine with AI {refinementCount>0&&`(${refinementCount}/5)`}
                    </button>
                  </div>
                </div>
                <div style={{ background:"linear-gradient(135deg,#f0f4ff,#faf5ff)", border:"2px solid #c7d2fe", borderRadius:"1rem", padding:"1.5rem" }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"1.5rem", alignItems:"center" }}>
                    <div style={{ flex:1, minWidth:"200px" }}>
                      <h3 className="font-display" style={{ fontSize:"1.25rem", fontWeight:800, color:"#1e1b4b", marginBottom:".5rem" }}>Ready to Launch Your PR?</h3>
                      <p style={{ color:"#4338ca", fontSize:".875rem", marginBottom:".75rem" }}>Get published across hundreds of top outlets, reaching millions monthly.</p>
                      {[["🏆","Massive Social Proof"],["🎯","Attract Potential Customers"],["📈","Top Rankings on Google"],["🔗","Valuable SEO Backlinks"]].map(([e,t])=>(
                        <div key={t} style={{ display:"flex", alignItems:"center", gap:".5rem", marginBottom:".3rem", fontSize:".8rem", color:"#374151" }}><span>{e}</span>{t}</div>
                      ))}
                    </div>
                    <div style={{ background:"white", borderRadius:".875rem", padding:"1.25rem", border:"2px solid #c7d2fe", minWidth:"195px" }}>
                      {prFormData.wordCount==="350"&&(<><div style={{fontSize:".72rem",fontWeight:700,color:"#6366f1",letterSpacing:".08em",marginBottom:".35rem"}}>STARTER</div><div style={{fontSize:"2rem",fontWeight:800,color:"#0f172a",lineHeight:1,marginBottom:".75rem"}}>$497<span style={{fontSize:".9rem",color:"#94a3b8",fontWeight:500}}></span></div>{["200 News Outlets","350 Words","2.2M Monthly Readers","Max Authority: 69"].map(f=><div key={f} style={{fontSize:".78rem",color:"#475569",marginBottom:".3rem",display:"flex",gap:".4rem"}}><CheckIcon size={13}/>{f}</div>)}<button className="btn-primary" style={{width:"100%",justifyContent:"center",marginTop:".75rem"}} onClick={()=>placeOrder("Starter")}>🚀 Order & Launch</button></>)}
                      {prFormData.wordCount==="500"&&(<><div style={{display:"flex",gap:".4rem",alignItems:"center",marginBottom:".35rem"}}><span style={{fontSize:".72rem",fontWeight:700,color:"#6366f1",letterSpacing:".08em"}}>STANDARD</span><span style={{background:"#fef08a",color:"#713f12",fontSize:".65rem",fontWeight:700,padding:".15rem .45rem",borderRadius:"99px"}}>POPULAR</span></div><div style={{fontSize:"2rem",fontWeight:800,color:"#0f172a",lineHeight:1,marginBottom:".75rem"}}>$797<span style={{fontSize:".9rem",color:"#94a3b8",fontWeight:500}}></span></div>{["300 News Outlets","500 Words","26.4M Monthly Readers","Max Authority: 88"].map(f=><div key={f} style={{fontSize:".78rem",color:"#475569",marginBottom:".3rem",display:"flex",gap:".4rem"}}><CheckIcon size={13}/>{f}</div>)}<button className="btn-primary" style={{width:"100%",justifyContent:"center",marginTop:".75rem"}} onClick={()=>placeOrder("Standard")}>🚀 Order & Launch</button></>)}
                      {prFormData.wordCount==="1000"&&(<><div style={{fontSize:".72rem",fontWeight:700,color:"#6366f1",letterSpacing:".08em",marginBottom:".35rem"}}>PREMIUM</div><div style={{fontSize:"2rem",fontWeight:800,color:"#0f172a",lineHeight:1,marginBottom:".75rem"}}>$997<span style={{fontSize:".9rem",color:"#94a3b8",fontWeight:500}}></span></div>{["450 News Outlets","1000 Words","224.5M Monthly Readers","Max Authority: 94"].map(f=><div key={f} style={{fontSize:".78rem",color:"#475569",marginBottom:".3rem",display:"flex",gap:".4rem"}}><CheckIcon size={13}/>{f}</div>)}<button className="btn-primary" style={{width:"100%",justifyContent:"center",marginTop:".75rem"}} onClick={()=>placeOrder("Premium")}>🚀 Order & Launch</button></>)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom:"1.25rem" }}>
                  <h2 className="font-display" style={{ fontSize:"1.3rem", fontWeight:700, color:"#0f172a", marginBottom:".2rem" }}>Press Release Creator</h2>
                  <p style={{ color:"#64748b", fontSize:".875rem" }}>Fill in the details and AI will write a professional, publish-ready press release.</p>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
                  <div>
                    <label className="field-label">Trending Topic Reference <span style={{ color:"#94a3b8", fontWeight:400 }}>(optional)</span></label>
                    {selectedTopic ? (
                      <div style={{ background:"#f0f4ff", border:"1px solid #c7d2fe", borderRadius:".6rem", padding:".875rem 1rem" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <p style={{ fontWeight:600, color:"#3730a3", fontSize:".875rem", marginBottom:".25rem" }}>{selectedTopic.title}</p>
                            <p style={{ fontSize:".75rem", color:"#6366f1" }}>Source: {selectedTopic.source}</p>
                            {selectedTopic.selectedIdea&&<p style={{ fontSize:".75rem", color:"#4338ca", marginTop:".35rem", background:"#e0e7ff", padding:".25rem .5rem", borderRadius:".35rem", display:"inline-block" }}>Angle: {selectedTopic.selectedIdea}</p>}
                          </div>
                          <button onClick={()=>setSelectedTopic(null)} style={{ fontSize:".75rem", color:"#6366f1", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>Clear</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background:"#f8fafc", border:"1px dashed #cbd5e1", borderRadius:".6rem", padding:".875rem", textAlign:"center" }}>
                        <p style={{ color:"#94a3b8", fontSize:".8rem" }}>No topic selected — <button onClick={()=>setActiveTab("topics")} style={{ background:"none", border:"none", color:"#6366f1", cursor:"pointer", fontWeight:600, fontSize:".8rem" }}>browse Trending Topics →</button></p>
                      </div>
                    )}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                    {[["Company Name",companyName],["Quote Attribution",quoteAttribution]].map(([lbl,val])=>(
                      <div key={lbl}>
                        <label className="field-label">{lbl}</label>
                        <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
                          <input value={val} disabled className="field-input" style={{ background:"#f8fafc", color:val?"#475569":"#c0c9d4" }}/>
                          {!val&&<button onClick={openCompanyData} style={{ fontSize:".7rem", color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>Set →</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                    <div>
                      <label className="field-label">Main Focus</label>
                      <div style={{ position:"relative" }}>
                        <button type="button" onClick={()=>{ setShowFocusDropdown(p=>!p); setShowThemeDropdown(false); }} className="field-input" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                          <span style={{ display:"flex", alignItems:"center", gap:".5rem", fontWeight:500 }}>{FOCUS_OPTIONS.find(f=>f.value===prFormData.mainFocus)?.emoji} {prFormData.mainFocus}</span>
                          <span style={{ color:"#94a3b8", fontSize:".7rem" }}>▼</span>
                        </button>
                        {showFocusDropdown&&<div style={{ position:"absolute", top:"100%", left:0, right:0, background:"white", border:"1px solid #e2e8f0", borderRadius:".5rem", boxShadow:"0 8px 24px rgba(0,0,0,.12)", zIndex:20, overflow:"hidden", marginTop:"4px" }}>
                          {FOCUS_OPTIONS.map(f=><button key={f.value} type="button" onClick={()=>{ setPrFormData(p=>({...p,mainFocus:f.value})); setShowFocusDropdown(false); }} style={{ width:"100%", textAlign:"left", padding:".6rem .875rem", background:prFormData.mainFocus===f.value?"#f0f4ff":"white", border:"none", cursor:"pointer", display:"flex", gap:".6rem", alignItems:"flex-start" }}><span>{f.emoji}</span><div><p style={{ fontWeight:600, fontSize:".82rem", color:"#1e293b", marginBottom:"2px" }}>{f.value}</p><p style={{ fontSize:".72rem", color:"#94a3b8" }}>{f.desc}</p></div></button>)}
                        </div>}
                      </div>
                    </div>
                    <div>
                      <label className="field-label">Theme & Style</label>
                      <div style={{ position:"relative" }}>
                        <button type="button" onClick={()=>{ setShowThemeDropdown(p=>!p); setShowFocusDropdown(false); }} className="field-input" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                          <span style={{ display:"flex", alignItems:"center", gap:".5rem", fontWeight:500 }}>{THEME_OPTIONS.find(t=>t.value===prFormData.theme)?.emoji} {THEME_OPTIONS.find(t=>t.value===prFormData.theme)?.label}</span>
                          <span style={{ color:"#94a3b8", fontSize:".7rem" }}>▼</span>
                        </button>
                        {showThemeDropdown&&<div style={{ position:"absolute", top:"100%", left:0, right:0, background:"white", border:"1px solid #e2e8f0", borderRadius:".5rem", boxShadow:"0 8px 24px rgba(0,0,0,.12)", zIndex:20, overflow:"hidden", marginTop:"4px" }}>
                          {THEME_OPTIONS.map(t=><button key={t.value} type="button" onClick={()=>{ setPrFormData(p=>({...p,theme:t.value})); setShowThemeDropdown(false); }} style={{ width:"100%", textAlign:"left", padding:".6rem .875rem", background:prFormData.theme===t.value?"#f0f4ff":"white", border:"none", cursor:"pointer", display:"flex", gap:".6rem", alignItems:"flex-start" }}><span>{t.emoji}</span><div><p style={{ fontWeight:600, fontSize:".82rem", color:"#1e293b", marginBottom:"2px" }}>{t.label}</p><p style={{ fontSize:".72rem", color:"#94a3b8" }}>{t.desc}</p></div></button>)}
                        </div>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Article Length</label>
                    <select value={prFormData.wordCount} onChange={e=>setPrFormData(p=>({...p,wordCount:e.target.value}))} className="field-input">
                      <option value="350">Brief Insight — 350 Words</option>
                      <option value="500">Standard Article — 500 Words</option>
                      <option value="1000">In-Depth Exploration — 1000 Words</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Target Keywords <span style={{ color:"#94a3b8", fontWeight:400 }}>(up to 2)</span></label>
                    <KeywordTagInput keywords={prFormData.keywords} onChange={kw=>setPrFormData(p=>({...p,keywords:kw}))} maxKeywords={2}/>
                  </div>
                  <div>
                    <label className="field-label">What is the Press Release About? <span style={{ color:"#ef4444" }}>*</span></label>
                    <textarea value={prFormData.about} onChange={e=>setPrFormData(p=>({...p,about:e.target.value}))} placeholder="Describe the news, announcement, or story in detail..." className="field-input" style={{ height:"150px", resize:"vertical", lineHeight:1.6 }}/>
                  </div>
                  <div>
                    <label className="field-label">Key Quote <span style={{ color:"#ef4444" }}>*</span></label>
                    <textarea value={prFormData.quote} onChange={e=>setPrFormData(p=>({...p,quote:e.target.value}))} placeholder="Enter a compelling quote from a company spokesperson..." className="field-input" style={{ height:"80px", resize:"vertical", lineHeight:1.6 }}/>
                  </div>
                  <details>
                    <summary style={{ fontSize:".82rem", fontWeight:600, color:"#64748b", cursor:"pointer", padding:".5rem 0", borderTop:"1px solid #f1f5f9", userSelect:"none" }}>＋ Optional Media (Image, Video, Map)</summary>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem", marginTop:".75rem" }}>
                      <div>
                        <label className="field-label">Featured Image</label>
                        <div className="field-input" style={{ display:"flex", alignItems:"center", gap:".5rem" }}><UploadIcon size={14}/><input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f){setPrFormData(p=>({...p,featuredImage:f}));showToast("Image added");}}} style={{ flex:1, fontSize:".78rem", border:"none", outline:"none" }}/>{prFormData.featuredImage&&<CheckIcon size={14}/>}</div>
                      </div>
                      <div>
                        <label className="field-label">YouTube URL</label>
                        <input type="url" value={prFormData.videoUrl} onChange={e=>setPrFormData(p=>({...p,videoUrl:e.target.value}))} placeholder="https://youtube.com/..." className="field-input"/>
                      </div>
                    </div>
                    <div style={{ marginTop:".75rem" }}>
                      <label className="field-label">Google Maps Embed</label>
                      <textarea value={prFormData.mapsEmbed} onChange={e=>setPrFormData(p=>({...p,mapsEmbed:e.target.value}))} placeholder="Paste Google Maps embed code here..." className="field-input" style={{ height:"70px", resize:"vertical" }}/>
                    </div>
                  </details>
                  <div style={{ display:"flex", gap:".75rem", paddingTop:".25rem" }}>
                    <button onClick={generatePressRelease} disabled={isLoading} className="btn-primary" style={{ flex:1, justifyContent:"center", padding:".8rem" }}>
                      {isLoading?<><LoaderIcon size={16}/> Generating...</>:<><SparklesIcon size={16}/> Generate Press Release</>}
                    </button>
                    <button onClick={()=>{ setPrFormData({about:"",quote:"",keywords:[],wordCount:"500",mainFocus:"Company News",theme:"thought-provoking",videoUrl:"",mapsEmbed:"",featuredImage:null}); setSelectedTopic(null); showToast("Form cleared"); }} className="btn-secondary">Clear</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ──────────────────────────────────────────────────────── */}
        {activeTab === "orders" && (
          <div className="animate-fadein">
            <div style={{ marginBottom:"1.25rem" }}>
              <h2 className="font-display" style={{ fontSize:"1.3rem", fontWeight:700, color:"#0f172a", marginBottom:".2rem" }}>PR Orders</h2>
              <p style={{ color:"#64748b", fontSize:".875rem" }}>Your press release distribution orders</p>
            </div>
            {showThankYou&&<div style={{ background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1px solid #86efac", borderRadius:".875rem", padding:"1.25rem", marginBottom:"1.25rem" }}><h3 style={{ fontWeight:700, color:"#166534", marginBottom:".35rem" }}>🎉 Order Placed!</h3><p style={{ fontSize:".875rem", color:"#15803d" }}>Your press release has been submitted for distribution.</p></div>}
            {orders.length>0 ? (
              <div className="card" style={{ overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".875rem" }}>
                  <thead><tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                    {["PR Title","Package","Price","Date",""].map(h=><th key={h} style={{ padding:".75rem 1rem", textAlign:"left", fontWeight:600, color:"#64748b", fontSize:".78rem", letterSpacing:".04em", textTransform:"uppercase" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{orders.map(o=><tr key={o.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:".875rem 1rem", fontWeight:500, color:"#0f172a", maxWidth:"200px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.prTitle}</td>
                    <td style={{ padding:".875rem 1rem", color:"#475569" }}>{o.productName}</td>
                    <td style={{ padding:".875rem 1rem" }}><span style={{ background:"#f0fdf4", color:"#166534", fontWeight:600, padding:".2rem .6rem", borderRadius:"99px", fontSize:".78rem" }}>{o.price}</span></td>
                    <td style={{ padding:".875rem 1rem", color:"#94a3b8", fontSize:".82rem" }}>{o.date}</td>
                    <td style={{ padding:".875rem 1rem" }}><button onClick={()=>setSelectedOrder(o)} style={{ color:"#6366f1", fontSize:".78rem", fontWeight:600, background:"none", border:"1px solid #c7d2fe", borderRadius:".35rem", padding:".25rem .6rem", cursor:"pointer" }}>View</button></td>
                  </tr>)}</tbody>
                </table>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"5rem 0", gap:"1rem" }}>
                <div style={{ width:80, height:80, borderRadius:"50%", background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center" }}><CartIcon size={36}/></div>
                <div style={{ textAlign:"center" }}>
                  <p style={{ fontWeight:600, color:"#334155", marginBottom:".35rem" }}>No orders yet</p>
                  <p style={{ color:"#94a3b8", fontSize:".875rem" }}>Generate a press release and distribute it.</p>
                </div>
                <button onClick={()=>setActiveTab("pr")} className="btn-primary"><BriefIcon size={15}/> Create a Press Release</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══ COMPANY DATA MODAL ═══════════════════════════════════════════════ */}
      {showCompanyData && (
        <div className="modal-backdrop" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"1rem" }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowCompanyData(false); }}>
          <div className="modal-panel card" style={{ maxWidth:"580px", width:"100%", maxHeight:"92vh", overflowY:"auto", padding:0, borderRadius:"1rem" }}>

            {/* Modal header */}
            <div style={{ background:"linear-gradient(135deg,#0b1120,#1e1b4b)", padding:"1.15rem 1.5rem", borderRadius:"1rem 1rem 0 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:".75rem" }}>
                <div style={{ background:"rgba(99,102,241,.3)", borderRadius:".45rem", padding:".42rem", display:"flex" }}><BuildingIcon size={17}/></div>
                <div>
                  <h2 className="font-display" style={{ color:"white", fontWeight:800, fontSize:"1.05rem", margin:0 }}>Company Data</h2>
                  <p style={{ color:"#818cf8", fontSize:".72rem", margin:"2px 0 0" }}>Powers all AI features across the dashboard</p>
                </div>
              </div>
              <button onClick={()=>setShowCompanyData(false)} style={{ color:"#64748b", background:"none", border:"none", cursor:"pointer" }}><XIcon size={19}/></button>
            </div>

            {/* Mode selector */}
            <div style={{ padding:"1.15rem 1.5rem 0" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem", marginBottom:"1.15rem" }}>
                <button onClick={()=>setCdMode("ai")} className={`cd-option ${cdMode==="ai"?"selected":""}`}>
                  <div style={{ display:"flex", alignItems:"center", gap:".55rem", marginBottom:".4rem" }}>
                    <span style={{ fontSize:"1.2rem" }}>🤖</span>
                    <span style={{ fontWeight:700, color:cdMode==="ai"?"#4338ca":"#1e293b", fontSize:".875rem" }}>AI Company Data</span>
                  </div>
                  <p style={{ fontSize:".77rem", color:"#64748b", margin:0, lineHeight:1.5 }}>Enter your website URL — AI crawls it and autofills all fields automatically.</p>
                </button>
                <button onClick={()=>setCdMode("manual")} className={`cd-option ${cdMode==="manual"?"selected":""}`}>
                  <div style={{ display:"flex", alignItems:"center", gap:".55rem", marginBottom:".4rem" }}>
                    <span style={{ fontSize:"1.2rem" }}>✍️</span>
                    <span style={{ fontWeight:700, color:cdMode==="manual"?"#4338ca":"#1e293b", fontSize:".875rem" }}>Manual Entry</span>
                  </div>
                  <p style={{ fontSize:".77rem", color:"#64748b", margin:0, lineHeight:1.5 }}>Fill out your company details directly for use across all AI features.</p>
                </button>
              </div>
            </div>

            <div style={{ height:1, background:"#f1f5f9", margin:"0 1.5rem" }}/>

            {/* ── AI CRAWL ── */}
            {cdMode === "ai" && (
              <div style={{ padding:"1.15rem 1.5rem" }}>
                <div style={{ background:"#f0f4ff", border:"1px solid #c7d2fe", borderRadius:".75rem", padding:".875rem 1.1rem", marginBottom:"1.15rem" }}>
                  <p style={{ fontSize:".82rem", color:"#3730a3", fontWeight:500, lineHeight:1.6, margin:0 }}>
                    🤖 <strong>Gemini AI</strong> will visit up to <strong>15 pages</strong> of your website — prioritising <em>Home, About, Services</em> and <em>Contact</em> — and extract all company data in one pass.
                  </p>
                </div>
                {/* Source type selector */}
                <div style={{ display:"flex", gap:".5rem", marginBottom:".85rem", background:"#f1f5f9", borderRadius:".5rem", padding:".25rem" }}>
                  {[
                    { key:"website", label:"🌐 Website URL",      placeholder:"https://yourcompany.com"          },
                    { key:"summary", label:"📄 Summary File URL", placeholder:"https://yoursite.com/summary.txt" },
                  ].map(opt => (
                    <button key={opt.key} onClick={()=>{ setCrawlSourceType(opt.key); setAiCrawlUrl(""); setCrawlError(null); }}
                      style={{ flex:1, padding:".4rem .5rem", border:"none", borderRadius:".35rem", fontSize:".75rem", fontWeight:600, cursor:"pointer", transition:"all .15s",
                        background: crawlSourceType===opt.key ? "white" : "transparent",
                        color:      crawlSourceType===opt.key ? "#4338ca" : "#64748b",
                        boxShadow:  crawlSourceType===opt.key ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Dynamic URL input */}
                {[
                  { key:"website", label:"Website URL",      ph:"https://yourcompany.com"          },
                  { key:"summary", label:"Summary File URL", ph:"https://yoursite.com/summary.txt" },
                ].map(opt => crawlSourceType===opt.key && (
                  <div key={opt.key}>
                    <label className="field-label">{opt.label}</label>
                    <div style={{ display:"flex", gap:".75rem", marginBottom:"1rem" }}>
                      <input type="url" value={aiCrawlUrl} onChange={e=>setAiCrawlUrl(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&!isCrawling&&crawlWebsite()}
                        placeholder={opt.ph} className="field-input" style={{ flex:1 }}/>
                      <button onClick={crawlWebsite} disabled={isCrawling||!aiCrawlUrl.trim()} className="btn-primary" style={{ flexShrink:0 }}>
                        {isCrawling?<><LoaderIcon size={15}/> Crawling...</>:<><GlobeIcon size={15}/> Extract Data</>}
                      </button>
                    </div>
                  </div>
                ))}

                {crawlError && (
                  <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:".5rem", padding:".75rem 1rem", display:"flex", gap:".5rem", alignItems:"center", color:"#be123c", fontSize:".82rem", marginBottom:"1rem" }}>
                    <AlertIcon size={15}/> {crawlError}
                    <button onClick={()=>setCdMode("manual")} style={{ marginLeft:"auto", color:"#be123c", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontSize:".82rem", whiteSpace:"nowrap" }}>Enter manually →</button>
                  </div>
                )}

                {isCrawling && (
                  <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:".75rem", padding:"1rem", marginBottom:".5rem" }}>
                    {/* Status line */}
                    <div style={{ display:"flex", alignItems:"center", gap:".6rem", marginBottom:".85rem" }}>
                      <LoaderIcon size={15}/>
                      <span style={{ fontSize:".8rem", fontWeight:600, color:"#475569" }}>{crawlStatus || "Initializing…"}</span>
                    </div>
                    {/* Page log */}
                    {crawlPages.length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:".3rem", maxHeight:"160px", overflowY:"auto" }}>
                        {crawlPages.map((p, i) => (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:".5rem", fontSize:".76rem" }}>
                            {p.status === "loading" && <LoaderIcon size={12}/>}
                            {p.status === "ok"      && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
                            {p.status === "skip"    && <span style={{ color:"#94a3b8" }}>–</span>}
                            <span style={{ color: p.status==="ok" ? "#374151" : p.status==="skip" ? "#94a3b8" : "#6366f1", fontWeight: p.status==="ok" ? 600 : 400 }}>
                              {p.label} <span style={{ color:"#cbd5e1", fontWeight:400 }}>({p.path})</span>
                            </span>
                            {p.status === "ok"   && <span style={{ marginLeft:"auto", color:"#10b981", fontSize:".7rem", fontWeight:600 }}>Fetched</span>}
                            {p.status === "skip" && <span style={{ marginLeft:"auto", color:"#94a3b8", fontSize:".7rem" }}>Not found</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!isCrawling && crawlPages.length > 0 && !crawlError && (
                  <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:".5rem", padding:".6rem .875rem", display:"flex", alignItems:"center", gap:".5rem", fontSize:".78rem", color:"#166534", fontWeight:500, marginBottom:".5rem" }}>
                    <CheckIcon size={13}/>
                    Scanned {crawlPages.filter(p=>p.status==="ok").length} of {crawlPages.length} pages — data extracted below.
                  </div>
                )}

                {!isCrawling && crawlPages.length === 0 && !crawlError && (
                  <p style={{ color:"#94a3b8", fontSize:".78rem", textAlign:"center" }}>After extraction, you'll switch to review mode to confirm and save your data.</p>
                )}
              </div>
            )}

            {/* ── MANUAL FORM ── */}
            {cdMode === "manual" && (
              <div style={{ padding:"1.15rem 1.5rem", display:"flex", flexDirection:"column", gap:".9rem" }}>
                <div>
                  <p style={{ fontSize:".7rem", fontWeight:700, color:"#6366f1", letterSpacing:".08em", marginBottom:".7rem" }}>COMPANY INFO</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem", marginBottom:".7rem" }}>
                    <div>
                      <label className="field-label">Company Name <span style={{ color:"#ef4444" }}>*</span></label>
                      <input value={cdDraft.name} onChange={e=>setCdDraft(p=>({...p,name:e.target.value}))} placeholder="e.g. Acme Corp" className="field-input"/>
                    </div>
                    <div>
                      <label className="field-label">Industry <span style={{ color:"#ef4444" }}>*</span></label>
                      <input value={cdDraft.industry} onChange={e=>setCdDraft(p=>({...p,industry:e.target.value}))} placeholder="e.g. Digital Marketing" className="field-input"/>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                    <div>
                      <label className="field-label">Website URL</label>
                      <input type="url" value={cdDraft.websiteUrl} onChange={e=>setCdDraft(p=>({...p,websiteUrl:e.target.value}))} placeholder="https://yoursite.com" className="field-input"/>
                    </div>
                    <div>
                      <label className="field-label">Quote Attribution</label>
                      <input value={cdDraft.quoteAttribution} onChange={e=>setCdDraft(p=>({...p,quoteAttribution:e.target.value}))} placeholder="Jane Doe — CEO, Acme Corp" className="field-input"/>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="field-label">About Company</label>
                  <textarea value={cdDraft.about} onChange={e=>setCdDraft(p=>({...p,about:e.target.value}))} placeholder="Brief company description, mission, products or services — AI uses this in press releases..." className="field-input" style={{ height:"80px", resize:"vertical", lineHeight:1.6 }}/>
                </div>
                <div>
                  <label className="field-label">List of Services</label>
                  <textarea value={cdDraft.services||""} onChange={e=>setCdDraft(p=>({...p,services:e.target.value}))} placeholder="e.g. SEO Optimization, Content Marketing, Social Media Management, PPC Advertising…" className="field-input" style={{ height:"70px", resize:"vertical", lineHeight:1.6 }}/>
                </div>
                <div>
                  <p style={{ fontSize:".7rem", fontWeight:700, color:"#6366f1", letterSpacing:".08em", marginBottom:".7rem" }}>CONTACT DATA</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
                    <div>
                      <label className="field-label" style={{ display:"flex", alignItems:"center", gap:".35rem" }}><MapPinIcon size={13}/> Address</label>
                      <input value={cdDraft.address} onChange={e=>setCdDraft(p=>({...p,address:e.target.value}))} placeholder="123 Main St, City, State, ZIP" className="field-input"/>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                      <div>
                        <label className="field-label" style={{ display:"flex", alignItems:"center", gap:".35rem" }}><PhoneIcon size={13}/> Phone</label>
                        <input type="tel" value={cdDraft.phone} onChange={e=>setCdDraft(p=>({...p,phone:e.target.value}))} placeholder="+1 (555) 000-0000" className="field-input"/>
                      </div>
                      <div>
                        <label className="field-label" style={{ display:"flex", alignItems:"center", gap:".35rem" }}><MailIcon size={13}/> Email</label>
                        <input type="email" value={cdDraft.email} onChange={e=>setCdDraft(p=>({...p,email:e.target.value}))} placeholder="press@yourcompany.com" className="field-input"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding:"1rem 1.5rem", borderTop:"1px solid #f1f5f9", display:"flex", gap:".75rem", justifyContent:"flex-end", background:"#fafafa", borderRadius:"0 0 1rem 1rem" }}>
              <button onClick={()=>setShowCompanyData(false)} className="btn-secondary">Cancel</button>
              {cdMode==="manual" && (
                <button onClick={async()=>{
                  if(!cdDraft.name.trim()||!cdDraft.industry.trim()){ showToast("Company Name and Industry are required","error"); return; }
                  await saveCompanyData(cdDraft); setShowCompanyData(false); showToast("Company data saved!");
                }} className="btn-primary"><SaveIcon size={15}/> Save Company Data</button>
              )}
              {cdMode==="ai" && !isCrawling && cdDraft.name && (
                <button onClick={async()=>{ await saveCompanyData(cdDraft); setShowCompanyData(false); showToast("Company data saved!"); }} className="btn-primary"><SaveIcon size={15}/> Save Extracted Data</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ SETTINGS MODAL ══════════════════════════════════════════════════ */}
      {showSettings && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"1rem" }}>
          <div className="card modal-panel" style={{ maxWidth:"640px", width:"100%", padding:"1.5rem", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
              <h2 className="font-display" style={{ fontSize:"1.15rem", fontWeight:700 }}>Settings</h2>
              <button onClick={()=>setShowSettings(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}><XIcon size={19}/></button>
            </div>

            {/* Claude API Key */}
            <div style={{ background:"#f8faff", border:"1px solid #e0e7ff", borderRadius:".75rem", padding:"1.1rem 1.15rem", marginBottom:"1rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:".5rem", marginBottom:".4rem" }}>
                <span style={{ fontSize:"1rem" }}>🤖</span>
                <h3 style={{ fontWeight:700, fontSize:".95rem", margin:0 }}>Claude API Key</h3>
                {claudeApiKey && <span style={{ marginLeft:"auto", background:"#f0fdf4", color:"#166534", border:"1px solid #bbf7d0", borderRadius:"99px", fontSize:".7rem", fontWeight:600, padding:".15rem .6rem" }}>✓ Saved</span>}
              </div>
              <p style={{ fontSize:".77rem", color:"#64748b", marginBottom:".75rem" }}>
                Required when running outside the Claude sandbox. Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color:"#4f46e5", fontWeight:600 }}>console.anthropic.com</a>
              </p>
              <div style={{ display:"flex", gap:".6rem" }}>
                <input type="password" value={claudeKeyDraft} onChange={e=>setClaudeKeyDraft(e.target.value)}
                  placeholder="sk-ant-…" className="field-input" style={{ flex:1, fontFamily:"monospace", fontSize:".82rem" }}/>
                <button onClick={async()=>{
                  const k = claudeKeyDraft.trim();
                  setClaudeApiKey(k);
                  try { await window.storage.set("mbb:claudeKey", k); } catch {}
                  showToast(k ? "Claude key saved!" : "Key cleared");
                }} className="btn-primary" style={{ flexShrink:0, padding:".6rem 1rem" }}>
                  <SaveIcon size={14}/> Save
                </button>
              </div>
            </div>

            {/* Outbound Webhook */}
            <div style={{ background:"#f8faff", border:"1px solid #e0e7ff", borderRadius:".75rem", padding:"1.1rem 1.15rem", marginBottom:"1rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:".5rem", marginBottom:".4rem" }}>
                <span style={{ fontSize:"1rem" }}>🔗</span>
                <h3 style={{ fontWeight:700, fontSize:".95rem", margin:0 }}>Outbound Webhook</h3>
                {webhookUrl && <span style={{ marginLeft:"auto", background:"#f0fdf4", color:"#166534", border:"1px solid #bbf7d0", borderRadius:"99px", fontSize:".7rem", fontWeight:600, padding:".15rem .6rem" }}>✓ Active</span>}
              </div>
              <p style={{ fontSize:".77rem", color:"#64748b", marginBottom:".75rem" }}>
                Fired on every order with full PR content + order data. Works with Make, Zapier, HighLevel workflows, or any HTTP endpoint.
              </p>
              <div style={{ fontSize:".72rem", color:"#94a3b8", marginBottom:".65rem", fontFamily:"monospace", background:"#f1f5f9", padding:".5rem .75rem", borderRadius:".4rem" }}>
                Payload: event, location_id, order_id, pr_title, package, price, pr_content, company_name, industry, timestamp
              </div>
              <div style={{ display:"flex", gap:".6rem" }}>
                <input type="url" value={webhookDraft} onChange={e=>setWebhookDraft(e.target.value)}
                  placeholder="https://hook.make.com/... or https://hooks.zapier.com/..." className="field-input" style={{ flex:1, fontSize:".82rem" }}/>
                <button onClick={async()=>{
                  const u = webhookDraft.trim();
                  setWebhookUrl(u);
                  try { await window.storage.set("mbb:webhookUrl", u); } catch {}
                  showToast(u ? "Webhook saved!" : "Webhook cleared");
                }} className="btn-primary" style={{ flexShrink:0, padding:".6rem 1rem" }}>
                  <SaveIcon size={14}/> Save
                </button>
              </div>
            </div>

            {/* Custom PR Prompt */}
            <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:"1.15rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:".5rem" }}>
                <div style={{ flex:1 }}>
                  <h3 style={{ fontWeight:700, fontSize:".95rem", marginBottom:".2rem", display:"flex", gap:".5rem", alignItems:"center" }}><SparklesIcon size={16}/> Custom PR Prompt</h3>
                  <p style={{ fontSize:".77rem", color:"#64748b" }}>Placeholders: {"{companyName}, {industry}, {websiteUrl}, {mainFocus}, {theme}, {targetWords}, {keywordsText}, {about}, {quote}, {quoteAttribution}"}</p>
                </div>
                <button onClick={()=>setCustomPRPrompt("")} style={{ fontSize:".75rem", color:"#6366f1", fontWeight:600, background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap", marginLeft:"1rem" }}>Reset</button>
              </div>
              <textarea value={customPRPrompt} onChange={e=>setCustomPRPrompt(e.target.value)} placeholder="Leave blank to use the default AI prompt..." className="field-input" style={{ fontFamily:"monospace", fontSize:".78rem", height:"160px", resize:"vertical" }}/>
            </div>
            <div style={{ marginTop:"1.15rem", display:"flex", justifyContent:"flex-end" }}>
              <button onClick={()=>setShowSettings(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ REFINE DIALOG ═══════════════════════════════════════════════════ */}
      {showRefineDialog && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"1rem" }}>
          <div className="card modal-panel" style={{ maxWidth:"460px", width:"100%", padding:"1.5rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".75rem" }}>
              <h2 className="font-display" style={{ fontSize:"1.1rem", fontWeight:700 }}>Refine with AI</h2>
              <button onClick={()=>setShowRefineDialog(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}><XIcon size={18}/></button>
            </div>
            <p style={{ fontSize:".82rem", color:"#64748b", marginBottom:"1rem" }}>Describe your changes.{refinementCount>0&&<span style={{ color:"#f59e0b", fontWeight:600 }}> ({refinementCount}/5 used)</span>}</p>
            <textarea value={refinementInstructions} onChange={e=>setRefinementInstructions(e.target.value)} placeholder="e.g., Make it more persuasive, add statistics, shorten the intro..." className="field-input" style={{ height:"110px", resize:"none", marginBottom:"1rem" }}/>
            <div style={{ display:"flex", gap:".75rem" }}>
              <button onClick={refinePressRelease} disabled={isLoading||!refinementInstructions.trim()} className="btn-primary" style={{ flex:1, justifyContent:"center" }}>
                {isLoading?<><LoaderIcon size={15}/> Refining...</>:<><SparklesIcon size={15}/> Refine</>}
              </button>
              <button onClick={()=>{ setShowRefineDialog(false); setRefinementInstructions(""); }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ORDER DETAIL MODAL ══════════════════════════════════════════════ */}
      {selectedOrder && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"1rem" }}>
          <div className="card" style={{ maxWidth:"760px", width:"100%", padding:"1.5rem", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
              <h2 className="font-display" style={{ fontSize:"1.1rem", fontWeight:700 }}>{selectedOrder.prTitle}</h2>
              <button onClick={()=>setSelectedOrder(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}><XIcon size={19}/></button>
            </div>
            <div className="prose" style={{ padding:"1rem", background:"#f8fafc", borderRadius:".6rem", border:"1px solid #e2e8f0" }} dangerouslySetInnerHTML={{ __html:selectedOrder.prContent }}/>
          </div>
        </div>
      )}

      {/* ══ TOAST ═══════════════════════════════════════════════════════════ */}
      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:60, background:toast.type==="success"?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#ef4444,#dc2626)", color:"white", padding:".75rem 1.1rem", borderRadius:".6rem", boxShadow:"0 8px 24px rgba(0,0,0,.2)", fontSize:".875rem", fontWeight:500, display:"flex", alignItems:"center", gap:".5rem", animation:"fadeSlideIn .3s ease" }}>
          {toast.type==="success"?<CheckIcon size={15}/>:<AlertIcon size={15}/>}{toast.message}
        </div>
      )}
    </div>
  );
}
