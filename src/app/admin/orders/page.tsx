"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AdminCancelRequestsPanel
from "@/components/admin/AdminCancelRequestsPanel";

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

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

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
      return "var(--accent)";

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

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] =
    useState<number | null>(null);

  const [details, setDetails] =
    useState<OrderDetails | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsErr, setDetailsErr] =
    useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();

      if (status) {
        params.set("status", status);
      }

      if (paymentMode) {
        params.set(
          "paymentMode",
          paymentMode,
        );
      }

      if (paymentStatus) {
        params.set(
          "paymentStatus",
          paymentStatus,
        );
      }

      if (q.trim()) {
        params.set("q", q.trim());
      }

      const url = params.toString()
        ? `/admin/orders?${params.toString()}`
        : "/admin/orders";

      const { data } =
        await api.get<OrderItem[]>(url);

      setOrders(data || []);
    } catch (e: any) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(
    orderId: number,
  ) {
    try {
      setSelectedOrderId(orderId);

      setDetailsLoading(true);

      setDetailsErr("");

      const { data } =
        await api.get<OrderDetails>(
          `/admin/orders/${orderId}`,
        );

      setDetails(data);
    } catch (e: any) {
      setDetails(null);

      setDetailsErr(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load order details.",
      );
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

  async function approveCancel(
    orderId: number,
  ) {
    const refund = window.confirm(
      "Refund customer frozen credit if this was a credit order?",
    );

    try {
      setWorkingId(
        `approve-cancel-${orderId}`,
      );

      await api.post(
        `/admin/orders/${orderId}/cancel-decision`,
        {
          approve: true,
          chargePercent: 0,
          adminDecisionNote:
            "Cancel approved by admin",
          refundCustomerCreditOnCancel:
            refund,
        },
      );

      await loadOrders();

      if (
        selectedOrderId === orderId
      ) {
        await loadDetails(orderId);
      }
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to approve cancel.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function rejectCancel(
    orderId: number,
  ) {
    try {
      setWorkingId(
        `reject-cancel-${orderId}`,
      );

      await api.post(
        `/admin/orders/${orderId}/cancel-decision`,
        {
          approve: false,
          adminDecisionNote:
            "Cancel rejected by admin",
        },
      );

      await loadOrders();

      if (
        selectedOrderId === orderId
      ) {
        await loadDetails(orderId);
      }
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to reject cancel.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function markCashCollected(
    orderId: number,
  ) {
    try {
      setWorkingId(
        `cash-${orderId}`,
      );

      await api.post(
        `/admin/orders/${orderId}/cash-collected`,
      );

      await loadOrders();

      if (
        selectedOrderId === orderId
      ) {
        await loadDetails(orderId);
      }
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to mark cash collected.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function markPaid(
    orderId: number,
  ) {
    try {
      setWorkingId(
        `paid-${orderId}`,
      );

      await api.post(
        `/admin/orders/${orderId}/mark-paid`,
      );

      await loadOrders();

      if (
        selectedOrderId === orderId
      ) {
        await loadDetails(orderId);
      }
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to mark order paid.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteOrder(
    orderId: number,
  ) {
    const ok = window.confirm(
      `Delete order #${orderId}?`,
    );

    if (!ok) return;

    try {
      setWorkingId(
        `delete-${orderId}`,
      );

      await api.delete(
        `/admin/orders/${orderId}`,
      );

      if (
        selectedOrderId === orderId
      ) {
        setSelectedOrderId(null);
        setDetails(null);
      }

      await loadOrders();

      alert("Order deleted");
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to delete order.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  function openOrderMap(
    orderId: number,
  ) {
    window.open(
      `/admin/orders/${orderId}/map`,
      "_blank",
    );
  }

  function openLiveWashersMap() {
    window.open(
      "/admin/washers/map",
      "_blank",
    );
  }

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>
            Admin Panel
          </div>

          <h1 style={S.title}>
            Orders
          </h1>

          <div style={S.sub}>
            Manage all orders,
            payments, maps, and
            cancel decisions.
          </div>
        </div>

        <div style={S.headerBtns}>
          <a
            href="/admin"
            style={S.btnGhost}
          >
            Dashboard
          </a>

          <button
            style={S.btnGhost}
            onClick={loadOrders}
          >
            Refresh
          </button>

          <button
            style={S.mapBtn}
            onClick={
              openLiveWashersMap
            }
          >
            Live Washers Map
          </button>
        </div>
      </header>

      <section style={S.filtersCard}>
        <div style={S.filtersGrid}>
          <div>
            <div style={S.label}>
              Status
            </div>

            <select
              style={S.input}
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value,
                )
              }
            >
              <option value="">
                All
              </option>

              <option value="REQUESTED">
                REQUESTED
              </option>

              <option value="ACCEPTED">
                ACCEPTED
              </option>

              <option value="ON_THE_WAY">
                ON_THE_WAY
              </option>

              <option value="GOING_TO_LAUNDRY">
                GOING_TO_LAUNDRY
              </option>

              <option value="WASHING">
                WASHING
              </option>

              <option value="RETURNING_TO_CUSTOMER">
                RETURNING_TO_CUSTOMER
              </option>

              <option value="DONE">
                DONE
              </option>

              <option value="CANCEL_REQUESTED">
                CANCEL_REQUESTED
              </option>

              <option value="CANCELED">
                CANCELED
              </option>
            </select>
          </div>

          <div>
            <div style={S.label}>
              Payment Mode
            </div>

            <select
              style={S.input}
              value={paymentMode}
              onChange={(e) =>
                setPaymentMode(
                  e.target.value,
                )
              }
            >
              <option value="">
                All
              </option>

              <option value="CREDIT">
                CREDIT
              </option>

              <option value="DIRECT">
                DIRECT
              </option>

              <option value="CASH">
                CASH
              </option>
            </select>
          </div>

          <div>
            <div style={S.label}>
              Payment Status
            </div>

            <select
              style={S.input}
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(
                  e.target.value,
                )
              }
            >
              <option value="">
                All
              </option>

              <option value="PENDING">
                PENDING
              </option>

              <option value="PAID">
                PAID
              </option>

              <option value="REFUNDED">
                REFUNDED
              </option>

              <option value="FAILED">
                FAILED
              </option>
            </select>
          </div>

          <div>
            <div style={S.label}>
              Search
            </div>

            <input
              style={S.input}
              value={q}
              onChange={(e) =>
                setQ(
                  e.target.value,
                )
              }
              placeholder="Order ID, address..."
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "end",
            }}
          >
            <button
              style={S.primaryBtn}
              onClick={
                applyFilters
              }
            >
              Apply filters
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div style={S.card}>
          Loading…
        </div>
      ) : null}

      {err ? (
        <div style={S.card}>
          ⚠️ {err}
        </div>
      ) : null}

      <div style={S.layout}>
        <section style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>
              Orders
            </h2>

            <span
              style={S.countPill}
            >
              {orders.length}
            </span>
          </div>

          {orders.length === 0 ? (
            <div style={S.empty}>
              No orders found.
            </div>
          ) : (
            <div style={S.listWrap}>
              {orders.map((o) => (
                <div
                  key={o.id}
                  style={S.rowCard}
                >
                  <div
                    style={S.rowMain}
                  >
                    <div
                      style={S.rowTop}
                    >
                      <div
                        style={
                          S.rowTitle
                        }
                      >
                        Order #{o.id}
                      </div>

                      <span
                        style={{
                          ...S.statusPill,
                          borderColor:
                            statusColor(
                              o.status,
                            ),
                          color:
                            statusColor(
                              o.status,
                            ),
                        }}
                      >
                        {o.status}
                      </span>
                    </div>

                    <div
                      style={
                        S.rowMeta
                      }
                    >
                      Customer #
                      {
                        o.customerId
                      }{" "}
                      • Washer{" "}
                      {o.washerId
                        ? `#${o.washerId}`
                        : "—"}
                    </div>

                    <div
                      style={
                        S.rowMeta
                      }
                    >
                      Payment:{" "}
                      {o.paymentMode ||
                        "—"}{" "}
                      •{" "}
                      {o.paymentStatus ||
                        "—"}
                    </div>

                    <div
                      style={
                        S.rowMeta
                      }
                    >
                      Address:{" "}
                      {o.address}
                    </div>

                    <div
                      style={
                        S.rowMeta
                      }
                    >
                      Scheduled:{" "}
                      {fmtDate(
                        o.scheduledAt,
                      )}
                    </div>
                  </div>

                  <div
                    style={
                      S.rowActions
                    }
                  >
                    <button
                      style={
                        S.viewBtn
                      }
                      onClick={() =>
                        loadDetails(
                          o.id,
                        )
                      }
                    >
                      View
                    </button>

                    <button
                      style={
                        S.mapBtn
                      }
                      onClick={() =>
                        openOrderMap(
                          o.id,
                        )
                      }
                    >
                      Open Map
                    </button>

                    <button
                      style={
                        S.deleteBtn
                      }
                      onClick={() =>
                        deleteOrder(
                          o.id,
                        )
                      }
                    >
                      Delete
                    </button>

                    {o.status ===
                    "CANCEL_REQUESTED" ? (
                      <>
                        <button
                          style={
                            S.approveBtn
                          }
                          onClick={() =>
                            approveCancel(
                              o.id,
                            )
                          }
                        >
                          Approve
                          cancel
                        </button>

                        <button
                          style={
                            S.rejectBtn
                          }
                          onClick={() =>
                            rejectCancel(
                              o.id,
                            )
                          }
                        >
                          Reject
                          cancel
                        </button>
                      </>
                    ) : null}
<div style={{ marginBottom: 20 }}>
  <AdminCancelRequestsPanel />
</div>
                    {o.paymentMode ===
                      "CASH" &&
                    o.paymentStatus !==
                      "PAID" ? (
                      <button
                        style={
                          S.cashBtn
                        }
                        onClick={() =>
                          markCashCollected(
                            o.id,
                          )
                        }
                      >
                        Cash
                        collected
                      </button>
                    ) : null}

                    {!o.isPaid ? (
                      <button
                        style={
                          S.markPaidBtn
                        }
                        onClick={() =>
                          markPaid(
                            o.id,
                          )
                        }
                      >
                        Mark paid
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
            <h2 style={S.cardTitle}>
              Order Details
            </h2>

            {selectedOrderId ? (
              <span
                style={
                  S.countPill
                }
              >
                #
                {
                  selectedOrderId
                }
              </span>
            ) : null}
          </div>

          {!selectedOrderId ? (
            <div style={S.empty}>
              Select an order.
            </div>
          ) : detailsLoading ? (
            <div style={S.empty}>
              Loading…
            </div>
          ) : detailsErr ? (
            <div style={S.empty}>
              ⚠️ {detailsErr}
            </div>
          ) : details ? (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={
                  S.detailBox
                }
              >
                <div
                  style={
                    S.detailTitle
                  }
                >
                  Order
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  ID: #
                  {
                    details.order
                      .id
                  }
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Status:{" "}
                  {
                    details.order
                      .status
                  }
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Address:{" "}
                  {
                    details.order
                      .address
                  }
                </div>
              </div>
            </div>
          ) : (
            <div style={S.empty}>
              No details.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

const S: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    padding: 16,
    background: "transparent",
    color: "var(--ink)",
    fontFamily:
      "ui-sans-serif,system-ui",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },

  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "var(--surface-2)",
    border:
      "1px solid var(--line)",
    fontWeight: 900,
    fontSize: 12,
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
    background: "var(--surface-2)",
    color: "var(--ink)",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    border:
      "1px solid var(--line)",
    cursor: "pointer",
    textDecoration: "none",
  },

  mapBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#6ae3ff",
    color: "#071d2c",
  },

  deleteBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#ff4d6d",
    color: "var(--ink)",
  },

  filtersCard: {
    background: "var(--surface)",
    border:
      "1px solid var(--line)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },

  filtersGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 10,
  },

  label: {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: "12px",
    borderRadius: 14,
    border:
      "1px solid var(--line)",
    background: "#fff",
    color: "var(--ink)",
  },

  primaryBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: 14,
    border: "none",
    fontWeight: 950,
    background: "var(--accent)",
    color: "#fff",
    cursor: "pointer",
  },

  layout: {
    display: "grid",
    gridTemplateColumns:
      "1.2fr 0.8fr",
    gap: 16,
  },

  card: {
    background: "var(--surface)",
    border:
      "1px solid var(--line)",
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
    justifyContent:
      "space-between",
    marginBottom: 12,
  },

  countPill: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "var(--surface-2)",
    fontWeight: 900,
  },

  listWrap: {
    display: "grid",
    gap: 10,
  },

  rowCard: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: 12,
    borderRadius: 16,
    background: "var(--surface-2)",
    border:
      "1px solid var(--line)",
  },

  rowMain: {
    flex: "1 1 260px",
  },

  rowTop: {
    display: "flex",
    gap: 10,
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
    border:
      "1px solid var(--line)",
    background: "var(--surface-2)",
    color: "var(--ink)",
    fontWeight: 900,
    cursor: "pointer",
  },

  approveBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  rejectBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    background: "#ff6363",
    color: "var(--ink)",
    fontWeight: 900,
    cursor: "pointer",
  },

  cashBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    background: "#ffd36a",
    color: "#2a2000",
    fontWeight: 900,
    cursor: "pointer",
  },

  markPaidBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    background: "#8fd3ff",
    color: "#071d2c",
    fontWeight: 900,
    cursor: "pointer",
  },

  empty: {
    opacity: 0.8,
  },

  detailBox: {
    padding: 12,
    borderRadius: 14,
    background: "var(--surface-2)",
  },

  detailTitle: {
    fontWeight: 950,
    marginBottom: 8,
  },

  detailMeta: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.84,
  },
};