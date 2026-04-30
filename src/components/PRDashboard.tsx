import { useState, useMemo, useEffect } from "react";
import { store } from "../lib/ai";
import { supabase, SUPABASE_URL, SUPABASE_ANON } from "../lib/supabase";
import { CompanyData, Topic, Order, EMPTY_COMPANY, PR_PACKAGES } from "../lib/constants";
import { ZapIcon, BuildingIcon, SettingsIcon, CheckIcon, AlertIcon, NewsIcon, BarIcon, ShieldIcon, BriefIcon, CartIcon } from "./icons";
import CompanyDataModal from "./CompanyDataModal";
import SettingsModal from "./SettingsModal";
import TrendingTopics from "./tabs/TrendingTopics";
import CompetitorAnalysis from "./tabs/CompetitorAnalysis";
import TrustAssets from "./tabs/TrustAssets";
import PRCreator from "./tabs/PRCreator";
import Orders from "./tabs/Orders";

// ─── Global Styles ─────────────────────────────────────────────────────────────
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

const TABS = [
  { id: "topics",     icon: <NewsIcon size={15}/>,   label: "Trending Topics"     },
  { id: "competitor", icon: <BarIcon size={15}/>,    label: "Competitor Analysis" },
  { id: "widgets",    icon: <ShieldIcon size={15}/>, label: "Trust Assets"        },
  { id: "pr",         icon: <BriefIcon size={15}/>,  label: "PR Creator"          },
  { id: "orders",     icon: <CartIcon size={15}/>,   label: "Orders"              },
];

