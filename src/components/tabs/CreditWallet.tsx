import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { XIcon, CartIcon, SparklesIcon, CheckIcon } from "../icons";

const STRIPE_PK     = "pk_live_jem1i1ni1P4sQXEJTkgNSx8z";
const PROXY         = "https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/supabase-proxy";
const CHECKOUT_URL  = "https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/create-checkout-credits";

let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripe = () => { if (!stripePromise) stripePromise = loadStripe(STRIPE_PK); return stripePromise; };

const TIERS = {
  starter:  { label: "Starter",  color: "#6366f1", light: "#eef2ff", price: 397,  outlets: 200,  words: 350,  readers: "2.2M",   authority: 69  },
  standard: { label: "Standard", color: "#8929bd", light: "#f5f3ff", price: 697,  outlets: 300,  words: 500,  readers: "26.4M",  authority: 88  },
  premium:  { label: "Premium",  color: "#d97706", light: "#fffbeb", price: 897,  outlets: 450,  words: 1000, readers: "224.5M", authority: 94  },
} as const;
type Tier = keyof typeof TIERS;

const PACKS = [
  { qty: 3,  label: "3-Pack",  badge: null },
  { qty: 6,  label: "6-Pack",  badge: "Most Popular" },
  { qty: 12, label: "12-Pack", badge: "Best Value" },
];

interface Props { locationId: string; showToast: (msg: string, type?: "success"|"error") => void; }

interface Credits { starter_credits: number; standard_credits: number; premium_credits: number; }

