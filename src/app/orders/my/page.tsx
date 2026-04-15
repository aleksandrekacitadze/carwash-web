"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Order = {
  id: number;
  serviceId: number;
  carId: number | null;
  address: string;
  lat: number | null;
  lng: number | null;
  scheduledAt: string;
  notes: string | null;
  status: string;
  washerId: number | null;
  chargePercent: number | null;
  cancelReason: string | null;
  createdAt: string;
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Order[]>("/orders/my");
      setOrders(data);
    } catch {
      alert("Failed to load /orders/my. Check token + backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancelOrder(orderId: number) {
    const reason = prompt("Cancel reason? (optional)") || "";
    try {
      await api.post(`/orders/${orderId}/cancel`, { reason });
      await load();
      alert("✅ Cancel sent (instant cancel or cancel-request).");
    } catch (e: any) {
      console.log(e?.response?.data || e);
      alert("❌ Cancel failed (maybe DONE/CANCELED/already requested).");
    }
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.title}>My Orders</h1>
        <a style={S.btn} href="/customer/dashboard">← Back to Dashboard</a>
      </header>

      {loading ? <div style={S.muted}>Loading…</div> : null}

      {orders.length === 0 && !loading ? (
        <div style={S.muted}>No orders yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((o) => (
            <div key={o.id} style={S.card}>
              <div style={S.row}>
                <div style={{ fontWeight: 900 }}>Order #{o.id}</div>
                <div style={S.badge}>{o.status}</div>
              </div>

              <div style={S.meta}>
                <div>ServiceId: <b>{o.serviceId}</b></div>
                <div>CarId: <b>{o.carId ?? "—"}</b></div>
                <div>WasherId: <b>{o.washerId ?? "—"}</b></div>
              </div>

              <div style={S.meta}>
                <div>Address: <b>{o.address}</b></div>
                <div>
                  Scheduled: <b>{new Date(o.scheduledAt).toLocaleString()}</b>
                </div>
              </div>

              {o.cancelReason ? (
                <div style={S.meta}>Cancel reason: <b>{o.cancelReason}</b></div>
              ) : null}

              {typeof o.chargePercent === "number" ? (
                <div style={S.meta}>Charge percent: <b>{o.chargePercent}%</b></div>
              ) : null}

              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  style={S.dangerBtn}
                  onClick={() => cancelOrder(o.id)}
                  disabled={o.status === "DONE" || o.status === "CANCELED"}
                >
                  Cancel / Request Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: 26, fontWeight: 900 },
  muted: { opacity: 0.8 },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },
  row: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    fontWeight: 900,
    fontSize: 12,
  },
  meta: { marginTop: 8, opacity: 0.9, lineHeight: 1.35 },
  btn: {
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtn: {
    background: "rgba(255,100,100,0.18)",
    border: "1px solid rgba(255,100,100,0.35)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
  },
};
