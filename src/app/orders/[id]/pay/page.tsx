"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

declare global {
  interface Window {
    paypal?: any;
  }
}

type Order = {
  id: number;
  address: string;
  status: string;
};

export default function PayOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = useMemo(() => Number(params?.id || 0), [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [amount, setAmount] = useState("15.00"); // you can auto-calc from service later
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const currency = "USD";
  const validAmount = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 ? n.toFixed(2) : null;
  }, [amount]);

  useEffect(() => {
    // optional: load order details for UI (if you have endpoint)
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!id) {
      alert("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID in frontend env");
      return;
    }

    const existing = document.querySelector('script[data-paypal="1"]') as HTMLScriptElement | null;
    if (existing) {
      setReady(true);
      return;
    }

    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${id}&currency=${currency}`;
    s.async = true;
    s.dataset.paypal = "1";
    s.onload = () => setReady(true);
    s.onerror = () => alert("Failed to load PayPal SDK");
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const box = document.getElementById("paypal-buttons");
    if (!box) return;
    box.innerHTML = "";

    if (!validAmount) return;
    if (!window.paypal) return;

    window.paypal
      .Buttons({
        style: { layout: "vertical" },

        // ✅ matches your backend: POST /payments/paypal/:orderId
        createOrder: async () => {
          const { data } = await api.post(`/payments/paypal/${orderId}`, {
            amount: validAmount,
          });
          // backend should return { providerOrderId: "..." } or { id: "..." }
          return data.providerOrderId || data.id || data.orderId;
        },

        // ✅ matches your backend: POST /payments/paypal/capture/:providerOrderId
        onApprove: async (data: any) => {
          await api.post(`/payments/paypal/capture/${data.orderID}`);
          alert("✅ Payment successful!");
          router.push(`/orders/${orderId}/waiting`);
        },

        onError: (err: any) => {
          console.log(err);
          alert("PayPal error");
        },
      })
      .render("#paypal-buttons");
  }, [ready, validAmount, orderId, router]);

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.title}>Pay for Order #{orderId}</h1>
        <a style={S.btn} href="/orders/my">My Orders</a>
      </header>

      <div style={S.card}>
        <div style={{ opacity: 0.85, fontWeight: 900 }}>Amount (USD)</div>
        <input style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)} />

        {!validAmount ? <div style={{ marginTop: 8, opacity: 0.8 }}>Enter a valid amount.</div> : null}

        <div style={{ marginTop: 14 }}>
          {!ready ? <div style={{ opacity: 0.85 }}>Loading PayPal…</div> : <div id="paypal-buttons" />}
        </div>

        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
          After successful payment you will be redirected to tracking.
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: 20, background: "#0b0f19", color: "#fff", fontFamily: "system-ui" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 26, fontWeight: 950 },
  btn: { background: "rgba(255,255,255,0.10)", color: "#fff", padding: "10px 12px", borderRadius: 14, fontWeight: 800, textDecoration: "none" },
  card: { marginTop: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: 16, maxWidth: 520 },
  input: { width: "100%", marginTop: 10, padding: "12px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.22)", color: "#fff", outline: "none" },
};