export default function CreditWallet({ locationId, showToast }: Props) {
  const [credits,       setCredits]       = useState<Credits>({ starter_credits:0, standard_credits:0, premium_credits:0 });
  const [loading,       setLoading]       = useState(true);
  const [showPurchase,  setShowPurchase]  = useState(false);
  const [selectedTier,  setSelectedTier]  = useState<Tier>("standard");
  const [selectedQty,   setSelectedQty]   = useState(6);
  const [clientSecret,  setClientSecret]  = useState<string|null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError,   setCheckoutError]   = useState("");

  const loadCredits = async () => {
    setLoading(true);
    try {
      const res  = await fetch(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table:"profiles", operation:"select", eq:{ location_id: locationId } }),
      });
      const data = await res.json();
      if (data.data) setCredits(data.data);
      else setCredits({ starter_credits:0, standard_credits:0, premium_credits:0 });
    } catch { /* use defaults */ }
    setLoading(false);
  };

  useEffect(() => { loadCredits(); }, [locationId]);

  const openPurchase = (tier: Tier) => { setSelectedTier(tier); setSelectedQty(6); setShowPurchase(true); setClientSecret(null); setCheckoutError(""); };

  const startCheckout = async () => {
    setCheckoutLoading(true); setCheckoutError("");
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}&checkout=complete`;
      const res  = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier, quantity: selectedQty, locationId, returnUrl }),
      });
      const data = await res.json();
      if (data.error) { setCheckoutError("Unable to load checkout. Please try again."); }
      else { setClientSecret(data.clientSecret); }
    } catch { setCheckoutError("Could not connect to checkout."); }
    setCheckoutLoading(false);
  };

  const tier = TIERS[selectedTier];
  const pack = PACKS.find(p => p.qty === selectedQty)!;
  const totalPrice = (tier.price * selectedQty).toLocaleString();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ fontWeight:800, fontSize:"1.3rem", color:"#1e293b", margin:0 }}>Credit Wallet</h2>
        <p style={{ color:"#64748b", fontSize:".85rem", margin:".25rem 0 0" }}>Purchase PR credits and launch press releases directly from your balance</p>
      </div>

      {/* Credit Balance Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:"1rem", marginBottom:"2rem" }}>
        {(Object.entries(TIERS) as [Tier, typeof TIERS[Tier]][]).map(([key, t]) => {
          const balance = credits[`${key}_credits`] ?? 0;
          return (
            <div key={key} className="card" style={{ padding:"1.5rem", borderTop:`4px solid ${t.color}`, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, width:80, height:80, background:t.light, borderRadius:"0 0 0 100%", opacity:.6 }}/>
              <div style={{ fontSize:".7rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:t.color, marginBottom:".5rem" }}>{t.label} Package</div>
              <div style={{ fontSize:"3rem", fontWeight:900, color:"#1e293b", lineHeight:1, marginBottom:".25rem" }}>
                {loading ? <span style={{ fontSize:"1.5rem", color:"#94a3b8" }}>…</span> : balance}
              </div>
              <div style={{ fontSize:".78rem", color:"#64748b", marginBottom:"1rem" }}>
                {balance === 1 ? "credit available" : "credits available"}
              </div>
              <div style={{ fontSize:".72rem", color:"#94a3b8", marginBottom:"1rem" }}>
                {t.outlets}+ outlets · {t.words} words · DA {t.authority}
              </div>
              <button
                onClick={() => openPurchase(key)}
                style={{ width:"100%", padding:".6rem", borderRadius:".5rem", border:"none", cursor:"pointer", fontWeight:700, fontSize:".82rem", background: balance > 0 ? t.color : "#f1f5f9", color: balance > 0 ? "white" : "#64748b", transition:"all .15s" }}
                onMouseOver={e => { e.currentTarget.style.opacity=".85"; }}
                onMouseOut={e => { e.currentTarget.style.opacity="1"; }}
              >
                {balance > 0 ? "➕ Add More Credits" : "🚀 Get Started"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Credit Log */}
      <CreditLog locationId={locationId}/>

      {/* Purchase Modal */}
      {showPurchase && (
        <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)" }}>
          <div style={{ background:"white", borderRadius:"1rem", width:"100%", maxWidth:550, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,.25)", position:"relative" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem 1.25rem .85rem", borderBottom:"1px solid #f1f5f9", position:"sticky", top:0, background:"white", zIndex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
                <img src="/logo.png" alt="MBB" style={{ width:28, height:28, objectFit:"contain" }}/>
                <div>
                  <div style={{ fontWeight:700, fontSize:".9rem", color:"#1e293b" }}>Purchase PR Credits</div>
                  <div style={{ fontSize:".7rem", color:"#64748b" }}>Secure Checkout · 256-bit SSL</div>
                </div>
              </div>
              <button onClick={() => { setShowPurchase(false); setClientSecret(null); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:".25rem", display:"flex" }}>
                <XIcon size={18}/>
              </button>
            </div>

            {!clientSecret ? (
              <div style={{ padding:"1.25rem" }}>
                {/* Tier selector */}
                <div style={{ marginBottom:"1rem" }}>
                  <div style={{ fontSize:".75rem", fontWeight:600, color:"#374151", marginBottom:".5rem", textTransform:"uppercase", letterSpacing:".05em" }}>Select Tier</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:".5rem" }}>
                    {(Object.entries(TIERS) as [Tier, typeof TIERS[Tier]][]).map(([key, t]) => (
                      <button key={key} onClick={() => setSelectedTier(key)} style={{ padding:".6rem .5rem", borderRadius:".5rem", border:`2px solid ${selectedTier===key ? t.color : "#e2e8f0"}`, background: selectedTier===key ? t.light : "white", cursor:"pointer", fontWeight:600, fontSize:".8rem", color: selectedTier===key ? t.color : "#64748b", transition:"all .15s" }}>
                        {t.label}<br/><span style={{ fontSize:".68rem", fontWeight:400 }}>${t.price}/ea</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pack selector */}
                <div style={{ marginBottom:"1.25rem" }}>
                  <div style={{ fontSize:".75rem", fontWeight:600, color:"#374151", marginBottom:".5rem", textTransform:"uppercase", letterSpacing:".05em" }}>Select Pack</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:".5rem" }}>
                    {PACKS.map(p => (
                      <button key={p.qty} onClick={() => setSelectedQty(p.qty)} style={{ padding:".75rem .5rem", borderRadius:".5rem", border:`2px solid ${selectedQty===p.qty ? tier.color : "#e2e8f0"}`, background: selectedQty===p.qty ? tier.light : "white", cursor:"pointer", position:"relative", transition:"all .15s" }}>
                        {p.badge && <div style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)", background:tier.color, color:"white", fontSize:".6rem", fontWeight:700, padding:".1rem .4rem", borderRadius:"99px", whiteSpace:"nowrap" }}>{p.badge}</div>}
                        <div style={{ fontWeight:700, fontSize:".9rem", color: selectedQty===p.qty ? tier.color : "#1e293b" }}>{p.qty}</div>
                        <div style={{ fontSize:".7rem", color:"#64748b" }}>credits</div>
                        {(p.qty === 6 || p.qty === 12) && <div style={{ fontSize:".65rem", color:"#10b981", fontWeight:600, marginTop:".2rem" }}>+1 bonus*</div>}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize:".68rem", color:"#94a3b8", marginTop:".5rem" }}>*+1 bonus credit when a promo code is applied on 6 or 12-packs</div>
                </div>

                {/* Summary */}
                <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius:".75rem", padding:"1rem 1.25rem", marginBottom:"1rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ color:"#a5b4fc", fontSize:".7rem", fontWeight:600, marginBottom:".2rem" }}>{tier.label} · {selectedQty}-Pack</div>
                    <div style={{ color:"white", fontSize:".82rem" }}>{selectedQty} PR credits · {tier.outlets}+ outlets each</div>
                  </div>
                  <div style={{ color:"white", fontWeight:900, fontSize:"1.4rem" }}>${totalPrice}</div>
                </div>

                {checkoutError && <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:".5rem", padding:".65rem .9rem", fontSize:".82rem", color:"#be123c", marginBottom:".75rem" }}>{checkoutError}</div>}

                <button onClick={startCheckout} disabled={checkoutLoading} className="btn-primary" style={{ width:"100%", justifyContent:"center", padding:".8rem", fontSize:".95rem", fontWeight:700 }}>
                  {checkoutLoading ? "Preparing checkout…" : `Continue to Payment · $${totalPrice}`}
                </button>
              </div>
            ) : (
              <div style={{ padding:"0" }}>
                <EmbeddedCheckoutProvider stripe={getStripe()} options={{
                  fetchClientSecret: () => Promise.resolve(clientSecret),
                  onComplete: () => {
                    showToast(`${selectedQty} ${tier.label} credits purchased! 🎉`);
                    setShowPurchase(false); setClientSecret(null);
                    setTimeout(loadCredits, 3000); // wait for webhook
                  },
                }}>
                  <EmbeddedCheckout/>
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Credit log sub-component
function CreditLog({ locationId }: { locationId: string }) {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res  = await fetch("https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/supabase-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table:"credit_logs", operation:"select_many", eq:{ location_id: locationId }, order:{ col:"created_at", ascending:false }, limit:20 }),
        });
        const data = await res.json();
        setLogs(data.data ?? []);
      } catch { setLogs([]); }
      setLoading(false);
    };
    load();
  }, [locationId]);

  if (loading) return null;
  if (logs.length === 0) return null;

  return (
    <div className="card" style={{ padding:"1.25rem" }}>
      <h3 style={{ fontWeight:700, fontSize:".95rem", marginBottom:"1rem", color:"#1e293b" }}>Credit History</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
        {logs.map((log, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:".6rem .75rem", background:"#f8fafc", borderRadius:".5rem", fontSize:".82rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
              <span style={{ width:32, height:32, borderRadius:"50%", background: log.change_amount > 0 ? "#dcfce7" : "#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".85rem", flexShrink:0 }}>
                {log.change_amount > 0 ? "➕" : "🚀"}
              </span>
              <div>
                <div style={{ fontWeight:600, color:"#1e293b", textTransform:"capitalize" }}>{log.tier} · {log.reason}</div>
                <div style={{ color:"#94a3b8", fontSize:".72rem" }}>{new Date(log.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <span style={{ fontWeight:700, color: log.change_amount > 0 ? "#10b981" : "#ef4444" }}>
              {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
