"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

// ---------------- Types ----------------
type Plan = {
  id: number;
  code: string;
  name: string;
  credits: number;
  price: string;
  currency: string;
  durationDays: number;
};

type MySub = {
  active: boolean;
  planId: number | null;
  expiresAt: string | null;
};

type Wallet = {
  credits: number;
  updatedAt?: string;
};

// ---------------- Helpers ----------------
function money(price: string, currency: string) {
  const n = Number(price);
  if (!Number.isFinite(n)) return `${price} ${currency}`;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

// NOTE: This is the simplest redirect approval flow.
// If you already use PayPal Buttons SDK, we can plug it in later.
function getPaypalApproveUrl(providerOrderId: string) {
  // Works for classic approval redirect in many setups.
  // In production you usually return approval link from PayPal createOrder response.
  // Since your backend returns only providerOrderId, we use this fallback.
  return `https://www.paypal.com/checkoutnow?token=${providerOrderId}`;
}

// ---------------- Page ----------------
export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySub, setMySub] = useState<MySub | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [err, setErr] = useState("");

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [pRes, sRes] = await Promise.all([
        api.get<Plan[]>("/subscriptions/plans"),
        api.get<MySub>("/subscriptions/me"),
      ]);

      setPlans(pRes.data || []);
      setMySub(sRes.data || null);

      // wallet is optional
      try {
        const wRes = await api.get<Wallet>("/wallet/me");
        setWallet(wRes.data);
      } catch {
        setWallet(null);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const activePlan = useMemo(() => {
    if (!mySub?.active || !mySub.planId) return null;
    return plans.find((p) => p.id === mySub.planId) || null;
  }, [mySub, plans]);

  async function buy(plan: Plan) {
    setBuyingId(plan.id);
    setErr("");
    try {
      // 1) create paypal order for that plan
     const res = await api.post<{ providerOrderId: string; approveUrl: string }>(
  `/subscriptions/paypal/${plan.id}`
);

window.location.href = res.data.approveUrl;

    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to start PayPal checkout.");
    } finally {
      setBuyingId(null);
    }
  }

  // OPTIONAL:
  // If you set PayPal return_url to something like /subscriptions/success?token=PAYPAL_ORDER_ID
  // then this page can auto-capture.
  async function captureIfTokenInUrl() {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token"); // PayPal returns token in many flows
    if (!token) return;

    try {
      await api.post(`/subscriptions/paypal/capture/${token}`);
      // clean url
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
      await loadAll();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Capture failed.");
    }
  }

  useEffect(() => {
    captureIfTokenInUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Subscriptions</h1>
          <div style={S.sub}>Buy credits monthly. Plans are loaded from backend.</div>
        </div>
        <a style={S.btn} href="/customer/dashboard">Dashboard</a>
      </header>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? <div style={S.card}><b>⚠️</b> {err}</div> : null}

      {/* Current status */}
      <div style={S.card}>
        <div style={S.row}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Your status</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>
              {mySub?.active && activePlan ? (
                <>
                  Active: <b>{activePlan.name}</b> • expires{" "}
                  <b>{mySub.expiresAt ? new Date(mySub.expiresAt).toLocaleString() : "—"}</b>
                </>
              ) : (
                <>No active subscription</>
              )}
            </div>
          </div>

          <div style={S.pill}>
            Credits: <b style={{ marginLeft: 6 }}>{wallet?.credits ?? "—"}</b>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div style={S.grid}>
        {plans.map((p) => (
          <div key={p.id} style={S.planCard}>
            <div style={S.planTop}>
              <div>
                <div style={S.planName}>{p.name}</div>
                <div style={S.planCode}>{p.code}</div>
              </div>
              <div style={S.price}>{money(p.price, p.currency)}</div>
            </div>

            <div style={S.meta}>
              <div>Credits: <b>{p.credits}</b></div>
              <div>Duration: <b>{p.durationDays} days</b></div>
            </div>

            <button
              style={{
                ...S.buyBtn,
                opacity: buyingId === p.id ? 0.6 : 1,
                cursor: buyingId === p.id ? "not-allowed" : "pointer",
              }}
              onClick={() => buy(p)}
              disabled={buyingId === p.id}
            >
              {buyingId === p.id ? "Starting PayPal…" : "Buy with PayPal"}
            </button>

            {activePlan?.id === p.id ? (
              <div style={S.activeTag}>Your current plan</div>
            ) : null}
          </div>
        ))}
      </div>

      <div style={S.small}>
        Note: For the cleanest PayPal flow, your backend should return the PayPal <b>approval link</b> from PayPal API
        (not only providerOrderId). If you want, I’ll show the exact backend change.
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: 24, background: "#0b0f19", color: "#fff", fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial" },
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 },
  title: { margin: 0, fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.85 },
  btn: { background: "rgba(255,255,255,0.10)", color: "#fff", padding: "10px 12px", borderRadius: 14, fontWeight: 800, textDecoration: "none" },

  card: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: 16, marginBottom: 14 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  pill: { display: "inline-flex", alignItems: "center", padding: "10px 12px", borderRadius: 999, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)", fontWeight: 900 },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 },

  planCard: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: 16, position: "relative" },
  planTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  planName: { fontSize: 18, fontWeight: 950 },
  planCode: { opacity: 0.7, fontWeight: 800, marginTop: 4, fontSize: 12 },
  price: { fontWeight: 950, fontSize: 18 },

  meta: { marginTop: 12, opacity: 0.9, display: "grid", gap: 6 },
  buyBtn: { marginTop: 14, width: "100%", padding: "12px 12px", borderRadius: 14, border: "none", fontWeight: 950, background: "#3cffb1", color: "#061017" },
  activeTag: { position: "absolute", top: 12, right: 12, padding: "6px 10px", borderRadius: 999, background: "rgba(60,255,177,0.18)", border: "1px solid rgba(60,255,177,0.30)", fontWeight: 900, fontSize: 12, color: "#c8ffe7" },

  small: { marginTop: 14, opacity: 0.8, fontSize: 12 },
};
