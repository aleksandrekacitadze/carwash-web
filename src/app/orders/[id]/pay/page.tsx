"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Order = {
  id: number;
  address: string;
  status: string;
  isPaid?: boolean;
  paymentStatus?: string;
  pricePaid?: string | null;
  washerId?: number | null;
};

export default function PayOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = useMemo(() => Number(params?.id || 0), [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [amount, setAmount] = useState("0");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [acceptedNotified, setAcceptedNotified] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canPay =
    order?.status === "ACCEPTED" &&
    order?.isPaid !== true &&
    order?.paymentStatus !== "PAID";

  useEffect(() => {
    audioRef.current = new Audio("/sounds/order-accepted.mp3");
    loadOrder();

    const interval = setInterval(() => {
      loadOrder(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId]);

  async function loadOrder(showLoading = true) {
    if (!orderId) return;

    try {
      if (showLoading) setLoading(true);

      const { data } = await api.get<Order>(`/orders/${orderId}`);

      setOrder(data);

      if (data.pricePaid) {
        setAmount(String(data.pricePaid));
      }

      if (data.status === "ACCEPTED" && !acceptedNotified) {
        setAcceptedNotified(true);

        try {
          await audioRef.current?.play();
        } catch {
          // Browser may block sound until user interaction
        }
      }

      if (data.isPaid || data.paymentStatus === "PAID") {
        router.push(`/orders/${orderId}/waiting`);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load order.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  function getUserId() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;

    try {
      const user = JSON.parse(raw);
      return user?.id ?? null;
    } catch {
      return null;
    }
  }

  async function payWithKeepz() {
    try {
      setPayLoading(true);
      setErr("");

      if (!order) throw new Error("Order not loaded.");

      if (order.status !== "ACCEPTED") {
        throw new Error("Wait until washer accepts your order.");
      }

      const userId = getUserId();

      if (!userId) {
        throw new Error("User not found. Please login again.");
      }

      const finalAmount = Number(amount);

      if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
        throw new Error("Invalid payment amount.");
      }

      const { data } = await api.post<{
        paymentId: number;
        providerOrderId: string;
        checkoutUrl: string;
      }>("/payments/create", {
        userId,
        kind: "ORDER",
        orderId: order.id,
        provider: "KEEPZ",
        amount: finalAmount,
        currency: "GEL",
      });

      if (!data.checkoutUrl) {
        throw new Error("Payment checkout URL missing.");
      }

      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to create payment.");
      setPayLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Pay for Order #{orderId}</h1>
          <div style={S.sub}>Payment unlocks after washer accepts your order.</div>
        </div>

        <button style={S.btn} onClick={() => router.push("/orders/my")}>
          My Orders
        </button>
      </header>

      {err ? <div style={S.error}>⚠️ {err}</div> : null}

      <div style={S.card}>
        {loading ? (
          <div>Loading order...</div>
        ) : order ? (
          <>
            <div style={S.statusBox}>
              <div>
                <b>Status:</b> {order.status}
              </div>
              <div>
                <b>Washer:</b> {order.washerId ?? "Waiting..."}
              </div>
              <div>
                <b>Payment:</b> {order.paymentStatus ?? "PENDING"}
              </div>
            </div>

            {order.status !== "ACCEPTED" ? (
              <div style={S.waitBox}>
                ⏳ Waiting for washer to accept your order...
                <div style={S.small}>
                  This page checks automatically every 3 seconds.
                </div>
              </div>
            ) : (
              <div style={S.okBox}>
                ✅ Washer accepted your order. You can pay now.
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <div style={S.label}>Amount GEL</div>
              <input
                style={S.input}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!canPay || payLoading}
              />
            </div>

            <button
              style={{
                ...S.payBtn,
                opacity: !canPay || payLoading ? 0.65 : 1,
                cursor: !canPay || payLoading ? "not-allowed" : "pointer",
              }}
              disabled={!canPay || payLoading}
              onClick={payWithKeepz}
            >
              {payLoading ? "Creating payment..." : "Pay with KEEPZ"}
            </button>

            <div style={S.small}>
              After payment, KEEPZ will redirect you back and backend callback will mark the
              order paid.
            </div>
          </>
        ) : (
          <div>Order not found.</div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 20,
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "system-ui",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: 26, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.78 },
  btn: {
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    border: "none",
    cursor: "pointer",
  },
  card: {
    marginTop: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
    maxWidth: 560,
  },
  statusBox: {
    display: "grid",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  waitBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,200,0,0.12)",
    border: "1px solid rgba(255,200,0,0.25)",
    fontWeight: 900,
  },
  okBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "rgba(60,255,177,0.14)",
    border: "1px solid rgba(60,255,177,0.25)",
    fontWeight: 900,
  },
  label: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.8,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
  },
  payBtn: {
    marginTop: 14,
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: "#3cffb1",
    color: "#062112",
    fontWeight: 950,
    fontSize: 16,
  },
  small: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.75,
    lineHeight: 1.45,
  },
  error: {
    marginTop: 14,
    maxWidth: 560,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,99,99,0.12)",
    border: "1px solid rgba(255,99,99,0.24)",
  },
};