import { useState, useEffect } from "react";
import { callGemini } from "../lib/ai";
import { SUPABASE_URL } from "../lib/supabase";
import { CompanyData, EMPTY_COMPANY } from "../lib/constants";
import { BuildingIcon, XIcon, SaveIcon, LoaderIcon, MapPinIcon, PhoneIcon, MailIcon } from "./icons";

interface CompanyDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyData: CompanyData;
  onSave: (data: CompanyData) => Promise<void>;
  showToast: (msg: string, type?: "success" | "error") => void;
}

type CrawlPage = { path: string; label: string; status: "loading" | "ok" | "skip" };

export default function CompanyDataModal({ isOpen, onClose, companyData, onSave, showToast }: CompanyDataModalProps) {
  const [cdMode,          setCdMode]          = useState<"ai" | "manual">("ai");
  const [cdDraft,         setCdDraft]         = useState<CompanyData>({ ...EMPTY_COMPANY });
  const [aiCrawlUrl,      setAiCrawlUrl]      = useState("");
  const [crawlSourceType, setCrawlSourceType] = useState<"website" | "summary">("website");
  const [isCrawling,      setIsCrawling]      = useState(false);
  const [crawlError,      setCrawlError]      = useState<string | null>(null);
  const [crawlStatus,     setCrawlStatus]     = useState("");
  const [crawlPages,      setCrawlPages]      = useState<CrawlPage[]>([]);

  // Sync draft with current companyData every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setCdDraft({ ...companyData });
      setAiCrawlUrl(companyData.websiteUrl || "");
      setCdMode(companyData.name ? "manual" : "ai");
      setCrawlError(null);
      setCrawlPages([]);
    }
  }, [isOpen]);

  const crawlWebsite = async () => {
    const rawUrl = aiCrawlUrl.trim().replace(/\/$/, "");
    if (!rawUrl) { setCrawlError("Please enter a URL"); return; }
    setIsCrawling(true); setCrawlError(null); setCrawlPages([]);
    const PRIORITY_PATHS = [
      { path: "",            label: "Home"       }, { path: "/about",      label: "About"      },
      { path: "/about-us",   label: "About Us"   }, { path: "/services",   label: "Services"   },
      { path: "/contact",    label: "Contact"    }, { path: "/contact-us", label: "Contact Us" },
      { path: "/blog",       label: "Blog"       }, { path: "/news",       label: "News"       },
    ];
    const isWebsite = crawlSourceType === "website";
    const isSummary = crawlSourceType === "summary";
    const allPages  = isWebsite ? PRIORITY_PATHS : [{ path: "", label: "Summary File" }];
    setCrawlPages(allPages.map(p => ({ ...p, status: "loading" as const })));

    if (isSummary) {
      setCrawlStatus("Fetching summary file…");
      try {
        const edgeRes  = await fetch(`${SUPABASE_URL}/functions/v1/claude-websearch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "fetch-summary", url: rawUrl }) });
        const edgeData = await edgeRes.json();
        if (!edgeData.content) throw new Error(edgeData.error || "Empty response");
        const md = edgeData.content;
        const field = (patterns: RegExp[]) => { for (const pat of patterns) { const m = md.match(pat); if (m && m[1] && m[1].trim() && m[1].trim() !== "null") return m[1].trim(); } return ""; };
        const listItems = (section: string) => { const m = md.match(new RegExp(`##\\s*${section}[\\s\\S]*?\\n((?:\\s*-[^\\n]+\\n?)+)`, "i")); if (!m) return ""; return m[1].split("\n").map((l: string) => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean).join(", "); };
        const parsed: Partial<CompanyData> = { name: field([/\*\*Company Name\*\*:\s*(.+)/i, /^#\s+BRAND IDENTITY:\s*(.+)/im]), industry: field([/\*\*Industry\*\*:\s*(.+)/i, /\*\*Sector\*\*:\s*(.+)/i]), websiteUrl: field([/\*\*Website\*\*:\s*(.+)/i]), quoteAttribution: "", about: field([/\*\*Tagline\*\*:\s*(.+)/i, /\*\*Description\*\*:\s*(.+)/i]), services: listItems("CORE SERVICES"), address: field([/\*\*Address\*\*:\s*(.+)/i]), phone: field([/\*\*Phone\*\*:\s*(.+)/i]), email: field([/\*\*Email\*\*:\s*(.+)/i]) };
        setCrawlPages(allPages.map(p => ({ ...p, status: "ok" as const }))); setCdDraft(prev => ({ ...prev, ...parsed })); setCdMode("manual"); showToast("Summary file loaded — review and save!");
      } catch (e: any) { setCrawlPages(prev => prev.map(p => ({ ...p, status: "skip" as const }))); setCrawlError("Failed to fetch summary: " + (e.message || "unknown error")); }
      setCrawlStatus(""); setIsCrawling(false); return;
    }

    setCrawlStatus("Searching with AI…");
    const urlList = allPages.map(p => rawUrl + p.path);
    const prompt = `Please visit and read the following URL(s) to extract company information.\n\nThese are pages from the company website. Prioritise: Home for company name/industry, About for company description, Services for list of services, Contact for address/phone/email. For the Blog/News page, look ONLY for the author name in byline elements.\n\nURLs to visit:\n${urlList.map((u, i) => `${i + 1}. ${u}`).join("\n")}\n\nExtract and return ONLY this JSON (empty string "" for anything not found — never null or invented data):\n{\n  "name": "Company name",\n  "industry": "Industry or sector",\n  "websiteUrl": "${rawUrl}",\n  "quoteAttribution": "Full Name — Title, Company (find owner/CEO/founder from About page, or from blog post bylines)",\n  "about": "2-3 sentence company description",\n  "services": "Comma-separated list of main services or products",\n  "address": "Full street address (from Contact page only)",\n  "phone": "Phone number (from Contact page only)",\n  "email": "Contact email"\n}`;
    try {
      const text = await callGemini(prompt);
      const clean = text.replace(/```json|```/g, "").trim();
      const jsonStr = clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1);
      const parsed  = JSON.parse(jsonStr);
      setCrawlPages(allPages.map(p => ({ ...p, status: "ok" as const }))); setCdDraft(prev => ({ ...prev, ...parsed, websiteUrl: rawUrl })); setCdMode("manual"); showToast("Data extracted — review and save!");
    } catch (e: any) { setCrawlPages(prev => prev.map(p => ({ ...p, status: "skip" as const }))); setCrawlError("Extraction failed: " + (e.message || "unknown error")); }
    setCrawlStatus(""); setIsCrawling(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:"1rem" }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal-panel card" style={{ maxWidth:"580px",width:"100%",maxHeight:"92vh",overflowY:"auto",padding:0,borderRadius:"1rem" }}>
        <div style={{ background:"linear-gradient(135deg,#0b1120,#1e1b4b)",padding:"1.15rem 1.5rem",borderRadius:"1rem 1rem 0 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:".75rem" }}>
            <div style={{ background:"rgba(99,102,241,.3)",borderRadius:".45rem",padding:".42rem",display:"flex" }}><BuildingIcon size={17}/></div>
            <div><h2 className="font-display" style={{ color:"white",fontWeight:800,fontSize:"1.05rem",margin:0 }}>Company Data</h2><p style={{ color:"#818cf8",fontSize:".72rem",margin:"2px 0 0" }}>Powers all AI features across the dashboard</p></div>
          </div>
          <button onClick={onClose} style={{ color:"#64748b",background:"none",border:"none",cursor:"pointer" }}><XIcon size={19}/></button>
        </div>
        <div style={{ padding:"1.15rem 1.5rem 0" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1.15rem" }}>
            <button onClick={()=>setCdMode("ai")} className={`cd-option ${cdMode==="ai"?"selected":""}`}><div style={{ display:"flex",alignItems:"center",gap:".55rem",marginBottom:".4rem" }}><span style={{ fontSize:"1.2rem" }}>🤖</span><span style={{ fontWeight:700,color:cdMode==="ai"?"#4338ca":"#1e293b",fontSize:".875rem" }}>AI Company Data</span></div><p style={{ fontSize:".77rem",color:"#64748b",margin:0,lineHeight:1.5 }}>Enter your website URL — AI crawls it and autofills all fields automatically.</p></button>
            <button onClick={()=>setCdMode("manual")} className={`cd-option ${cdMode==="manual"?"selected":""}`}><div style={{ display:"flex",alignItems:"center",gap:".55rem",marginBottom:".4rem" }}><span style={{ fontSize:"1.2rem" }}>✍️</span><span style={{ fontWeight:700,color:cdMode==="manual"?"#4338ca":"#1e293b",fontSize:".875rem" }}>Manual Entry</span></div><p style={{ fontSize:".77rem",color:"#64748b",margin:0,lineHeight:1.5 }}>Fill out your company details directly for use across all AI features.</p></button>
          </div>
        </div>
        <div style={{ height:1,background:"#f1f5f9",margin:"0 1.5rem" }}/>
        {cdMode==="ai"&&(
          <div style={{ padding:"1.15rem 1.5rem" }}>
            <div style={{ background:"#f0f4ff",border:"1px solid #c7d2fe",borderRadius:".75rem",padding:".875rem 1.1rem",marginBottom:"1.15rem" }}><p style={{ fontSize:".82rem",color:"#3730a3",fontWeight:500,lineHeight:1.6,margin:0 }}>🤖 <strong>Claude AI</strong> will visit up to <strong>8 pages</strong> of your website — prioritising <em>Home, About, Services</em> and <em>Contact</em> — and extract all company data in one pass.</p></div>
            <div style={{ display:"flex",gap:".5rem",marginBottom:".85rem",background:"#f1f5f9",borderRadius:".5rem",padding:".25rem" }}>
              {[{key:"website",label:"🌐 Website URL"},{key:"summary",label:"📄 Summary File URL"}].map(opt=>(
                <button key={opt.key} onClick={()=>{ setCrawlSourceType(opt.key as "website"|"summary"); setAiCrawlUrl(""); setCrawlError(null); }} style={{ flex:1,padding:".4rem .5rem",border:"none",borderRadius:".35rem",fontSize:".75rem",fontWeight:600,cursor:"pointer",transition:"all .15s",background:crawlSourceType===opt.key?"white":"transparent",color:crawlSourceType===opt.key?"#4338ca":"#64748b",boxShadow:crawlSourceType===opt.key?"0 1px 4px rgba(0,0,0,.1)":"none" }}>{opt.label}</button>
              ))}
            </div>
            <div style={{ display:"flex",gap:".6rem",marginBottom:crawlPages.length>0?".85rem":0 }}>
              <input type="url" value={aiCrawlUrl} onChange={e=>setAiCrawlUrl(e.target.value)} placeholder={crawlSourceType==="website"?"https://yourcompany.com":"https://yoursite.com/summary.txt"} className="field-input" style={{ flex:1 }}/>
              <button onClick={crawlWebsite} disabled={isCrawling||!aiCrawlUrl.trim()} className="btn-primary" style={{ flexShrink:0,whiteSpace:"nowrap" }}>{isCrawling?<><LoaderIcon size={14}/> {crawlStatus||"Crawling…"}</>:"🔍 Extract Data"}</button>
            </div>
            {crawlError&&<p style={{ color:"#be123c",fontSize:".78rem",marginTop:".5rem" }}>{crawlError}</p>}
            {crawlPages.length>0&&<div style={{ display:"flex",flexWrap:"wrap",gap:".35rem",marginTop:".65rem" }}>{crawlPages.map(p=><span key={p.path} style={{ display:"inline-flex",alignItems:"center",gap:".3rem",fontSize:".7rem",fontWeight:600,padding:".2rem .55rem",borderRadius:"99px",background:p.status==="ok"?"#f0fdf4":p.status==="loading"?"#f0f4ff":"#fff1f2",color:p.status==="ok"?"#166534":p.status==="loading"?"#3730a3":"#be123c",border:`1px solid ${p.status==="ok"?"#bbf7d0":p.status==="loading"?"#c7d2fe":"#fecdd3"}` }}>{p.status==="loading"?"⏳":p.status==="ok"?"✓":"✗"} {p.label}</span>)}</div>}
          </div>
        )}
        {cdMode==="manual"&&(
          <div style={{ padding:"1.15rem 1.5rem",display:"flex",flexDirection:"column",gap:".85rem" }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:".7rem" }}>
              <div><label className="field-label">Company Name <span style={{ color:"#ef4444" }}>*</span></label><input value={cdDraft.name} onChange={e=>setCdDraft(p=>({...p,name:e.target.value}))} placeholder="Acme Corporation" className="field-input"/></div>
              <div><label className="field-label">Industry <span style={{ color:"#ef4444" }}>*</span></label><input value={cdDraft.industry} onChange={e=>setCdDraft(p=>({...p,industry:e.target.value}))} placeholder="e.g. Digital Marketing" className="field-input"/></div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:".7rem" }}>
              <div><label className="field-label">Website URL</label><input type="url" value={cdDraft.websiteUrl} onChange={e=>setCdDraft(p=>({...p,websiteUrl:e.target.value}))} placeholder="https://yoursite.com" className="field-input"/></div>
              <div><label className="field-label">Quote Attribution</label><input value={cdDraft.quoteAttribution} onChange={e=>setCdDraft(p=>({...p,quoteAttribution:e.target.value}))} placeholder="Jane Doe — CEO, Acme Corp" className="field-input"/></div>
            </div>
            <div><label className="field-label">About Company</label><textarea value={cdDraft.about} onChange={e=>setCdDraft(p=>({...p,about:e.target.value}))} placeholder="Brief company description, mission, products or services…" className="field-input" style={{ height:"80px",resize:"vertical",lineHeight:1.6 }}/></div>
            <div><label className="field-label">List of Services</label><textarea value={cdDraft.services||""} onChange={e=>setCdDraft(p=>({...p,services:e.target.value}))} placeholder="e.g. SEO Optimization, Content Marketing…" className="field-input" style={{ height:"70px",resize:"vertical",lineHeight:1.6 }}/></div>
            <div>
              <p style={{ fontSize:".7rem",fontWeight:700,color:"#6366f1",letterSpacing:".08em",marginBottom:".7rem" }}>CONTACT DATA</p>
              <div style={{ display:"flex",flexDirection:"column",gap:".6rem" }}>
                <div><label className="field-label" style={{ display:"flex",alignItems:"center",gap:".35rem" }}><MapPinIcon size={13}/> Address</label><input value={cdDraft.address} onChange={e=>setCdDraft(p=>({...p,address:e.target.value}))} placeholder="123 Main St, City, State, ZIP" className="field-input"/></div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:".7rem" }}>
                  <div><label className="field-label" style={{ display:"flex",alignItems:"center",gap:".35rem" }}><PhoneIcon size={13}/> Phone</label><input type="tel" value={cdDraft.phone} onChange={e=>setCdDraft(p=>({...p,phone:e.target.value}))} placeholder="+1 (555) 000-0000" className="field-input"/></div>
                  <div><label className="field-label" style={{ display:"flex",alignItems:"center",gap:".35rem" }}><MailIcon size={13}/> Email</label><input type="email" value={cdDraft.email} onChange={e=>setCdDraft(p=>({...p,email:e.target.value}))} placeholder="press@yourcompany.com" className="field-input"/></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={{ padding:"1rem 1.5rem",borderTop:"1px solid #f1f5f9",display:"flex",gap:".75rem",justifyContent:"flex-end",background:"#fafafa",borderRadius:"0 0 1rem 1rem" }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          {cdMode==="manual"&&<button onClick={async()=>{ if(!cdDraft.name.trim()||!cdDraft.industry.trim()){showToast("Company Name and Industry are required","error");return;} await onSave(cdDraft); onClose(); showToast("Company data saved!"); }} className="btn-primary"><SaveIcon size={15}/> Save Company Data</button>}
          {cdMode==="ai"&&!isCrawling&&cdDraft.name&&<button onClick={async()=>{ await onSave(cdDraft); onClose(); showToast("Company data saved!"); }} className="btn-primary"><SaveIcon size={15}/> Save Extracted Data</button>}
        </div>
      </div>
    </div>
  );
}
