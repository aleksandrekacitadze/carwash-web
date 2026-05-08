"use client";

import React, {
  useEffect,
  useState,
} from "react";

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

  if (Number.isNaN(d.getTime()))
    return "—";

  return d.toLocaleString();
}

function statusColor(
  status?: string,
) {
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
  const [orders, setOrders] =
    useState<OrderItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [err, setErr] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [paymentMode, setPaymentMode] =
    useState("");

  const [
    paymentStatus,
    setPaymentStatus,
  ] = useState("");

  const [q, setQ] =
    useState("");

  const [
    workingId,
    setWorkingId,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedOrderId,
    setSelectedOrderId,
  ] = useState<number | null>(
    null,
  );

  const [details, setDetails] =
    useState<OrderDetails | null>(
      null,
    );

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    detailsErr,
    setDetailsErr,
  ] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setErr("");

      const params =
        new URLSearchParams();

      if (status)
        params.set(
          "status",
          status,
        );

      if (paymentMode)
        params.set(
          "paymentMode",
          paymentMode,
        );

      if (paymentStatus)
        params.set(
          "paymentStatus",
          paymentStatus,
        );

      if (q.trim())
        params.set(
          "q",
          q.trim(),
        );

      const url =
        params.toString()
          ? `/admin/orders?${params.toString()}`
          : "/admin/orders";

      const { data } =
        await api.get<OrderItem[]>(
          url,
        );

      setOrders(data || []);
    } catch (e: any) {
      setErr(
        e?.response?.data
          ?.message ||
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
      setSelectedOrderId(
        orderId,
      );

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
        e?.response?.data
          ?.message ||
          e?.message ||
          "Failed to load details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function deleteOrder(
    orderId: number,
  ) {
    const ok =
      window.confirm(
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
        selectedOrderId ===
        orderId
      ) {
        setSelectedOrderId(
          null,
        );

        setDetails(null);
      }

      await loadOrders();
    } catch (e: any) {
      alert(
        e?.response?.data
          ?.message ||
          e?.message ||
          "Delete failed.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

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
            Manage orders,
            maps,
            cancellations,
            payments.
          </div>
        </div>

        <div style={S.headerBtns}>
          <a
            href="/admin"
            style={S.btnGhost}
          >
            Dashboard
          </a>

          <a
            href="/admin/washers/map"
            style={S.mapBtn}
          >
            Live Washers Map
          </a>

          <button
            style={S.btnGhost}
            onClick={loadOrders}
          >
            Refresh
          </button>
        </div>
      </header>

      <section style={S.filtersCard}>
        <div style={S.filtersGrid}>
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
              All statuses
            </option>

            <option value="REQUESTED">
              REQUESTED
            </option>

            <option value="ACCEPTED">
              ACCEPTED
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
              All payment modes
            </option>

            <option value="CASH">
              CASH
            </option>

            <option value="DIRECT">
              DIRECT
            </option>

            <option value="CREDIT">
              CREDIT
            </option>
          </select>

          <input
            style={S.input}
            value={q}
            onChange={(e) =>
              setQ(
                e.target.value,
              )
            }
            placeholder="Search..."
          />

          <button
            style={S.primaryBtn}
            onClick={loadOrders}
          >
            Apply
          </button>
        </div>
      </section>

      {loading ? (
        <div style={S.card}>
          Loading...
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

            <div style={S.countPill}>
              {orders.length}
            </div>
          </div>

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
                    }
                  </div>

                  <div
                    style={
                      S.rowMeta
                    }
                  >
                    Washer:
                    {" "}
                    {o.washerId
                      ? `#${o.washerId}`
                      : "—"}
                  </div>

                  <div
                    style={
                      S.rowMeta
                    }
                  >
                    {
                      o.address
                    }
                  </div>

                  <div
                    style={
                      S.rowMeta
                    }
                  >
                    Payment:
                    {" "}
                    {
                      o.paymentMode
                    }{" "}
                    •{" "}
                    {
                      o.paymentStatus
                    }
                  </div>

                  <div
                    style={
                      S.rowMeta
                    }
                  >
                    Created:
                    {" "}
                    {fmtDate(
                      o.createdAt,
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

                  <a
                    href={`/admin/orders/${o.id}/map`}
                    style={
                      S.mapBtn
                    }
                  >
                    Open Map
                  </a>

                  <button
                    style={
                      S.deleteBtn
                    }
                    onClick={() =>
                      deleteOrder(
                        o.id,
                      )
                    }
                    disabled={
                      workingId ===
                      `delete-${o.id}`
                    }
                  >
                    {workingId ===
                    `delete-${o.id}`
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>
              Order Details
            </h2>

            {selectedOrderId ? (
              <div
                style={
                  S.countPill
                }
              >
                #
                {
                  selectedOrderId
                }
              </div>
            ) : null}
          </div>

          {!selectedOrderId ? (
            <div style={S.empty}>
              Select order
            </div>
          ) : detailsLoading ? (
            <div style={S.empty}>
              Loading...
            </div>
          ) : detailsErr ? (
            <div style={S.empty}>
              ⚠️{" "}
              {
                detailsErr
              }
            </div>
          ) : details ? (
            <div
              style={{
                display:
                  "grid",
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
                  ID:
                  {" "}
                  #
                  {
                    details
                      .order
                      .id
                  }
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Status:
                  {" "}
                  {
                    details
                      .order
                      .status
                  }
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Address:
                  {" "}
                  {
                    details
                      .order
                      .address
                  }
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Payment:
                  {" "}
                  {
                    details
                      .order
                      .paymentMode
                  }{" "}
                  •{" "}
                  {
                    details
                      .order
                      .paymentStatus
                  }
                </div>
              </div>

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
                  Customer
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Name:
                  {" "}
                  {
                    details
                      .customer
                      ?.fullName ||
                    "—"
                  }
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Phone:
                  {" "}
                  {
                    details
                      .customer
                      ?.phone ||
                    "—"
                  }
                </div>
              </div>

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
                  Washer
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Name:
                  {" "}
                  {
                    details
                      .washer
                      ?.fullName ||
                    "—"
                  }
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Phone:
                  {" "}
                  {
                    details
                      .washer
                      ?.phone ||
                    "—"
                  }
                </div>
              </div>
            </div>
          ) : (
            <div style={S.empty}>
              No details
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
    padding: 14,
    background:
      "#0b0f19",
    color: "#fff",
    fontFamily:
      "system-ui",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },

  badge: {
    display: "inline-flex",
    padding:
      "6px 10px",
    borderRadius: 999,
    background:
      "rgba(255,255,255,0.10)",
    border:
      "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    fontSize: 12,
  },

  title: {
    margin:
      "8px 0 0",
    fontSize: 30,
    fontWeight: 950,
  },

  sub: {
    marginTop: 6,
    opacity: 0.8,
  },

  headerBtns: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    width: "100%",
    maxWidth: 500,
  },

  btnGhost: {
    flex: 1,
    background:
      "rgba(255,255,255,0.10)",
    color: "#fff",
    padding:
      "12px 14px",
    borderRadius: 14,
    fontWeight: 900,
    border:
      "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    textDecoration:
      "none",
    textAlign: "center",
  },

  filtersCard: {
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.12)",
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

  input: {
    width: "100%",
    padding:
      "12px 12px",
    borderRadius: 14,
    border:
      "1px solid rgba(255,255,255,0.14)",
    background:
      "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
  },

  primaryBtn: {
    width: "100%",
    padding:
      "12px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background:
      "#3cffb1",
    color: "#062112",
  },

  layout: {
    display: "grid",
    gridTemplateColumns:
      "1fr",
    gap: 16,
  },

  card: {
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },

  sectionTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  cardTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 950,
  },

  countPill: {
    padding:
      "6px 10px",
    borderRadius: 999,
    background:
      "rgba(255,255,255,0.10)",
    border:
      "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    fontSize: 12,
  },

  listWrap: {
    display: "grid",
    gap: 12,
  },

  rowCard: {
    display: "flex",
    flexDirection:
      "column",
    gap: 14,
    padding: 14,
    borderRadius: 18,
    background:
      "rgba(0,0,0,0.18)",
    border:
      "1px solid rgba(255,255,255,0.10)",
  },

  rowMain: {
    minWidth: 0,
  },

  rowTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  rowTitle: {
    fontWeight: 950,
    fontSize: 17,
  },

  rowMeta: {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.84,
    wordBreak:
      "break-word",
  },

  rowActions: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(120px,1fr))",
    gap: 10,
  },

  statusPill: {
    padding:
      "6px 10px",
    borderRadius: 999,
    border:
      "1px solid",
    fontWeight: 900,
    fontSize: 12,
  },

  viewBtn: {
    padding:
      "12px 14px",
    borderRadius: 14,
    border:
      "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    fontWeight: 900,
    background:
      "rgba(255,255,255,0.10)",
    color: "#fff",
  },

  mapBtn: {
    padding:
      "12px 14px",
    borderRadius: 14,
    border:
      "1px solid rgba(60,255,177,0.24)",
    cursor: "pointer",
    fontWeight: 900,
    background:
      "rgba(60,255,177,0.12)",
    color: "#c8ffe7",
    textDecoration:
      "none",
    textAlign: "center",
  },

  deleteBtn: {
    padding:
      "12px 14px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background:
      "#ff4d4d",
    color: "#fff",
  },

  empty: {
    opacity: 0.8,
  },

  detailBox: {
    padding: 12,
    borderRadius: 14,
    background:
      "rgba(0,0,0,0.18)",
    border:
      "1px solid rgba(255,255,255,0.10)",
  },

  detailTitle: {
    fontWeight: 950,
    marginBottom: 8,
  },

  detailMeta: {
    fontSize: 13,
    opacity: 0.84,
    marginTop: 4,
    wordBreak:
      "break-word",
  },
};