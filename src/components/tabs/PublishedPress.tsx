import { useState } from "react";
import { XIcon } from "../icons";
import { Order } from "../../lib/constants";

interface Props {
  orders: Order[];
  locationId: string;
}

const STATUS_CONFIG: Record<string, { label:string; color:string; bg:string }> = {
  pending:     { label:"Pending Review", color:"#92400e", bg:"#fef3c7" },
  reviewing:   { label:"In Review",      color:"#1d4ed8", bg:"#dbeafe" },
  approved:    { label:"Approved",       color:"#065f46", bg:"#d1fae5" },
  published:   { label:"Published",      color:"#7c3aed", bg:"#ede9fe" },
  rejected:    { label:"Revision Needed",color:"#991b1b", bg:"#fee2e2" },
};

export default function PublishedPress({ orders, locationId }: Props) {
  const [articleModal, setArticleModal] = useState<Order | null>(null);

  if (orders.length === 0) return (
    <div>
      <div style={{ marginBottom:"1.25rem" }}>
        <h2 style={{ fontWeight:800, fontSize:"1.2rem", color:"#1e293b", margin:0 }}>Published Press</h2>
        <p style={{ color:"#64748b", fontSize:".83rem", margin:".25rem 0 0" }}>Track the status of your submitted press releases</p>
      </div>
      <div className="card" style={{ padding:"3rem", textAlign:"center", color:"#94a3b8" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:".75rem" }}>📰</div>
        <div style={{ fontWeight:600, fontSize:"1rem", color:"#1e293b", marginBottom:".35rem" }}>No press releases yet</div>
        <div style={{ fontSize:".83rem" }}>Submit your first press release from Media Content to see it here</div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:"1.25rem" }}>
        <h2 style={{ fontWeight:800, fontSize:"1.2rem", color:"#1e293b", margin:0 }}>Published Press</h2>
        <p style={{ color:"#64748b", fontSize:".83rem", margin:".25rem 0 0" }}>Track the status of your submitted press releases</p>
      </div>

      <div className="card" style={{ overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto auto auto auto", gap:"1rem", padding:".65rem 1rem", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", fontSize:".7rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em", alignItems:"center" }}>
          <span>Package</span><span>PR Title</span><span>Date</span><span>Time</span><span>Article</span><span>Status</span><span>Report</span>
        </div>

        {orders.map((order, i) => {
          const status = (order as any).status ?? "pending";
          const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
          const dt = new Date(order.date);
          return (
            <div key={order.id} style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto auto auto auto", gap:"1rem", padding:".85rem 1rem", borderBottom: i<orders.length-1 ? "1px solid #f8fafc" : "none", alignItems:"center" }}>
              {/* Package */}
              <span style={{ fontSize:".72rem", fontWeight:700, color: order.productName==="Starter" ? "#6366f1" : order.productName==="Standard" ? "#8929bd" : "#d97706",
                background: order.productName==="Starter" ? "#eef2ff" : order.productName==="Standard" ? "#f5f3ff" : "#fffbeb",
                padding:".2rem .55rem", borderRadius:"99px", whiteSpace:"nowrap" }}>
                {order.productName}
              </span>

              {/* PR Title */}
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:".83rem", color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{order.prTitle}</div>
              </div>

              {/* Date */}
              <span style={{ fontSize:".72rem", color:"#94a3b8", whiteSpace:"nowrap" }}>
                {isNaN(dt.getTime()) ? order.date : dt.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
              </span>

              {/* Time */}
              <span style={{ fontSize:".72rem", color:"#94a3b8", whiteSpace:"nowrap" }}>
                {isNaN(dt.getTime()) ? "—" : dt.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true})}
              </span>

              {/* Article button */}
              <button onClick={() => setArticleModal(order)} style={{ background:"#eef2ff", color:"#6366f1", border:"none", borderRadius:".4rem", padding:".3rem .65rem", fontSize:".72rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                View
              </button>

              {/* Status */}
              <span style={{ fontSize:".72rem", fontWeight:700, color:sc.color, background:sc.bg, padding:".2rem .55rem", borderRadius:"99px", whiteSpace:"nowrap" }}>
                {sc.label}
              </span>

              {/* Report */}
              {status === "published" ? (
                <button style={{ background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0", borderRadius:".4rem", padding:".3rem .65rem", fontSize:".72rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                  Report
                </button>
              ) : (
                <span style={{ fontSize:".72rem", color:"#e2e8f0", textAlign:"center" }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Article Modal */}
      {articleModal && (
        <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.6)", backdropFilter:"blur(4px)", padding:"1.5rem" }}>
          <div style={{ background:"white", borderRadius:"1rem", width:"100%", maxWidth:720, maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 32px 80px rgba(0,0,0,.3)" }}>
            {/* Modal header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem 1.25rem", borderBottom:"1px solid #f1f5f9", flexShrink:0 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:".95rem", color:"#1e293b" }}>{articleModal.prTitle}</div>
                <div style={{ fontSize:".72rem", color:"#94a3b8", marginTop:".15rem" }}>{articleModal.productName} · {articleModal.date}</div>
              </div>
              <button onClick={() => setArticleModal(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:".25rem", display:"flex" }}>
                <XIcon size={18}/>
              </button>
            </div>
            {/* Content */}
            <div className="prose" style={{ overflowY:"auto", padding:"1.5rem", maxWidth:"none" }}
              dangerouslySetInnerHTML={{ __html: articleModal.prContent ?? "<p>Content not available.</p>" }}/>
          </div>
        </div>
      )}
    </div>
  );
}
