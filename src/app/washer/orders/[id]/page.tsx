"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

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

type OrderDetails = {
  id: number;
  customerId: number;
  washerId: number | null;
  serviceId: number;
  carId: number | null;
  address: string;
  lat: number | null;
  lng: number | null;
  scheduledAt: string;
  notes: string | null;
  status: OrderStatus;
  createdAt: string;

  customer?: {
    id: number;
    fullName?: string | null;
    phone?: string | null;
  } | null;

  car?: {
    id: number;
    brand?: string | null;
    model?: string | null;
    color?: string | null;
    plateNumber?: string | null;
    notes?: string | null;
    imageDataUrl?: string | null;
    imageUrl?: string | null;
  } | null;

  service?: {
    id: number;
    name: string;
    description?: string | null;
    priceGel?: number | null;
    durationMin?: number | null;
  } | null;
};

export default function WasherOrderPreviewPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = Number(params?.id);

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [accepting, setAccepting] = useState(false);

  async function loadOrder() {
    if (!orderId || Number.isNaN(orderId)) {
      setErr("Invalid order id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const { data } = await api.get<OrderDetails>(`/orders/${orderId}/details-for-washer`);
      setOrder(data || null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function acceptOrder() {
    if (!order) return;

    try {
      setAccepting(true);
      await api.post(`/orders/${order.id}/accept`);
      router.push(`/washer/order?orderId=${order.id}`);
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          "Order could not be accepted. It may already be taken."
      );
      await loadOrder();
    } finally {
      setAccepting(false);
    }
  }

  const alreadyUnavailable =
    order?.status !== "REQUESTED" || !!order?.washerId;

  const carImage =
    order?.car?.imageUrl || order?.car?.imageDataUrl || "";

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Washer</div>
          <h1 style={S.title}>Order Preview</h1>
          <div style={S.sub}>
            Check order details before accepting.
          </div>
        </div>

        <div style={S.headerActions}>
          <button style={S.btnGhost} onClick={() => router.push("/washer/jobs")}>
            Back to Jobs
          </button>
          <button style={S.btnGhost} onClick={loadOrder}>
            Refresh
          </button>
        </div>
      </header>

      {loading ? <section style={S.card}>Loading…</section> : null}

      {!loading && err ? (
        <section style={S.card}>
          <b>⚠️</b> {err}
        </section>
      ) : null}

      {!loading && !err && order ? (
        <>
          <section style={S.card}>
            <div style={S.topRow}>
              <div>
                <div style={S.orderTitle}>Order #{order.id}</div>
                <div style={S.meta}>
                  Status: <b>{order.status}</b>
                </div>
                <div style={S.meta}>
                  Scheduled: <b>{new Date(order.scheduledAt).toLocaleString()}</b>
                </div>
              </div>

              <div style={S.actionArea}>
                <button
                  style={{
                    ...S.btnPrimary,
                    opacity: alreadyUnavailable || accepting ? 0.7 : 1,
                    cursor: alreadyUnavailable || accepting ? "not-allowed" : "pointer",
                  }}
                  disabled={alreadyUnavailable || accepting}
                  onClick={acceptOrder}
                >
                  {accepting
                    ? "Accepting..."
                    : alreadyUnavailable
                    ? "Already Accepted / Unavailable"
                    : "Accept Order"}
                </button>
              </div>
            </div>
          </section>

          <section style={S.grid}>
            <div style={S.card}>
              <h2 style={S.cardTitle}>Customer</h2>
              <div style={S.infoLine}>
                Name: <b>{order.customer?.fullName || "—"}</b>
              </div>
              <div style={S.infoLine}>
                Phone: <b>{order.customer?.phone || "—"}</b>
              </div>
              <div style={S.infoLine}>
                Customer ID: <b>{order.customerId}</b>
              </div>
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Service</h2>
              <div style={S.infoLine}>
                Name: <b>{order.service?.name || "—"}</b>
              </div>
              <div style={S.infoLine}>
                Price: <b>{order.service?.priceGel ?? "—"} GEL</b>
              </div>
              <div style={S.infoLine}>
                Duration: <b>{order.service?.durationMin ?? "—"} min</b>
              </div>
              <div style={S.infoLine}>
                Description: <b>{order.service?.description || "—"}</b>
              </div>
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Location</h2>
              <div style={S.infoLine}>
                Address: <b>{order.address || "—"}</b>
              </div>
              <div style={S.infoLine}>
                GPS:{" "}
                <b>
                  {order.lat != null && order.lng != null
                    ? `${order.lat.toFixed(5)}, ${order.lng.toFixed(5)}`
                    : "—"}
                </b>
              </div>
              <div style={S.infoLine}>
                Notes: <b>{order.notes || "—"}</b>
              </div>
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Car</h2>

              {carImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={carImage} alt="Car" style={S.carImage} />
              ) : (
                <div style={S.imagePlaceholder}>No car image</div>
              )}

              <div style={S.infoLine}>
                Brand: <b>{order.car?.brand || "—"}</b>
              </div>
              <div style={S.infoLine}>
                Model: <b>{order.car?.model || "—"}</b>
              </div>
              <div style={S.infoLine}>
                Color: <b>{order.car?.color || "—"}</b>
              </div>
              <div style={S.infoLine}>
                Plate: <b>{order.car?.plateNumber || "—"}</b>
              </div>
              <div style={S.infoLine}>
                Car Notes: <b>{order.car?.notes || "—"}</b>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 16,
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    fontSize: 12,
    width: "fit-content",
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 950,
  },
  sub: {
    marginTop: 6,
    opacity: 0.85,
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  orderTitle: {
    fontSize: 22,
    fontWeight: 950,
  },
  meta: {
    marginTop: 8,
    fontSize: 13,
    opacity: 0.85,
  },
  actionArea: {
    minWidth: 220,
    display: "flex",
    alignItems: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 14,
    marginTop: 2,
  },
  cardTitle: {
    margin: 0,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 900,
  },
  infoLine: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 1.45,
    wordBreak: "break-word",
    opacity: 0.92,
  },
  btnGhost: {
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
  },
  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
    whiteSpace: "nowrap",
    width: "100%",
  },
  carImage: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    border: "1px dashed rgba(255,255,255,0.22)",
    display: "grid",
    placeItems: "center",
    opacity: 0.75,
    marginBottom: 12,
    background: "rgba(0,0,0,0.16)",
  },
};