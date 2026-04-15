"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

declare global {
  interface Window {
    paypal?: any;
  }
}

type OrderStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "WASHING"
  | "DONE"
  | "CANCEL_REQUESTED"
  | "CANCELED";

type Order = {
  id: number;
  address: string;
  status: OrderStatus;
  washerId: number | null;
  scheduledAt: string;
  createdAt: string;
};

function loadPaypalSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve();

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) return reject(new Error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID"));

    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load PayPal SDK"));
    document.body.appendChild(s);
  });
}

export default function PayOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = useMemo(() => Number(params?.id || 0), [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [amount, setAmount] = useState("10.00");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [paid, setPaid] = useState(false);

  async function loadOrder() {
    try {
      const { data } = await api.get<Order[]>("/orders/my");
      const found = (data || []).find((o) => o.id === orderId) || null;
      setOrder(found);
      if (!found) setErr("Order not found.");
      else setErr("");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load order.");
    }
  }

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    (async () => {
      try {
        await loadPaypalSdk();
        setReady(true);
      } catch (e: any) {
        setErr(e?.message || "PayPal SDK error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!order) return;
    if (!window.paypal) return;

    // Only allow pay when ACCEPTED
    if (order.status !== "ACCEPTED") return;

    const el = document.getElementById("paypal-buttons");
    if (!el) return;
    el.innerHTML = "";

    window.paypal
      .Buttons({
        createOrder: async () => {
          // backend creates PayPal order + saves Payment row
         const res = await api.post<{ providerOrderId: string }>(
  `/payments/paypal/${order.id}`,
  { amount }
);

return res.data.providerOrderId;

        },
        onApprove: async (data: any) => {
          // capture in backend
          await api.post(`/payments/paypal/capture/${data.orderID}`);
          setPaid(true);
          await loadOrder();
          alert("✅ Payment successful!");
          router.push(`/orders/${order.id}/waiting`);
        },
        onError: (e: any) => {
          console.error(e);
          alert("❌ PayPal error");
        },
      })
      .render("#paypal-buttons");
  }, [ready, order, amount]);

  const canPay = order?.status === "ACCEPTED" && !paid;

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Pay for Order #{orderId}</h1>
          <div style={S.sub}>PayPal payment (capture) • Customer</div>
        </div>
        <button style={S.btn} onClick={() => router.push("/orders/my")}>
          Back
        </button>
      </header>

      {err ? <div style={S.card}>⚠️ {err}</div> : null}

      {order ? (
        <div style={S.card}>
          <div style={S.row}>
            <div><b>Status:</b> {order.status}</div>
            <div><b>Washer:</b> {order.washerId ?? "—"}</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={S.label}>Amount (USD)</label>
            <input
              style={S.input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canPay}
            />
            <div style={S.small}>
              You can pay only when status is <b>ACCEPTED</b>.
            </div>
          </div>

          {!ready ? <div style={S.small}>Loading PayPal…</div> : null}

          {order.status !== "ACCEPTED" ? (
            <div style={S.warn}>
              Payment is locked until washer accepts. Current: <b>{order.status}</b>
            </div>
          ) : paid ? (
            <div style={S.ok}>✅ Already paid</div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <div id="paypal-buttons" />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: 24, background: "#0b0f19", color: "#fff" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 26, fontWeight: 950 },
  sub: { opacity: 0.8, marginTop: 6 },
  card: { marginTop: 14, padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" },
  row: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  btn: { padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,0.10)", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer" },
  label: { display: "block", fontWeight: 900, marginBottom: 6 },
  input: { width: "100%", padding: "12px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)", color: "#fff", outline: "none" },
  small: { marginTop: 8, fontSize: 12, opacity: 0.85 },
  warn: { marginTop: 12, padding: 12, borderRadius: 14, background: "rgba(255,200,0,0.12)", border: "1px solid rgba(255,200,0,0.25)", fontWeight: 900 },
  ok: { marginTop: 12, padding: 12, borderRadius: 14, background: "rgba(60,255,177,0.14)", border: "1px solid rgba(60,255,177,0.25)", fontWeight: 900 },
};
