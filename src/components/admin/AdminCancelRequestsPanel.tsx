"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type OrderItem = {
  id: number;

  status: string;

  address: string;

  customerId: number;

  washerId?: number | null;

  paymentMode?: string | null;

  paymentStatus?: string | null;

  cancelReason?: string | null;

  cancelRequestedBy?: string | null;

  adminDecisionNote?: string | null;

  createdAt?: string;
};

export default function AdminCancelRequestsPanel() {
  const [orders, setOrders] =
    useState<OrderItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [workingId, setWorkingId] =
    useState<number | null>(null);

  // -----------------------------------------
  // LOAD CANCEL REQUESTS
  // -----------------------------------------

  async function loadOrders() {
    try {
      setLoading(true);

      const { data } =
        await api.get<OrderItem[]>(
          "/admin/orders?status=CANCEL_REQUESTED",
        );

      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();

    const interval =
      setInterval(() => {
        loadOrders();
      }, 5000);

    return () =>
      clearInterval(interval);
  }, []);

  // -----------------------------------------
  // APPROVE
  // -----------------------------------------

  async function approveCancel(
    orderId: number,
  ) {
    try {
      setWorkingId(orderId);

      await api.patch(
        `/orders/${orderId}/admin-cancel-decision`,
        {
          approve: true,

          adminNote:
            "Cancel approved by admin",
        },
      );

      await loadOrders();
    } catch (err: any) {
      alert(
        err?.response?.data
          ?.message ||
          "Failed to approve",
      );
    } finally {
      setWorkingId(null);
    }
  }

  // -----------------------------------------
  // REJECT
  // -----------------------------------------

  async function rejectCancel(
    orderId: number,
  ) {
    try {
      setWorkingId(orderId);

      await api.patch(
        `/orders/${orderId}/admin-cancel-decision`,
        {
          approve: false,

          adminNote:
            "Cancel rejected by admin",
        },
      );

      await loadOrders();
    } catch (err: any) {
      alert(
        err?.response?.data
          ?.message ||
          "Failed to reject",
      );
    } finally {
      setWorkingId(null);
    }
  }

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          Cancel Requests
        </h2>

        <div style={styles.badge}>
          {orders.length}
        </div>
      </div>

      {loading ? (
        <div style={styles.empty}>
          Loading...
        </div>
      ) : orders.length === 0 ? (
        <div style={styles.empty}>
          No cancel requests.
        </div>
      ) : (
        <div style={styles.list}>
          {orders.map((o) => (
            <div
              key={o.id}
              style={styles.card}
            >
              <div
                style={styles.top}
              >
                <div>
                  <div
                    style={
                      styles.orderId
                    }
                  >
                    Order #{o.id}
                  </div>

                  <div
                    style={
                      styles.meta
                    }
                  >
                    {o.address}
                  </div>
                </div>

                <div
                  style={
                    styles.status
                  }
                >
                  CANCEL_REQUESTED
                </div>
              </div>

              <div style={styles.meta}>
                Customer: #
                {o.customerId}
              </div>

              <div style={styles.meta}>
                Washer: #
                {o.washerId ??
                  "—"}
              </div>

              <div style={styles.meta}>
                Payment:{" "}
                {o.paymentMode ??
                  "—"}{" "}
                •{" "}
                {o.paymentStatus ??
                  "—"}
              </div>

              <div style={styles.meta}>
                Requested By:{" "}
                <b>
                  {o.cancelRequestedBy ??
                    "UNKNOWN"}
                </b>
              </div>

              <div
                style={
                  styles.reasonBox
                }
              >
                <div
                  style={
                    styles.reasonTitle
                  }
                >
                  Reason
                </div>

                <div
                  style={
                    styles.reasonText
                  }
                >
                  {o.cancelReason ||
                    "No reason"}
                </div>
              </div>

              <div
                style={
                  styles.actions
                }
              >
                <button
                  onClick={() =>
                    approveCancel(
                      o.id,
                    )
                  }
                  disabled={
                    workingId ===
                    o.id
                  }
                  style={
                    styles.approveBtn
                  }
                >
                  {workingId ===
                  o.id
                    ? "Loading..."
                    : "Approve"}
                </button>

                <button
                  onClick={() =>
                    rejectCancel(
                      o.id,
                    )
                  }
                  disabled={
                    workingId ===
                    o.id
                  }
                  style={
                    styles.rejectBtn
                  }
                >
                  {workingId ===
                  o.id
                    ? "Loading..."
                    : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<
  string,
  any
> = {
  wrapper: {
    width: "100%",

    background: "var(--surface)",

    border:
      "1px solid var(--line)",

    borderRadius: 24,

    padding: 20,

    backdropFilter:
      "blur(12px)",

    display: "flex",

    flexDirection: "column",

    gap: 16,
  },

  header: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",
  },

  title: {
    margin: 0,

    color: "white",

    fontSize: 22,

    fontWeight: 800,
  },

  badge: {
    minWidth: 34,

    height: 34,

    borderRadius: 999,

    display: "flex",

    alignItems: "center",

    justifyContent:
      "center",

    background:
      "rgba(239,68,68,0.2)",

    color: "#ef4444",

    fontWeight: 800,
  },

  list: {
    display: "flex",

    flexDirection: "column",

    gap: 14,
  },

  card: {
    background: "#fff",

    border:
      "1px solid var(--line)",

    borderRadius: 18,

    padding: 16,

    display: "flex",

    flexDirection: "column",

    gap: 10,
  },

  top: {
    display: "flex",

    justifyContent:
      "space-between",

    gap: 10,
  },

  orderId: {
    color: "white",

    fontWeight: 800,

    fontSize: 18,
  },

  meta: {
    color:
      "rgba(255,255,255,0.72)",

    fontSize: 14,
  },

  status: {
    padding: "8px 12px",

    borderRadius: 999,

    background:
      "rgba(245,158,11,0.18)",

    color: "#f59e0b",

    fontWeight: 700,

    fontSize: 12,

    height: "fit-content",
  },

  reasonBox: {
    background:
      "rgba(255,255,255,0.05)",

    borderRadius: 14,

    padding: 12,
  },

  reasonTitle: {
    color: "white",

    fontWeight: 700,

    marginBottom: 6,
  },

  reasonText: {
    color:
      "rgba(255,255,255,0.75)",

    lineHeight: 1.5,
  },

  actions: {
    display: "flex",

    gap: 10,

    marginTop: 6,
  },

  approveBtn: {
    flex: 1,

    border: "none",

    borderRadius: 14,

    padding: "14px 16px",

    background: "#22c55e",

    color: "white",

    fontWeight: 800,

    cursor: "pointer",
  },

  rejectBtn: {
    flex: 1,

    border: "none",

    borderRadius: 14,

    padding: "14px 16px",

    background: "#ef4444",

    color: "white",

    fontWeight: 800,

    cursor: "pointer",
  },

  empty: {
    color:
      "rgba(255,255,255,0.7)",

    textAlign: "center",

    padding: 20,
  },
};