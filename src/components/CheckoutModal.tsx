import { useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { XIcon } from "./icons";
import { PR_PACKAGES } from "../lib/constants";

// Stripe publishable key — safe to expose client-side
const STRIPE_PK = "pk_live_51..."; // ← REPLACE with your Stripe publishable key

let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripe = () => {
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PK);
  return stripePromise;
};

const CHECKOUT_URL = "https://rsaoscgotumlvsbzwdiy.supabase.co/functions/v1/create-checkout";

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
  const [coupon,      setCoupon]      = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [stripeReady, setStripeReady] = useState(false);

  const pkg = PR_PACKAGES[packageType];

  const handleClose = () => {
    setClientSecret(null);
    setCoupon("");
    setError("");
    setStripeReady(false);
    onClose();
  };

  const startCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}&checkout=complete`;
      const res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType, couponCode: coupon.trim(), returnUrl, locationId, prTitle }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.includes("No such coupon") ? "Invalid promo code — please check and try again." : data.error);
      } else {
        setClientSecret(data.clientSecret);
      }
    } catch {
      setError("Could not connect to checkout. Please try again.");
    }
    setLoading(false);
  };

  const fetchClientSecret = useCallback(() => Promise.resolve(clientSecret!), [clientSecret]);

  if (!isOpen || !pkg) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", animation: "fadeIn .2s ease" }}>
      <div style={{ background: "white", borderRadius: "1rem", width: "100%", maxWidth: clientSecret ? 620 : 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.25)", animation: "slideUp .25s ease", position: "relative" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
            <img src="/logo.png" alt="MBB" style={{ width: 32, height: 32, objectFit: "contain" }}/>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>Media Blast Boosters™</div>
              <div style={{ fontSize: ".75rem", color: "#64748b" }}>Secure Checkout</div>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: ".25rem", display: "flex" }}>
            <XIcon size={20}/>
          </button>
        </div>

        {!clientSecret ? (
          <div style={{ padding: "1.5rem" }}>
            {/* Package summary */}
            <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", borderRadius: ".75rem", padding: "1.25rem", marginBottom: "1.25rem", color: "white" }}>
              <div style={{ fontSize: ".7rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#a5b4fc", marginBottom: ".35rem" }}>Selected Package</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: ".25rem" }}>{packageType} PR Package</div>
              <div style={{ fontSize: ".8rem", color: "#c7d2fe", marginBottom: ".75rem" }}>{pkg.outlets}+ outlets · {pkg.readers} readers · DA {pkg.authority}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: ".35rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 900 }}>{pkg.price}</span>
                <span style={{ fontSize: ".8rem", color: "#a5b4fc" }}>one-time</span>
              </div>
            </div>

            {/* PR title preview */}
            {prTitle && (
              <div style={{ background: "#f8fafc", borderRadius: ".5rem", padding: ".75rem 1rem", marginBottom: "1.25rem", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: ".7rem", fontWeight: 600, color: "#64748b", marginBottom: ".25rem", textTransform: "uppercase", letterSpacing: ".05em" }}>Press Release</div>
                <div style={{ fontSize: ".85rem", color: "#1e293b", fontWeight: 500, lineHeight: 1.4 }}>{prTitle}</div>
              </div>
            )}

            {/* Promo code */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600, color: "#374151", marginBottom: ".4rem" }}>Promo Code (optional)</label>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <input
                  value={coupon}
                  onChange={e => { setCoupon(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="Enter code"
                  className="field-input"
                  style={{ flex: 1, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}
                  onKeyDown={e => e.key === "Enter" && startCheckout()}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: ".5rem", padding: ".65rem .9rem", fontSize: ".82rem", color: "#be123c", marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            <button
              onClick={startCheckout}
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: ".85rem", fontSize: "1rem", fontWeight: 700 }}
            >
              {loading ? "Preparing checkout…" : `Continue to Payment · ${pkg.price}`}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", marginTop: ".75rem" }}>
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="6" width="10" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.2"/><path d="M3 6V4a3 3 0 016 0v2" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/></svg>
              <span style={{ fontSize: ".72rem", color: "#94a3b8" }}>Secured by Stripe · 256-bit SSL encryption</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: "1rem" }}>
            {!stripeReady && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "3rem", color: "#64748b", gap: ".75rem" }}>
                <div style={{ width: 20, height: 20, border: "2px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }}/>
                Loading secure checkout…
              </div>
            )}
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
              <EmbeddedCheckout onReady={() => setStripeReady(true)}/>
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
