import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { XIcon } from "../icons";

declare const confetti: any;

const fireConfetti = () => {
  if (typeof confetti === "undefined") return;
  const end = Date.now() + 3 * 1000;
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1", "#8929bd", "#6366f1"];
  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 2, angle: 60,  spread: 55, startVelocity: 60, origin: { x: 0, y: 0.5 }, colors });
    confetti({ particleCount: 2, angle: 120, spread: 55, startVelocity: 60, origin: { x: 1, y: 0.5 }, colors });
    requestAnimationFrame(frame);
  };
  frame();
};

const STRIPE_PK_LIVE = "pk_live_jem1i1ni1P4sQXEJTkgNSx8z";
const STRIPE_PK_TEST = "pk_test_FiKXMJBxEKrQqyMqdAILoROR";
const PROXY          = "https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/supabase-proxy";
const CHECKOUT_URL   = "https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/create-checkout-credits";

const stripePromises: Record<string, ReturnType<typeof loadStripe>> = {};
const getStripe = (pk: string) => { if (!stripePromises[pk]) stripePromises[pk] = loadStripe(pk); return stripePromises[pk]; };

const TIERS = {
  starter:  { label:"Starter",  color:"#6366f1", light:"#eef2ff", outlets:"200+", words:350,  readers:"2.2M",   authority:69 },
  standard: { label:"Standard", color:"#8929bd", light:"#f5f3ff", outlets:"300+", words:500,  readers:"26.4M",  authority:88 },
  premium:  { label:"Premium",  color:"#d97706", light:"#fffbeb", outlets:"450+", words:1000, readers:"224.5M", authority:94 },
} as const;
type Tier = keyof typeof TIERS;

// Per-pack pricing (volume discount per credit)
const PACK_PRICES: Record<Tier, Record<number,number>> = {
  starter:  { 3: 397, 6: 377, 12: 357 },
  standard: { 3: 597, 6: 577, 12: 557 },
  premium:  { 3: 897, 6: 877, 12: 857 },
};

const PACKS = [
  { qty:3,  label:"3-Pack",  discount:null,        discountColor:"" },
  { qty:6,  label:"6-Pack",  discount:"5% Off",    discountColor:"#0ea5e9" },
  { qty:12, label:"12-Pack", discount:"10% Off",   discountColor:"#10b981" },
];

interface Credits { starter_credits:number; standard_credits:number; premium_credits:number; }
interface Props { locationId:string; showToast:(msg:string, type?:"success"|"error")=>void; onNavigateToPR?:()=>void; }

const PENDING_KEY = "mbb_pending_purchase";

