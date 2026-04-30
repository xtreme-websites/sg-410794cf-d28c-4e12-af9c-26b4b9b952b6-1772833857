import { useState } from "react";
import { store } from "../lib/ai";
import { XIcon, SaveIcon, SparklesIcon } from "./icons";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  customPRPrompt: string;
  onSave: (settings: { webhookUrl: string; customPRPrompt: string }) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function SettingsModal({ isOpen, onClose, webhookUrl, customPRPrompt, onSave, showToast }: SettingsModalProps) {
  const [webhookDraft,      setWebhookDraft]      = useState(webhookUrl);
  const [customPromptDraft, setCustomPromptDraft] = useState(customPRPrompt);

  if (!isOpen) return null;

  const saveWebhook = async () => {
    const u = webhookDraft.trim();
    onSave({ webhookUrl: u, customPRPrompt });
    try { await store.set("mbb:webhookUrl", u); } catch {}
    showToast(u ? "Webhook saved!" : "Webhook cleared");
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:"1rem" }}>
      <div className="card modal-panel" style={{ maxWidth:"640px",width:"100%",padding:"1.5rem",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem" }}>
          <h2 className="font-display" style={{ fontSize:"1.15rem",fontWeight:700 }}>Settings</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#94a3b8" }}><XIcon size={19}/></button>
        </div>

        {/* Outbound Webhook */}
        <div style={{ background:"#f8faff",border:"1px solid #e0e7ff",borderRadius:".75rem",padding:"1.1rem 1.15rem",marginBottom:"1rem" }}>
          <div style={{ display:"flex",alignItems:"center",gap:".5rem",marginBottom:".4rem" }}>
            <span style={{ fontSize:"1rem" }}>🔗</span>
            <h3 style={{ fontWeight:700,fontSize:".95rem",margin:0 }}>Outbound Webhook</h3>
            {webhookUrl&&<span style={{ marginLeft:"auto",background:"#f0fdf4",color:"#166534",border:"1px solid #bbf7d0",borderRadius:"99px",fontSize:".7rem",fontWeight:600,padding:".15rem .6rem" }}>✓ Active</span>}
          </div>
          <p style={{ fontSize:".77rem",color:"#64748b",marginBottom:".75rem" }}>Fired on every order with full PR content + order data. Works with Make, Zapier, HighLevel workflows, or any HTTP endpoint.</p>
          <div style={{ fontSize:".72rem",color:"#94a3b8",marginBottom:".65rem",fontFamily:"monospace",background:"#f1f5f9",padding:".5rem .75rem",borderRadius:".4rem" }}>Payload: event, location_id, order_id, pr_title, package, price, pr_content, company_name, industry, timestamp</div>
          <div style={{ display:"flex",gap:".6rem" }}>
            <input type="url" value={webhookDraft} onChange={e=>setWebhookDraft(e.target.value)} placeholder="https://hook.make.com/... or https://hooks.zapier.com/..." className="field-input" style={{ flex:1,fontSize:".82rem" }}/>
            <button onClick={saveWebhook} className="btn-primary" style={{ flexShrink:0,padding:".6rem 1rem" }}><SaveIcon size={14}/> Save</button>
          </div>
        </div>

        {/* Custom PR Prompt */}
        <div style={{ borderTop:"1px solid #f1f5f9",paddingTop:"1.15rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".5rem" }}>
            <div style={{ flex:1 }}>
              <h3 style={{ fontWeight:700,fontSize:".95rem",marginBottom:".2rem",display:"flex",gap:".5rem",alignItems:"center" }}><SparklesIcon size={16}/> Custom PR Prompt</h3>
              <p style={{ fontSize:".77rem",color:"#64748b" }}>Placeholders: {"{companyName}, {industry}, {websiteUrl}, {mainFocus}, {theme}, {targetWords}, {keywordsText}, {about}, {quote}, {quoteAttribution}"}</p>
            </div>
            <button onClick={()=>setCustomPromptDraft("")} style={{ fontSize:".75rem",color:"#6366f1",fontWeight:600,background:"none",border:"none",cursor:"pointer",whiteSpace:"nowrap",marginLeft:"1rem" }}>Reset</button>
          </div>
          <textarea value={customPromptDraft} onChange={e=>setCustomPromptDraft(e.target.value)} placeholder="Leave blank to use the default AI prompt..." className="field-input" style={{ fontFamily:"monospace",fontSize:".78rem",height:"160px",resize:"vertical" }}/>
        </div>

        <div style={{ marginTop:"1.15rem",display:"flex",justifyContent:"flex-end",gap:".75rem" }}>
          <button onClick={()=>{ onSave({ webhookUrl, customPRPrompt: customPromptDraft }); showToast("Settings saved!"); onClose(); }} className="btn-primary"><SaveIcon size={14}/> Save All</button>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
