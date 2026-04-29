import { useState } from "react";
import { Order } from "../../lib/constants";
import { CartIcon, BriefIcon, XIcon } from "../icons";

interface OrdersProps {
  orders: Order[];
  showThankYou: boolean;
  onNavigateToPR: () => void;
}

export default function Orders({ orders, showThankYou, onNavigateToPR }: OrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <div className="animate-fadein">
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 className="font-display" style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: ".2rem" }}>PR Orders</h2>
        <p style={{ color: "#64748b", fontSize: ".875rem" }}>Your press release distribution orders</p>
      </div>

      {showThankYou && (
        <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #86efac", borderRadius: ".875rem", padding: "1.25rem", marginBottom: "1.25rem" }}>
          <h3 style={{ fontWeight: 700, color: "#166534", marginBottom: ".35rem" }}>🎉 Order Placed!</h3>
          <p style={{ fontSize: ".875rem", color: "#15803d" }}>Your press release has been submitted for distribution.</p>
        </div>
      )}

      {orders.length > 0 ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["PR Title", "Package", "Price", "Date", ""].map(h => (
                  <th key={h} style={{ padding: ".75rem 1rem", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: ".78rem", letterSpacing: ".04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: ".875rem 1rem", fontWeight: 500, color: "#0f172a", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.prTitle}</td>
                  <td style={{ padding: ".875rem 1rem", color: "#475569" }}>{o.productName}</td>
                  <td style={{ padding: ".875rem 1rem" }}>
                    <span style={{ background: "#f0fdf4", color: "#166534", fontWeight: 600, padding: ".2rem .6rem", borderRadius: "99px", fontSize: ".78rem" }}>{o.price}</span>
                  </td>
                  <td style={{ padding: ".875rem 1rem", color: "#94a3b8", fontSize: ".82rem" }}>{o.date}</td>
                  <td style={{ padding: ".875rem 1rem" }}>
                    <button onClick={() => setSelectedOrder(o)} style={{ color: "#6366f1", fontSize: ".78rem", fontWeight: 600, background: "none", border: "1px solid #c7d2fe", borderRadius: ".35rem", padding: ".25rem .6rem", cursor: "pointer" }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "5rem 0", gap: "1rem" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CartIcon size={36}/>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 600, color: "#334155", marginBottom: ".35rem" }}>No orders yet</p>
            <p style={{ color: "#94a3b8", fontSize: ".875rem" }}>Generate a press release and distribute it.</p>
          </div>
          <button onClick={onNavigateToPR} className="btn-primary">
            <BriefIcon size={15}/> Create a Press Release
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div className="card" style={{ maxWidth: "760px", width: "100%", padding: "1.5rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700 }}>{selectedOrder.prTitle}</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <XIcon size={19}/>
              </button>
            </div>
            <div className="prose" style={{ padding: "1rem", background: "#f8fafc", borderRadius: ".6rem", border: "1px solid #e2e8f0" }}
              dangerouslySetInnerHTML={{ __html: selectedOrder.prContent }}/>
          </div>
        </div>
      )}
    </div>
  );
}