export default function CreditWallet({ locationId, showToast, onNavigateToPR }: Props) {
  const [activeTab,       setActiveTab]       = useState<"packages"|"credits"|"transactions">("credits");
  const [credits,         setCredits]         = useState<Credits>({ starter_credits:0, standard_credits:0, premium_credits:0 });
  const [loading,         setLoading]         = useState(true);
  const [checkout,        setCheckout]        = useState<{ tier:Tier; qty:number }|null>(null);
  const [clientSecret,    setClientSecret]    = useState<string|null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError,   setCheckoutError]   = useState("");
  const [testMode,        setTestMode]        = useState(false);
  const [thankYou,        setThankYou]        = useState<{ tier:Tier; qty:number }|null>(null);

  const loadCredits = async () => {
    setLoading(true);
    try {
      const res  = await fetch(PROXY, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ table:"profiles", operation:"select", eq:{ location_id:locationId } }) });
      const data = await res.json();
      if (data.data) setCredits(data.data);
    } catch {}
    setLoading(false);
  };

  // On mount: check for ?checkout=complete redirect from Stripe return_url
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "complete") {
      // Clear the param from URL without reload
      const clean = window.location.search.replace(/[&?]checkout=complete/, "");
      window.history.replaceState({}, "", window.location.pathname + clean);
      // Retrieve pending purchase from sessionStorage
      try {
        const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
        if (pending?.tier && pending?.qty) {
          handlePurchaseComplete(pending.tier, pending.qty, true);
        }
      } catch {}
    }
    loadCredits();
  }, [locationId]);

  const openCheckout = async (tier: Tier, qty: number) => {
    // Save pending purchase so we can recover it after redirect
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ tier, qty }));
    setCheckout({ tier, qty }); setClientSecret(null); setCheckoutError(""); setCheckoutLoading(true);
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}&checkout=complete`;
      const res  = await fetch(CHECKOUT_URL, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tier, quantity:qty, pricePerCredit: PACK_PRICES[tier][qty], locationId, returnUrl }) });
      const data = await res.json();
      if (data.error) setCheckoutError("Unable to load checkout. Please try again.");
      else { setClientSecret(data.clientSecret); setTestMode(!!data.testMode); }
    } catch { setCheckoutError("Could not connect to checkout."); }
    setCheckoutLoading(false);
  };

  const handlePurchaseComplete = async (tier: Tier, qty: number, fromRedirect = false) => {
    sessionStorage.removeItem(PENDING_KEY);
    // Immediately apply credits
    try {
      await fetch(PROXY, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ table:"profiles", operation:"increment_credits", location_id:locationId, tier, amount:qty, reason:"Stripe Purchase" }) });
    } catch {}
    await loadCredits();
    setCheckout(null); setClientSecret(null);
    setThankYou({ tier, qty });
    setActiveTab("credits");
  };

  useEffect(() => {
    if (!thankYou) return;
    fireConfetti();
  }, [thankYou]);

  const t = checkout ? TIERS[checkout.tier] : null;
  const stripePk = testMode ? STRIPE_PK_TEST : STRIPE_PK_LIVE;

  return (
    <div>
      {/* Inner tabs */}
      <div style={{ display:"flex", gap:".25rem", background:"white", borderRadius:".75rem", padding:".35rem", marginBottom:"1.5rem", boxShadow:"0 1px 3px rgba(0,0,0,.06)", border:"1px solid #f1f5f9", width:"fit-content" }}>
        {([["packages","Media Packages"],["credits","Media Credits"],["transactions","Transactions"]] as const).map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ padding:".5rem 1.1rem", borderRadius:".5rem", border:"none", cursor:"pointer", fontWeight:600, fontSize:".82rem", transition:"all .15s",
            background: activeTab===id ? "linear-gradient(135deg,#8929bd,#4338ca)" : "transparent",
            color: activeTab===id ? "white" : "#64748b",
            boxShadow: activeTab===id ? "0 2px 8px rgba(137,41,189,.3)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {/* PACKAGES */}
      {activeTab==="packages" && (
        <div>
          <style>{`
            .pack-card { transition: transform .18s, box-shadow .18s, border-color .18s; }
            .pack-card:hover { transform: translateY(-3px); }
            .pack-card-starter:hover  { box-shadow: 0 8px 28px rgba(99,102,241,.3) !important; border-color: #6366f1 !important; }
            .pack-card-standard:hover { box-shadow: 0 8px 28px rgba(137,41,189,.3) !important; border-color: #8929bd !important; }
            .pack-card-premium:hover  { box-shadow: 0 8px 28px rgba(217,119,6,.3)  !important; border-color: #d97706 !important; }
          `}</style>
          <div style={{ marginBottom:"1.25rem" }}>
            <h2 style={{ fontWeight:800, fontSize:"1.2rem", color:"#1e293b", margin:0 }}>Media Packages</h2>
            <p style={{ color:"#64748b", fontSize:".83rem", margin:".25rem 0 0" }}>Purchase PR credit packs — use anytime to launch press releases</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"2rem" }}>
            {(Object.entries(TIERS) as [Tier, typeof TIERS[Tier]][]).map(([key, ti]) => (
              <div key={key} className="card" style={{ overflow:"hidden" }}>
                <div style={{ background:`linear-gradient(135deg, ${ti.color}18, ${ti.color}06)`, borderBottom:`1px solid ${ti.color}25`, padding:"1rem 1.5rem", display:"flex", alignItems:"center", gap:".75rem" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:ti.color, boxShadow:`0 0 8px ${ti.color}`, flexShrink:0 }}/>
                  <div>
                    <div style={{ fontWeight:800, fontSize:"1.05rem", color:"#1e293b" }}>{ti.label} PR Package</div>
                    <div style={{ fontSize:".75rem", color:"#64748b", marginTop:".1rem" }}>{ti.outlets} outlets · {ti.words} words · {ti.readers} readers · DA {ti.authority}</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem", padding:"1.25rem" }}>
                  {PACKS.map(p => (
                    <div key={p.qty} className={`pack-card pack-card-${key}`} style={{ border:"1.5px solid #e2e8f0", borderRadius:".75rem", padding:"1.25rem", background:"white", position:"relative" }}>
                      {p.discount && (
                        <div style={{ position:"absolute", top:-1, right:-1, background:p.discountColor, color:"white", fontSize:".65rem", fontWeight:800, padding:".2rem .65rem", borderRadius:"0 .75rem 0 .5rem", letterSpacing:".04em" }}>
                          {p.discount}
                        </div>
                      )}
                      <div style={{ marginBottom:"1rem" }}>
                        <div style={{ display:"flex", alignItems:"baseline", gap:".3rem" }}>
                          <span style={{ fontSize:"2.8rem", fontWeight:900, color:ti.color, lineHeight:1 }}>{p.qty}</span>
                          <span style={{ fontSize:".85rem", fontWeight:600, color:"#64748b" }}>credits</span>
                        </div>
                        <div style={{ fontSize:".7rem", color:"#94a3b8", marginTop:".2rem" }}>PR launches included</div>
                      </div>
                      <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:".85rem", marginBottom:".85rem" }}>
                        <div style={{ fontSize:"1.65rem", fontWeight:900, color:"#1e293b", lineHeight:1 }}>${(PACK_PRICES[key][p.qty] * p.qty).toLocaleString()}</div>
                        <div style={{ fontSize:".75rem", color:"#64748b", marginTop:".25rem" }}>${PACK_PRICES[key][p.qty].toLocaleString()} per credit</div>
                      </div>
                      <button onClick={() => openCheckout(key, p.qty)} style={{ width:"100%", padding:".6rem", borderRadius:".45rem", border:"none", cursor:"pointer", fontWeight:700, fontSize:".82rem", background:ti.color, color:"white", transition:"opacity .15s" }}
                        onMouseOver={e=>e.currentTarget.style.opacity=".85"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>
                        Buy Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREDITS */}
      {activeTab==="credits" && (
        <div>
          <div style={{ marginBottom:"1.25rem" }}>
            <h2 style={{ fontWeight:800, fontSize:"1.2rem", color:"#1e293b", margin:0 }}>Media Credits</h2>
            <p style={{ color:"#64748b", fontSize:".83rem", margin:".25rem 0 0" }}>Your available PR launch credits by package tier</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
            {(Object.entries(TIERS) as [Tier, typeof TIERS[Tier]][]).map(([key, ti]) => {
              const bal = credits[`${key}_credits`] ?? 0;
              return (
                <div key={key} className="card" style={{ padding:"1.5rem", borderTop:`4px solid ${ti.color}`, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, right:0, width:72, height:72, background:ti.light, borderRadius:"0 0 0 100%", opacity:.7 }}/>
                  <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:ti.color, marginBottom:".4rem" }}>{ti.label}</div>
                  <div style={{ fontSize:"3rem", fontWeight:900, color:"#1e293b", lineHeight:1, marginBottom:".2rem" }}>
                    {loading ? <span style={{ fontSize:"1.5rem", color:"#94a3b8" }}>…</span> : bal}
                  </div>
                  <div style={{ fontSize:".75rem", color:"#94a3b8", marginBottom:"1rem" }}>credits available</div>
                  <div style={{ fontSize:".7rem", color:"#64748b", marginBottom:"1rem" }}>{ti.outlets} outlets · {ti.words}w · DA {ti.authority}</div>
                  <button onClick={() => setActiveTab("packages")} style={{ width:"100%", padding:".55rem", borderRadius:".45rem", border:`1.5px solid ${ti.color}`, cursor:"pointer", fontWeight:700, fontSize:".78rem", background:"transparent", color:ti.color, transition:"all .15s" }}
                    onMouseOver={e=>{ e.currentTarget.style.background=ti.color; e.currentTarget.style.color="white"; }}
                    onMouseOut={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=ti.color; }}>
                    {bal > 0 ? "➕ Add More" : "🚀 Get Started"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      {activeTab==="transactions" && <TransactionLog locationId={locationId}/>}

      {/* CHECKOUT MODAL */}
      {checkout && (
        <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)" }}>
          <div style={{ background:"white", borderRadius:"1rem", width:"100%", maxWidth:550, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,.25)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem 1.25rem .85rem", borderBottom:"1px solid #f1f5f9", position:"sticky", top:0, background:"white", zIndex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
                <img src="/logo.png" alt="MBB" style={{ width:28, height:28, objectFit:"contain" }}/>
                <div>
                  <div style={{ fontWeight:700, fontSize:".9rem", color:"#1e293b" }}>Media Blast Boosters™</div>
                  <div style={{ fontSize:".7rem", color:"#64748b" }}>Secure Checkout · 256-bit SSL</div>
                </div>
              </div>
              <button onClick={() => { setCheckout(null); setClientSecret(null); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:".25rem", display:"flex" }}><XIcon size={18}/></button>
            </div>
            {t && (
              <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", padding:".9rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
                <div>
                  <div style={{ color:"#a5b4fc", fontSize:".68rem", fontWeight:600, textTransform:"uppercase", letterSpacing:".08em", marginBottom:".2rem" }}>{t.label} · {checkout.qty}-Pack</div>
                  <div style={{ color:"white", fontSize:".82rem" }}>{checkout.qty} PR Credits · {t.outlets} outlets each</div>
                </div>
                <div style={{ color:"white", fontWeight:900, fontSize:"1.4rem", flexShrink:0 }}>${(PACK_PRICES[checkout.tier][checkout.qty] * checkout.qty).toLocaleString()}</div>
              </div>
            )}
            <div>
              {checkoutLoading && (
                <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"3rem", color:"#64748b", gap:".75rem" }}>
                  <div style={{ width:20, height:20, border:"2px solid #e2e8f0", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
                  Loading secure checkout…
                </div>
              )}
              {checkoutError && (
                <div style={{ padding:"1.25rem" }}>
                  <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:".5rem", padding:".75rem 1rem", fontSize:".82rem", color:"#be123c", textAlign:"center" }}>
                    {checkoutError}
                    <button onClick={() => { setCheckoutError(""); if(checkout) openCheckout(checkout.tier, checkout.qty); }} style={{ display:"block", margin:".5rem auto 0", fontSize:".78rem", color:"#6366f1", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Try again</button>
                  </div>
                </div>
              )}
              {clientSecret && (
                <>
                  {testMode && (
                    <div style={{ margin:".75rem 1.25rem 0", background:"#fef3c7", border:"1px solid #f59e0b", borderRadius:".4rem", padding:".4rem .75rem", fontSize:".72rem", fontWeight:700, color:"#92400e", display:"flex", alignItems:"center", gap:".4rem" }}>
                      🧪 TEST MODE — card: 4242 4242 4242 4242 · exp 12/34 · CVC 123
                    </div>
                  )}
                  <EmbeddedCheckoutProvider stripe={getStripe(stripePk)} options={{
                    fetchClientSecret: () => Promise.resolve(clientSecret),
                    onComplete: () => handlePurchaseComplete(checkout!.tier, checkout!.qty),
                  }}>
                    <EmbeddedCheckout/>
                  </EmbeddedCheckoutProvider>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── THANK YOU MODAL ── */}
      {thankYou && (() => {
        const ti = TIERS[thankYou.tier];
        const total = (PACK_PRICES[thankYou.tier][thankYou.qty] * thankYou.qty).toLocaleString();
        const newBal = (credits[`${thankYou.tier}_credits`] ?? 0);
        return (
          <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.6)", backdropFilter:"blur(6px)", animation:"fadeIn .2s ease" }}>
            <div style={{ background:"white", borderRadius:"1.25rem", width:"100%", maxWidth:440, padding:"2.5rem", textAlign:"center", boxShadow:"0 32px 80px rgba(0,0,0,.3)", animation:"slideUp .25s ease", position:"relative", zIndex:1001 }}>
              <div style={{ width:80, height:80, borderRadius:"50%", background:`linear-gradient(135deg, ${ti.color}22, ${ti.color}44)`, border:`3px solid ${ti.color}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1.25rem", fontSize:"2.2rem" }}>
                🎉
              </div>
              <h2 style={{ fontWeight:900, fontSize:"1.4rem", color:"#1e293b", margin:"0 0 .5rem" }}>Payment Successful!</h2>
              <p style={{ color:"#64748b", fontSize:".88rem", margin:"0 0 1.5rem", lineHeight:1.6 }}>
                Your <strong>{thankYou.qty} {ti.label} PR Credits</strong> have been added to your wallet.
              </p>
              <div style={{ background:`linear-gradient(135deg, ${ti.color}12, ${ti.color}06)`, border:`1px solid ${ti.color}30`, borderRadius:".75rem", padding:"1rem 1.25rem", marginBottom:"1.5rem", textAlign:"left" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".5rem" }}>
                  <span style={{ fontSize:".78rem", color:"#64748b" }}>Credits purchased</span>
                  <span style={{ fontWeight:800, color:ti.color, fontSize:"1rem" }}>+{thankYou.qty}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".5rem" }}>
                  <span style={{ fontSize:".78rem", color:"#64748b" }}>Amount charged</span>
                  <span style={{ fontWeight:700, color:"#1e293b" }}>${total}</span>
                </div>
                <div style={{ height:"1px", background:"#f1f5f9", margin:".5rem 0" }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:".78rem", color:"#64748b" }}>{ti.label} balance now</span>
                  <span style={{ fontWeight:900, color:ti.color, fontSize:"1.1rem" }}>{newBal > 0 ? newBal : thankYou.qty} credits</span>
                </div>
              </div>
              <button onClick={() => { setThankYou(null); onNavigateToPR?.(); }} style={{ width:"100%", padding:".75rem", borderRadius:".6rem", border:"none", cursor:"pointer", fontWeight:700, fontSize:".9rem", background:`linear-gradient(135deg, ${ti.color}, ${ti.color}cc)`, color:"white", boxShadow:`0 4px 14px ${ti.color}50`, transition:"opacity .15s" }}
                onMouseOver={e=>e.currentTarget.style.opacity=".85"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>
                Start Using My Credits 🚀
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Transactions ────────────────────────────────────────────────────────────
function TransactionLog({ locationId }: { locationId: string }) {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res  = await fetch(PROXY, { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ table:"credit_logs", operation:"select_many", eq:{ location_id:locationId }, order:{ col:"created_at", ascending:false }, limit:50 }) });
        const data = await res.json();
        setLogs(data.data ?? []);
      } catch { setLogs([]); }
      setLoading(false);
    };
    load();
  }, [locationId]);

  const TIER_COLORS: Record<string,string> = { starter:"#6366f1", standard:"#8929bd", premium:"#d97706" };
  const REASON_ICON: Record<string,string>  = { "Stripe Purchase":"💳", "PR Launch":"🚀", "Promotion Bonus":"🎁", "System Bonus":"⭐" };

  return (
    <div>
      <div style={{ marginBottom:"1.25rem" }}>
        <h2 style={{ fontWeight:800, fontSize:"1.2rem", color:"#1e293b", margin:0 }}>Transactions</h2>
        <p style={{ color:"#64748b", fontSize:".83rem", margin:".25rem 0 0" }}>Full history of credit purchases, bonuses and PR launches</p>
      </div>
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"3rem", color:"#94a3b8" }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div className="card" style={{ padding:"3rem", textAlign:"center", color:"#94a3b8" }}>
          <div style={{ fontSize:"2rem", marginBottom:".75rem" }}>📋</div>
          <div style={{ fontWeight:600 }}>No transactions yet</div>
          <div style={{ fontSize:".82rem", marginTop:".25rem" }}>Credit purchases and PR launches will appear here</div>
        </div>
      ) : (
        <div className="card" style={{ overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:"1rem", padding:".65rem 1rem", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", fontSize:".7rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em" }}>
            <span>Description</span><span>Tier</span><span>Credits</span><span>Date</span>
          </div>
          {logs.map((log, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:"1rem", padding:".85rem 1rem", borderBottom: i<logs.length-1 ? "1px solid #f8fafc" : "none", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:".65rem" }}>
                <span style={{ width:32, height:32, borderRadius:"50%", background: log.change_amount>0 ? "#f0fdf4" : "#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".9rem", flexShrink:0 }}>
                  {REASON_ICON[log.reason] ?? "📝"}
                </span>
                <span style={{ fontSize:".83rem", fontWeight:600, color:"#1e293b" }}>{log.reason}</span>
              </div>
              <span style={{ fontSize:".73rem", fontWeight:700, textTransform:"capitalize", color:TIER_COLORS[log.tier] ?? "#64748b", background: log.tier==="starter" ? "#eef2ff" : log.tier==="standard" ? "#f5f3ff" : "#fffbeb", padding:".2rem .55rem", borderRadius:"99px" }}>
                {log.tier}
              </span>
              <span style={{ fontSize:".9rem", fontWeight:800, color: log.change_amount>0 ? "#10b981" : "#ef4444", textAlign:"right" }}>
                {log.change_amount>0 ? `+${log.change_amount}` : log.change_amount}
              </span>
              <span style={{ fontSize:".72rem", color:"#94a3b8", whiteSpace:"nowrap" }}>
                {new Date(log.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
