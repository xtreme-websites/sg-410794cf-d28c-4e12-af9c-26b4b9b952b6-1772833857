import { useState, useCallback, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { XIcon } from "./icons";
import { PR_PACKAGES } from "../lib/constants";

const STRIPE_PK = "pk_live_jem1i1ni1P4sQXEJTkgNSx8z";
const CHECKOUT_URL = "https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/create-checkout";

let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripe = () => {
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PK);
  return stripePromise;
};

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageType: string;
  prTitle: string;
  locationId: string;
  onOrderComplete: (packageType: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function CheckoutModal({
  isOpen, onClose, packageType, prTitle, locationId, onOrderComplete, showToast,
}: CheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const pkg = PR_PACKAGES[packageType];

  // Auto-start checkout when modal opens
  useEffect(() => {
    if (!isOpen || !packageType || clientSecret) return;
    const start = async () => {
      setLoading(true); setError("");
      try {
        const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}&checkout=complete`;
        const res  = await fetch(CHECKOUT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageType, returnUrl, locationId, prTitle }),
        });
        const data = await res.json();
        if (data.error) setError("Unable to load checkout. Please try again.");
        else setClientSecret(data.clientSecret);
      } catch {
        setError("Could not connect to checkout. Please try again.");
      }
      setLoading(false);
    };
    start();
  }, [isOpen, packageType]);

  const handleClose = () => {
    setClientSecret(null);
    setError("");
    onClose();
  };

  const fetchClientSecret = useCallback(() => Promise.resolve(clientSecret!), [clientSecret]);

  if (!isOpen || !pkg) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)", animation:"fadeIn .2s ease" }}>
      <div style={{ background:"white", borderRadius:"1rem", width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,.25)", animation:"slideUp .25s ease", position:"relative" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem 1.25rem .85rem", borderBottom:"1px solid #f1f5f9", position:"sticky", top:0, background:"white", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
            <img src="/logo.png" alt="MBB" style={{ width:28, height:28, objectFit:"contain" }}/>
            <div>
              <div style={{ fontWeight:700, fontSize:".9rem", color:"#1e293b" }}>Media Blast Boosters™</div>
              <div style={{ fontSize:".7rem", color:"#64748b" }}>Secure Checkout · 256-bit SSL</div>
            </div>
          </div>
          <button onClick={handleClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:".25rem", display:"flex" }}>
            <XIcon size={18}/>
          </button>
        </div>

        {/* Package + PR summary bar */}
        <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", padding:".9rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div>
            <div style={{ fontSize:".65rem", fontWeight:600, letterSpacing:".1em", color:"#a5b4fc", textTransform:"uppercase", marginBottom:".2rem" }}>{packageType} Package</div>
            <div style={{ fontSize:".85rem", color:"white", fontWeight:500, lineHeight:1.3, maxWidth:360 }}>{prTitle}</div>
          </div>
          <div style={{ fontSize:"1.5rem", fontWeight:900, color:"white", flexShrink:0 }}>{pkg.price}</div>
        </div>

        {/* Stripe Embedded Checkout */}
        <div style={{ padding:"1rem 1.25rem 1.25rem" }}>
          {loading && (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"3rem", color:"#64748b", gap:".75rem" }}>
              <div style={{ width:20, height:20, border:"2px solid #e2e8f0", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
              Loading secure checkout…
            </div>
          )}
          {error && (
            <div style={{ background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:".5rem", padding:".75rem 1rem", fontSize:".82rem", color:"#be123c", marginBottom:"1rem", textAlign:"center" }}>
              {error}
              <button onClick={() => { setError(""); setClientSecret(null); }} style={{ display:"block", margin:".5rem auto 0", fontSize:".78rem", color:"#6366f1", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Try again</button>
            </div>
          )}
          {clientSecret && (
            <EmbeddedCheckoutProvider
              stripe={getStripe()}
              options={{
                fetchClientSecret,
                onComplete: () => {
                  onOrderComplete(packageType);
                  showToast("Payment complete! Your PR order has been placed. 🎉");
                  handleClose();
                },
              }}
            >
              <EmbeddedCheckout/>
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    </div>
  );
}
