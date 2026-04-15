"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

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

  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  goingToLaundryAt?: string | null;
  washingAt?: string | null;
  returningAt?: string | null;
  doneAt?: string | null;

  cancelRequestedAt?: string | null;
  cancelReason?: string | null;
  canceledAt?: string | null;
  adminDecisionNote?: string | null;

  createdAt: string;
  updatedAt: string;
};

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "REQUESTED":
      return "Requested";
    case "ACCEPTED":
      return "Accepted";
    case "ON_THE_WAY":
      return "On the way";
    case "GOING_TO_LAUNDRY":
      return "Going to laundry";
    case "WASHING":
      return "Washing";
    case "RETURNING_TO_CUSTOMER":
      return "Returning to customer";
    case "DONE":
      return "Done";
    case "CANCEL_REQUESTED":
      return "Cancel requested";
    case "CANCELED":
      return "Canceled";
    default:
      return status;
  }
}

function getStatusTone(status: OrderStatus): React.CSSProperties {
  switch (status) {
    case "DONE":
      return {
        background: "rgba(60,255,177,0.14)",
        border: "1px solid rgba(60,255,177,0.25)",
        color: "#c8ffe7",
      };
    case "CANCELED":
      return {
        background: "rgba(255,77,77,0.14)",
        border: "1px solid rgba(255,77,77,0.24)",
        color: "#ffd1d1",
      };
    case "CANCEL_REQUESTED":
      return {
        background: "rgba(255,184,77,0.14)",
        border: "1px solid rgba(255,184,77,0.24)",
        color: "#ffe7c2",
      };
    default:
      return {
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "#fff",
      };
  }
}

export default function WasherMyOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const { data } = await api.get<Order[]>("/orders/washer/my");
      setOrders(data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === "ALL") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Washer</div>
          <h1 style={S.title}>My orders</h1>
          <div style={S.sub}>
            Endpoint: <code>/orders/washer/my</code> • Live refresh every 5 seconds
          </div>
        </div>

        <div style={S.headerActions}>
          <button style={S.btnGhost} onClick={load}>
            Refresh
          </button>
          <button style={S.btnGhost} onClick={() => router.push("/washer/jobs")}>
            Available jobs
          </button>
          <button style={S.btnGhost} onClick={() => router.push("/")}>
            Dashboard
          </button>
        </div>
      </header>

      <section style={S.card}>
        <div style={S.topBar}>
          <h2 style={S.cardTitle}>Assigned orders</h2>

          <div style={S.filterWrap}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "ALL" | OrderStatus)}
              style={S.select}
            >
              <option value="ALL">All statuses</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="ON_THE_WAY">On the way</option>
              <option value="GOING_TO_LAUNDRY">Going to laundry</option>
              <option value="WASHING">Washing</option>
              <option value="RETURNING_TO_CUSTOMER">Returning to customer</option>
              <option value="DONE">Done</option>
              <option value="CANCEL_REQUESTED">Cancel requested</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
        </div>

        {loading ? <div style={S.small}>Loading…</div> : null}
        {err ? <div style={S.small}>⚠️ {err}</div> : null}

        {!loading && filteredOrders.length === 0 ? (
          <div style={S.small}>No orders found.</div>
        ) : (
          <div style={S.list}>
            {filteredOrders.map((o) => (
              <div key={o.id} style={S.orderCard}>
                <div style={S.orderTop}>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.orderTitle}>Order #{o.id}</div>
                    <div style={S.orderSub}>Scheduled: {fmtDateTime(o.scheduledAt)}</div>
                  </div>

                  <div style={{ ...S.statusPill, ...getStatusTone(o.status) }}>
                    {getStatusLabel(o.status)}
                  </div>
                </div>

                <div style={S.infoGrid}>
                  <div style={S.infoBox}>
                    <div style={S.infoK}>Address</div>
                    <div style={S.infoV}>{o.address}</div>
                  </div>

                  <div style={S.infoBox}>
                    <div style={S.infoK}>GPS</div>
                    <div style={S.infoV}>
                      {o.lat != null && o.lng != null
                        ? `${o.lat.toFixed(5)}, ${o.lng.toFixed(5)}`
                        : "No coordinates"}
                    </div>
                  </div>

                  <div style={S.infoBox}>
                    <div style={S.infoK}>Last updated</div>
                    <div style={S.infoV}>{fmtDateTime(o.updatedAt)}</div>
                  </div>
                </div>

                {o.notes ? (
                  <div style={S.noteBox}>
                    <div style={S.infoK}>Notes</div>
                    <div style={S.noteText}>{o.notes}</div>
                  </div>
                ) : null}

                {o.status === "CANCEL_REQUESTED" && o.cancelReason ? (
                  <div style={S.warningBox}>
                    <div style={S.infoK}>Cancel reason</div>
                    <div style={S.noteText}>{o.cancelReason}</div>
                  </div>
                ) : null}

                {o.status === "CANCELED" && o.adminDecisionNote ? (
                  <div style={S.warningBox}>
                    <div style={S.infoK}>Admin note</div>
                    <div style={S.noteText}>{o.adminDecisionNote}</div>
                  </div>
                ) : null}

                <div style={S.actions}>
                  <button
                    style={S.btnPrimary}
                    onClick={() => router.push(`/washer/order?orderId=${o.id}`)}
                  >
                    Open order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "16px",
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
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  filterWrap: {
    minWidth: 180,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.14)",
    outline: "none",
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
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
  },

  list: {
    display: "grid",
    gap: 12,
    marginTop: 14,
  },

  orderCard: {
    borderRadius: 18,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: 14,
  },
  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  orderTitle: {
    fontWeight: 950,
    fontSize: 18,
  },
  orderSub: {
    marginTop: 4,
    opacity: 0.8,
    fontSize: 13,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  infoGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  infoBox: {
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: 12,
    minWidth: 0,
  },
  infoK: {
    fontSize: 12,
    opacity: 0.72,
    fontWeight: 900,
  },
  infoV: {
    marginTop: 6,
    fontWeight: 850,
    wordBreak: "break-word",
  },

  noteBox: {
    marginTop: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: 12,
  },
  warningBox: {
    marginTop: 12,
    borderRadius: 14,
    background: "rgba(255,184,77,0.10)",
    border: "1px solid rgba(255,184,77,0.20)",
    padding: 12,
  },
  noteText: {
    marginTop: 6,
    lineHeight: 1.45,
    wordBreak: "break-word",
  },

  actions: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  small: {
    opacity: 0.82,
    fontSize: 12,
    marginTop: 12,
  },
};