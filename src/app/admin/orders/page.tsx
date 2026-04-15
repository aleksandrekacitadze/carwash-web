"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

type OrderItem = {
  id: number;
  customerId: number;
  washerId: number | null;
  serviceId: number;
  carId: number | null;
  address: string;
  status: string;

  paymentMode?: string | null;
  paymentStatus?: string | null;
  isPaid?: boolean;

  chargePercent?: number | null;
  adminDecisionNote?: string | null;
  cancelReason?: string | null;
  cancelRequestedAt?: string | null;

  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type OrderDetails = {
  order: OrderItem;
  customer?: any;
  washer?: any;
  payments?: any[];
  reviews?: any[];
  customerSubscriptions?: any[];
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusColor(status?: string) {
  switch (status) {
    case "REQUESTED":
      return "#b8c0cc";
    case "ACCEPTED":
      return "#8fd3ff";
    case "ON_THE_WAY":
      return "#6ae3ff";
    case "GOING_TO_LAUNDRY":
      return "#a6e36a";
    case "WASHING":
      return "#ffd36a";
    case "RETURNING_TO_CUSTOMER":
      return "#c59bff";
    case "DONE":
      return "#3cffb1";
    case "CANCEL_REQUESTED":
      return "#ffb366";
    case "CANCELED":
      return "#ff7a7a";
    default:
      return "#b8c0cc";
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [status, setStatus] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [q, setQ] = useState("");

  const [workingId, setWorkingId] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (paymentMode) params.set("paymentMode", paymentMode);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (q.trim()) params.set("q", q.trim());

      const url = params.toString()
        ? `/admin/orders?${params.toString()}`
        : "/admin/orders";

      const { data } = await api.get<OrderItem[]>(url);
      setOrders(data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(orderId: number) {
    try {
      setSelectedOrderId(orderId);
      setDetailsLoading(true);
      setDetailsErr("");

      const { data } = await api.get<OrderDetails>(`/admin/orders/${orderId}`);
      setDetails(data);
    } catch (e: any) {
      setDetails(null);
      setDetailsErr(e?.response?.data?.message || e?.message || "Failed to load order details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function applyFilters() {
    await loadOrders();
  }

  async function approveCancel(orderId: number) {
    const refund = window.confirm(
      "Refund customer frozen credit if this was a credit order?"
    );

    try {
      setWorkingId(`approve-cancel-${orderId}`);
      await api.post(`/admin/orders/${orderId}/cancel-decision`, {
        approve: true,
        chargePercent: 0,
        adminDecisionNote: "Cancel approved by admin",
        refundCustomerCreditOnCancel: refund,
      });

      await loadOrders();
      if (selectedOrderId === orderId) {
        await loadDetails(orderId);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to approve cancel.");
    } finally {
      setWorkingId(null);
    }
  }

  async function rejectCancel(orderId: number) {
    try {
      setWorkingId(`reject-cancel-${orderId}`);
      await api.post(`/admin/orders/${orderId}/cancel-decision`, {
        approve: false,
        adminDecisionNote: "Cancel rejected by admin",
      });

      await loadOrders();
      if (selectedOrderId === orderId) {
        await loadDetails(orderId);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to reject cancel.");
    } finally {
      setWorkingId(null);
    }
  }

  async function markCashCollected(orderId: number) {
    try {
      setWorkingId(`cash-${orderId}`);
      await api.post(`/admin/orders/${orderId}/cash-collected`);
      await loadOrders();
      if (selectedOrderId === orderId) {
        await loadDetails(orderId);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to mark cash collected.");
    } finally {
      setWorkingId(null);
    }
  }

  async function markPaid(orderId: number) {
    try {
      setWorkingId(`paid-${orderId}`);
      await api.post(`/admin/orders/${orderId}/mark-paid`);
      await loadOrders();
      if (selectedOrderId === orderId) {
        await loadDetails(orderId);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to mark order paid.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Admin Panel</div>
          <h1 style={S.title}>Orders</h1>
          <div style={S.sub}>
            Manage all orders, payments, cash collection, and cancel decisions.
          </div>
        </div>

        <div style={S.headerBtns}>
          <a href="/admin" style={S.btnGhost}>Dashboard</a>
          <button style={S.btnGhost} onClick={loadOrders}>Refresh</button>
        </div>
      </header>

      <section style={S.filtersCard}>
        <div style={S.filtersGrid}>
          <div>
            <div style={S.label}>Status</div>
            <select style={S.input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="REQUESTED">REQUESTED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="ON_THE_WAY">ON_THE_WAY</option>
              <option value="GOING_TO_LAUNDRY">GOING_TO_LAUNDRY</option>
              <option value="WASHING">WASHING</option>
              <option value="RETURNING_TO_CUSTOMER">RETURNING_TO_CUSTOMER</option>
              <option value="DONE">DONE</option>
              <option value="CANCEL_REQUESTED">CANCEL_REQUESTED</option>
              <option value="CANCELED">CANCELED</option>
            </select>
          </div>

          <div>
            <div style={S.label}>Payment Mode</div>
            <select
              style={S.input}
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="">All</option>
              <option value="CREDIT">CREDIT</option>
              <option value="DIRECT">DIRECT</option>
              <option value="CASH">CASH</option>
            </select>
          </div>

          <div>
            <div style={S.label}>Payment Status</div>
            <select
              style={S.input}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <div>
            <div style={S.label}>Search</div>
            <input
              style={S.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Order ID, address, notes..."
            />
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button style={S.primaryBtn} onClick={applyFilters}>
              Apply filters
            </button>
          </div>
        </div>
      </section>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? <div style={S.card}><b>⚠️</b> {err}</div> : null}

      <div style={S.layout}>
        <section style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>Orders</h2>
            <span style={S.countPill}>{orders.length}</span>
          </div>

          {orders.length === 0 ? (
            <div style={S.empty}>No orders found.</div>
          ) : (
            <div style={S.listWrap}>
              {orders.map((o) => (
                <div key={o.id} style={S.rowCard}>
                  <div style={S.rowMain}>
                    <div style={S.rowTop}>
                      <div style={S.rowTitle}>Order #{o.id}</div>
                      <span
                        style={{
                          ...S.statusPill,
                          borderColor: statusColor(o.status),
                          color: statusColor(o.status),
                        }}
                      >
                        {o.status}
                      </span>
                    </div>

                    <div style={S.rowMeta}>
                      Customer #{o.customerId} • Washer {o.washerId ? `#${o.washerId}` : "—"}
                    </div>
                    <div style={S.rowMeta}>
                      Payment: {o.paymentMode || "—"} • {o.paymentStatus || "—"} • Paid:{" "}
                      {o.isPaid ? "YES" : "NO"}
                    </div>
                    <div style={S.rowMeta}>Address: {o.address}</div>
                    <div style={S.rowMeta}>Scheduled: {fmtDate(o.scheduledAt)}</div>
                    <div style={S.rowMeta}>Created: {fmtDate(o.createdAt)}</div>

                    {o.cancelReason ? (
                      <div style={S.rowMeta}>Cancel reason: {o.cancelReason}</div>
                    ) : null}
                    {o.adminDecisionNote ? (
                      <div style={S.rowMeta}>Admin note: {o.adminDecisionNote}</div>
                    ) : null}
                  </div>

                  <div style={S.rowActions}>
                    <button style={S.viewBtn} onClick={() => loadDetails(o.id)}>
                      View
                    </button>

                    {o.status === "CANCEL_REQUESTED" ? (
                      <>
                        <button
                          style={S.approveBtn}
                          onClick={() => approveCancel(o.id)}
                          disabled={workingId === `approve-cancel-${o.id}`}
                        >
                          {workingId === `approve-cancel-${o.id}` ? "Approving..." : "Approve cancel"}
                        </button>

                        <button
                          style={S.rejectBtn}
                          onClick={() => rejectCancel(o.id)}
                          disabled={workingId === `reject-cancel-${o.id}`}
                        >
                          {workingId === `reject-cancel-${o.id}` ? "Rejecting..." : "Reject cancel"}
                        </button>
                      </>
                    ) : null}

                    {o.paymentMode === "CASH" && o.paymentStatus !== "PAID" ? (
                      <button
                        style={S.cashBtn}
                        onClick={() => markCashCollected(o.id)}
                        disabled={workingId === `cash-${o.id}`}
                      >
                        {workingId === `cash-${o.id}` ? "Saving..." : "Cash collected"}
                      </button>
                    ) : null}

                    {!o.isPaid ? (
                      <button
                        style={S.markPaidBtn}
                        onClick={() => markPaid(o.id)}
                        disabled={workingId === `paid-${o.id}`}
                      >
                        {workingId === `paid-${o.id}` ? "Saving..." : "Mark paid"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>Order Details</h2>
            {selectedOrderId ? <span style={S.countPill}>#{selectedOrderId}</span> : null}
          </div>

          {!selectedOrderId ? (
            <div style={S.empty}>Select an order to view details.</div>
          ) : detailsLoading ? (
            <div style={S.empty}>Loading details…</div>
          ) : detailsErr ? (
            <div style={S.empty}>⚠️ {detailsErr}</div>
          ) : details ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={S.detailBox}>
                <div style={S.detailTitle}>Order</div>
                <div style={S.detailMeta}>ID: #{details.order.id}</div>
                <div style={S.detailMeta}>Status: {details.order.status}</div>
                <div style={S.detailMeta}>
                  Payment: {details.order.paymentMode || "—"} • {details.order.paymentStatus || "—"}
                </div>
                <div style={S.detailMeta}>Paid: {details.order.isPaid ? "YES" : "NO"}</div>
                <div style={S.detailMeta}>Address: {details.order.address}</div>
                <div style={S.detailMeta}>Created: {fmtDate(details.order.createdAt)}</div>
                <div style={S.detailMeta}>Updated: {fmtDate(details.order.updatedAt)}</div>
                <div style={S.detailMeta}>Scheduled: {fmtDate(details.order.scheduledAt)}</div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Customer</div>
                <div style={S.detailMeta}>ID: {details.customer?.id ?? "—"}</div>
                <div style={S.detailMeta}>Phone: {details.customer?.phone ?? "—"}</div>
                <div style={S.detailMeta}>Name: {details.customer?.fullName ?? "—"}</div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Washer</div>
                <div style={S.detailMeta}>ID: {details.washer?.id ?? "—"}</div>
                <div style={S.detailMeta}>Phone: {details.washer?.phone ?? "—"}</div>
                <div style={S.detailMeta}>Name: {details.washer?.fullName ?? "—"}</div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Payments</div>
                {details.payments?.length ? (
                  <div style={S.innerList}>
                    {details.payments.map((p: any) => (
                      <div key={p.id} style={S.innerItem}>
                        <div style={S.detailMeta}>Payment #{p.id}</div>
                        <div style={S.detailMeta}>
                          {p.kind} • {p.provider} • {p.status}
                        </div>
                        <div style={S.detailMeta}>
                          {p.amount} {p.currency}
                        </div>
                        <div style={S.detailMeta}>Created: {fmtDate(p.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No payment rows.</div>
                )}
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Customer Subscriptions</div>
                {details.customerSubscriptions?.length ? (
                  <div style={S.innerList}>
                    {details.customerSubscriptions.map((s: any) => (
                      <div key={s.id} style={S.innerItem}>
                        <div style={S.detailMeta}>Subscription #{s.id}</div>
                        <div style={S.detailMeta}>
                          Plan #{s.planId} • {s.status}
                        </div>
                        <div style={S.detailMeta}>Credits left: {s.creditsLeft}</div>
                        <div style={S.detailMeta}>Active until: {fmtDate(s.activeUntil)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No subscriptions found.</div>
                )}
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Reviews for this order</div>
                {details.reviews?.length ? (
                  <div style={S.innerList}>
                    {details.reviews.map((r: any) => (
                      <div key={r.id} style={S.innerItem}>
                        <div style={S.detailMeta}>⭐ {r.rating}</div>
                        <div style={S.detailMeta}>{r.comment || "No comment"}</div>
                        <div style={S.detailMeta}>Created: {fmtDate(r.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No reviews yet.</div>
                )}
              </div>
            </div>
          ) : (
            <div style={S.empty}>No details.</div>
          )}
        </aside>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 16,
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
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
    margin: "8px 0 0",
    fontSize: 28,
    fontWeight: 950,
  },
  sub: {
    marginTop: 6,
    opacity: 0.82,
  },
  headerBtns: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  btnGhost: {
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    textDecoration: "none",
  },

  filtersCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
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
  primaryBtn: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 16,
  },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
  },
  sectionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  countPill: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontSize: 12,
    fontWeight: 900,
  },

  listWrap: {
    display: "grid",
    gap: 10,
  },
  rowCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    padding: 12,
    borderRadius: 16,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  rowMain: {
    flex: "1 1 260px",
    minWidth: 0,
  },
  rowTop: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  rowTitle: {
    fontWeight: 950,
    fontSize: 16,
  },
  rowMeta: {
    fontSize: 12,
    opacity: 0.82,
    marginTop: 6,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  rowActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  statusPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 900,
  },

  viewBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    fontWeight: 900,
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
  },
  approveBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#3cffb1",
    color: "#062112",
  },
  rejectBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#ff6363",
    color: "#230707",
  },
  cashBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#ffd36a",
    color: "#2a2000",
  },
  markPaidBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#8fd3ff",
    color: "#071d2c",
  },

  empty: {
    opacity: 0.8,
    fontSize: 14,
  },

  detailBox: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  detailTitle: {
    fontWeight: 950,
    fontSize: 15,
    marginBottom: 8,
  },
  detailMeta: {
    fontSize: 12,
    opacity: 0.84,
    lineHeight: 1.45,
    marginTop: 4,
    wordBreak: "break-word",
  },
  innerList: {
    display: "grid",
    gap: 8,
  },
  innerItem: {
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
};