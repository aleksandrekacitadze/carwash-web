"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

declare global {
  interface Window {
    paypal?: any;
  }
}

type Plan = {
  id: number;
  name: string;
  price: string;    // "9.99"
  currency: string; // "USD"
  // credits?: number (optional)
};

function loadPaypalSdk(currency = "USD"): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve();

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) return reject(new Error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID"));

    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load PayPal SDK"));
    document.body.appendChild(s);
  });
}

export default function CreditsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Plan | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  async function load() {
    try {
      const p = await api.get<Plan[]>("/subscriptions/plans");
      setPlans(p.data || []);
      setErr("");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load plans");
    }
  }

async function loadWallet() {
  try {
    const w = await api.get<{
      balance: number;
      credits: number;
    }>("/wallet/me");

    setWallet(w.data);
  } catch {
    setWallet(null);
  }
}


  useEffect(() => {
    load();
    loadWallet();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadPaypalSdk("USD");
        setSdkReady(true);
      } catch (e: any) {
        setErr(e?.message || "PayPal SDK error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!sdkReady) return;
    if (!selected) return;
    if (!window.paypal) return;

    const el = document.getElementById("paypal-subscription");
    if (!el) return;
    el.innerHTML = "";

    window.paypal
      .Buttons({
        createOrder: async () => {
          // backend creates PayPal order for plan
         const res = await api.post<{ providerOrderId: string }>(
  `/subscriptions/paypal/${selected.id}`
);

return res.data.providerOrderId;

        },
        onApprove: async (data: any) => {
          // capture + activate subscription (your controller)
          await api.post(`/subscriptions/paypal/capture/${data.orderID}`);
          alert("✅ Subscription purchased. Credits added!");
          await loadWallet();
        },
        onError: (e: any) => {
          console.error(e);
          alert("❌ PayPal error");
        },
      })
      .render("#paypal-subscription");
  }, [sdkReady, selected]);

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Buy Credits</h1>
          <div style={S.sub}>Subscriptions → credits in wallet</div>
        </div>
        <div style={S.walletPill}>
          Wallet: <b style={{ marginLeft: 6 }}>{wallet ? wallet.balance : "—"}</b> credits
        </div>
      </header>

      {err ? <div style={S.card}>⚠️ {err}</div> : null}

      <div style={S.grid}>
        <section style={S.card}>
          <h2 style={S.h2}>Plans</h2>

          {plans.length === 0 ? (
            <div style={S.small}>No plans found.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {plans.map((pl) => {
                const active = selected?.id === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={() => setSelected(pl)}
                    style={{
                      ...S.planBtn,
                      ...(active ? S.planBtnActive : {}),
                    }}
                  >
                    <div style={{ fontWeight: 950 }}>{pl.name}</div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>
                      {pl.price} {pl.currency}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>PayPal</h2>
          {!selected ? (
            <div style={S.small}>Select a plan to show PayPal button.</div>
          ) : !sdkReady ? (
            <div style={S.small}>Loading PayPal…</div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <div style={S.small}>
                Selected: <b>{selected.name}</b> • {selected.price} {selected.currency}
              </div>
              <div id="paypal-subscription" style={{ marginTop: 12 }} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: 24, background: "#0b0f19", color: "#fff" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 26, fontWeight: 950 },
  sub: { opacity: 0.8, marginTop: 6 },
  walletPill: { padding: "10px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.08)", fontWeight: 900 },
  grid: { marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  card: { padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" },
  h2: { margin: 0, fontSize: 18, fontWeight: 950 },
  small: { marginTop: 10, fontSize: 12, opacity: 0.85 },
  planBtn: { textAlign: "left", padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.18)", color: "#fff", cursor: "pointer" },
  planBtnActive: { border: "1px solid rgba(60,255,177,0.35)", background: "rgba(60,255,177,0.10)" },
};
