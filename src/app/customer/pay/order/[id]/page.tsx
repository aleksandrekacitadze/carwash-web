"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

type OrderStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "GOING_TO_LAUNDRY"
  | "WASHING"
  | "RETURNING_TO_CUSTOMER"
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
  isPaid?: boolean;
  paymentStatus?: string;
  pricePaid?: string | null;
};

export default function PayOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = useMemo(() => Number(params?.id || 0), [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [amount, setAmount] = useState("10");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadOrder() {
    try {
      const { data } = await api.get<Order[]>("/orders/my");
      const found = (data || []).find((o) => o.id === orderId) || null;

      setOrder(found);

      if (!found) setErr("Order not found.");
      else {
        setErr("");
        if (found.pricePaid) setAmount(String(found.pricePaid));
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load order.");
    }
  }

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  async function payWithKeepz() {
    if (!order) return;

    try {
      setLoading(true);
      setErr("");

      const userRaw = localStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;

      if (!user?.id) {
        throw new Error("User not found. Please login again.");
      }

      const { data } = await api.post<{
        paymentId: number;
        providerOrderId: string;
        checkoutUrl: string;
      }>("/payments/create", {
        userId: user.id,
        kind: "ORDER",
        orderId: order.id,
        provider: "KEEPZ",
        amount: Number(amount),
        currency: "GEL",
      });

      if (!data.checkoutUrl) {
        throw new Error("Payment link was not created.");
      }

      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to create payment.");
      setLoading(false);
    }
  }

  const canPay =
    order?.status === "ACCEPTED" &&
    order?.isPaid !== true &&
    order?.paymentStatus !== "PAID";

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Pay for Order #{orderId}</h1>
          <div style={S.sub}>KEEPZ payment • Customer</div>
        </div>

        <button style={S.btn} onClick={() => router.push("/orders/my")}>
          Back
        </button>
      </header>

      {err ? <div style={S.card}>⚠️ {err}</div> : null}

      {order ? (
        <div style={S.card}>
          <div style={S.row}>
            <div>
              <b>Status:</b> {order.status}
            </div>
            <div>
              <b>Washer:</b> {order.washerId ?? "—"}
            </div>
            <div>
              <b>Payment:</b> {order.paymentStatus ?? "PENDING"}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={S.label}>Amount GEL</label>
            <input
              style={S.input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canPay || loading}
            />

            <div style={S.small}>
              You can pay only when status is <b>ACCEPTED</b>.
            </div>
          </div>

          {order.isPaid || order.paymentStatus === "PAID" ? (
            <div style={S.ok}>✅ Already paid</div>
          ) : order.status !== "ACCEPTED" ? (
            <div style={S.warn}>
              Payment is locked until washer accepts. Current: <b>{order.status}</b>
            </div>
          ) : (
            <button
              style={{
                ...S.payBtn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              disabled={loading}
              onClick={payWithKeepz}
            >
              {loading ? "Creating payment..." : "Pay with KEEPZ"}
            </button>
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
  payBtn: { marginTop: 14, width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: "#27e0a3", color: "#06120e", fontWeight: 950, fontSize: 16 },
};