export default function PRDashboard() {
  // ── Persistent / shared state ─────────────────────────────────────────────
  const [companyData,    setCompanyData]    = useState<CompanyData>(EMPTY_COMPANY);
  const [dataLoaded,     setDataLoaded]     = useState(false);
  const [webhookUrl,     setWebhookUrl]     = useState("");
  const [customPRPrompt, setCustomPRPrompt] = useState("");
  const [orders,         setOrders]         = useState<Order[]>([]);
  const [showThankYou,   setShowThankYou]   = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState("topics");
  const [selectedTopic,   setSelectedTopic]   = useState<(Topic & { selectedIdea?: string }) | null>(null);
  const [showCompanyData, setShowCompanyData] = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [toast,           setToast]           = useState<{ message: string; type: string } | null>(null);

  const locationId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("location_id") || params.get("locationId") || "preview-mode";
    } catch { return "preview-mode"; }
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Bootstrap: load settings + company profile + orders ───────────────────
  useEffect(() => {
    (async () => {
      try { const r = await store.get("mbb:webhookUrl"); if (r) setWebhookUrl(r); } catch {}
      try {
        const { data } = await supabase.from("company_profiles").select("*")
          .eq("location_id", locationId).order("updated_at", { ascending: false }).limit(1).single();
        if (data) {
          setCompanyData({ name: data.company_name || "", industry: data.industry || "", websiteUrl: data.website_url || "", about: data.about_company || "", services: data.list_of_services || "", address: data.address || "", phone: data.phone || "", email: data.email || "", quoteAttribution: data.quote_attribution || "", googleProfileUrl: "", summaryFileUrl: "" });
        } else {
          const cached = await store.get("mbb:companyData");
          if (cached) setCompanyData(JSON.parse(cached));
        }
      } catch { try { const c = await store.get("mbb:companyData"); if (c) setCompanyData(JSON.parse(c)); } catch {} }
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?location_id=eq.${locationId}&order=created_at.desc`, { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` } });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setOrders(data.map(o => ({ id: o.id, prTitle: o.pr_title, productName: o.product_name, price: `$${o.price}`, date: new Date(o.created_at).toLocaleDateString("en-US"), prContent: o.pr_content })));
      } catch {}
      setDataLoaded(true);
    })();
  }, [locationId]);

  // ── Save company data to Supabase + store ─────────────────────────────────
  const saveCompanyData = async (data: CompanyData) => {
    setCompanyData(data);
    try { await store.set("mbb:companyData", JSON.stringify(data)); } catch {}
    try { await supabase.from("company_profiles").upsert({ location_id: locationId, company_name: data.name, industry: data.industry, website_url: data.websiteUrl || "", about_company: data.about || "", list_of_services: data.services || "", address: data.address || "", phone: data.phone || "", email: data.email || "", quote_attribution: data.quoteAttribution || "", updated_at: new Date().toISOString() }, { onConflict: "location_id" }); } catch {}
  };

  // ── Place order (called from PRCreator) ───────────────────────────────────
  const placeOrder = async (packageType: string, prTitle: string, prContent: string) => {
    const pkg      = PR_PACKAGES[packageType];
    const newOrder: Order = { id: crypto.randomUUID(), prTitle, productName: packageType, price: pkg.price, date: new Date().toLocaleDateString("en-US"), prContent };
    setOrders(prev => [newOrder, ...prev]);
    setShowThankYou(true);
    if (locationId !== "preview-mode") {
      try { await supabase.from("orders").insert({ location_id: locationId, pr_title: prTitle, product_name: packageType, package_type: packageType, price: parseFloat(pkg.price.replace("$", "")), pr_content: prContent }); } catch {}
    }
    if (webhookUrl) {
      try { await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "order.placed", location_id: locationId, order_id: newOrder.id, pr_title: prTitle, package: packageType, price: pkg.price, pr_content: prContent, company_name: companyData.name, industry: companyData.industry, timestamp: new Date().toISOString() }) }); } catch {}
    }
    window.open(pkg.paymentLink, "_blank");
  };

  const handleTopicSelect = (topic: Topic & { selectedIdea?: string }) => {
    setSelectedTopic(topic);
    setActiveTab("pr");
    showToast(topic.selectedIdea ? "Angle selected!" : "Topic selected!");
  };

  const hasCompanyData = !!(companyData.name || companyData.industry);

  return (
    <div className="mbb-root" style={{ display:"flex",flexDirection:"column",minHeight:"100vh",background:"#f1f5f9" }}>
      <GlobalStyles/>

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <header style={{ background:"#0b1120",borderBottom:"1px solid #1e2d45",padding:"0 1.5rem",display:"flex",alignItems:"center",gap:"1.25rem",minHeight:"56px",position:"sticky",top:0,zIndex:30,boxShadow:"0 2px 16px rgba(0,0,0,.35)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:".6rem",flexShrink:0 }}>
          <div style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:".45rem",padding:".38rem",display:"flex" }}><ZapIcon size={16}/></div>
          <span className="font-display" style={{ color:"white",fontWeight:800,fontSize:".95rem",letterSpacing:"-.01em",whiteSpace:"nowrap" }}>Media Blast Boosters<span style={{ color:"#6366f1",fontSize:".7rem",fontWeight:700,marginLeft:".2rem" }}>™</span></span>
        </div>
        <div style={{ width:1,height:22,background:"#1e2d45",flexShrink:0 }}/>
        <nav style={{ display:"flex",gap:".1rem",flex:1,overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:".42rem .78rem",fontWeight:600,fontSize:".78rem",borderRadius:".35rem",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:".38rem",border:"none",cursor:"pointer",background:activeTab===t.id?"rgba(99,102,241,.22)":"transparent",color:activeTab===t.id?"#a5b4fc":"#64748b",transition:"all .15s" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
        <button onClick={() => setShowCompanyData(true)} style={{ display:"flex",alignItems:"center",gap:".45rem",padding:".38rem .85rem",background:"transparent",border:"1px solid #2d4060",borderRadius:".45rem",color:hasCompanyData?"#a5b4fc":"#475569",cursor:"pointer",fontSize:".78rem",fontWeight:600,transition:"all .2s",flexShrink:0,whiteSpace:"nowrap" }}
          onMouseOver={e=>{ e.currentTarget.style.background="rgba(99,102,241,.15)"; e.currentTarget.style.borderColor="#6366f1"; e.currentTarget.style.color="#a5b4fc"; }}
          onMouseOut={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="#2d4060"; e.currentTarget.style.color=hasCompanyData?"#a5b4fc":"#475569"; }}>
          <BuildingIcon size={14}/> Company Data {hasCompanyData&&<span style={{ width:6,height:6,borderRadius:"50%",background:"#34d399",flexShrink:0 }}/>}
        </button>
        <button onClick={() => setShowSettings(true)} style={{ color:"#475569",background:"none",border:"none",cursor:"pointer",padding:".3rem",display:"flex",flexShrink:0,transition:"color .15s" }}
          onMouseOver={e=>e.currentTarget.style.color="#a5b4fc"} onMouseOut={e=>e.currentTarget.style.color="#475569"}>
          <SettingsIcon size={16}/>
        </button>
      </header>

      {/* ══ MAIN ══════════════════════════════════════════════════════════════ */}
      <main style={{ flex:1,overflowY:"auto",padding:"1.5rem",maxWidth:"940px",width:"100%",margin:"0 auto" }}>
        {!hasCompanyData && dataLoaded && (
          <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)",border:"1px solid #4338ca",borderRadius:".875rem",padding:"1rem 1.5rem",marginBottom:"1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem",flexWrap:"wrap" }}>
            <div style={{ display:"flex",alignItems:"center",gap:".75rem" }}>
              <div style={{ background:"rgba(99,102,241,.25)",borderRadius:".5rem",padding:".5rem",display:"flex" }}><BuildingIcon size={20}/></div>
              <div>
                <p style={{ color:"white",fontWeight:600,fontSize:".9rem",margin:0 }}>Set up your company profile to get started</p>
                <p style={{ color:"#a5b4fc",fontSize:".78rem",margin:"2px 0 0" }}>AI uses your company data to personalize every output across the dashboard.</p>
              </div>
            </div>
            <button onClick={() => setShowCompanyData(true)} className="btn-primary" style={{ flexShrink:0 }}><BuildingIcon size={15}/> Add Company Data</button>
          </div>
        )}

        {activeTab === "topics"     && <TrendingTopics companyData={companyData} showToast={showToast} onTopicSelect={handleTopicSelect}/>}
        {activeTab === "competitor" && <CompetitorAnalysis companyName={companyData.name} industry={companyData.industry} locationId={locationId} showToast={showToast}/>}
        {activeTab === "widgets"    && <TrustAssets orders={orders} locationId={locationId} showToast={showToast}/>}
        {activeTab === "pr"         && <PRCreator companyData={companyData} customPRPrompt={customPRPrompt} selectedTopic={selectedTopic} onClearTopic={() => setSelectedTopic(null)} onNavigateToTopics={() => setActiveTab("topics")} onOpenCompanyData={() => setShowCompanyData(true)} onPlaceOrder={placeOrder} showToast={showToast}/>}
        {activeTab === "orders"     && <Orders orders={orders} showThankYou={showThankYou} onNavigateToPR={() => setActiveTab("pr")}/>}
      </main>

      {/* ══ MODALS ════════════════════════════════════════════════════════════ */}
      <CompanyDataModal isOpen={showCompanyData} onClose={() => setShowCompanyData(false)} companyData={companyData} onSave={saveCompanyData} showToast={showToast}/>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} webhookUrl={webhookUrl} customPRPrompt={customPRPrompt}
        onSave={({ webhookUrl: w, customPRPrompt: p }) => { setWebhookUrl(w); setCustomPRPrompt(p); }} showToast={showToast}/>

      {/* ══ TOAST ═════════════════════════════════════════════════════════════ */}
      {toast && (
        <div style={{ position:"fixed",bottom:"1.5rem",right:"1.5rem",zIndex:60,background:toast.type==="success"?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",padding:".75rem 1.1rem",borderRadius:".6rem",boxShadow:"0 8px 24px rgba(0,0,0,.2)",fontSize:".875rem",fontWeight:500,display:"flex",alignItems:"center",gap:".5rem",animation:"fadeSlideIn .3s ease" }}>
          {toast.type==="success"?<CheckIcon size={15}/>:<AlertIcon size={15}/>}{toast.message}
        </div>
      )}
    </div>
  );
}
