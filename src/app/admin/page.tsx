"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type DashboardSummary = {
  users: {
    total: number;
    customers: number;
    washers: number;
    pendingWashers: number;
  };
  orders: {
    total: number;
    requested: number;
    active: number;
    done: number;
    cancelRequests: number;
    byPaymentMode?: {
      credit: number;
      direct: number;
      cash: number;
    };
    cash?: {
      paid: number;
      pending: number;
    };
  };
  payments: {
    total: number;
    capturedCount: number;
    capturedAmount: string;
  };
  subscriptions: {
    total: number;
    active: number;
  };
  reviews: {
    total: number;
  };
};

type PendingWasher = {
  id: number;
  userId: number;
  fullName: string;
  city?: string | null;
  vehicleType?: string | null;
  plateNumber?: string | null;
  verificationStatus: string;
  submittedAt?: string | null;
  createdAt?: string;
};

type CancelRequest = {
  id: number;
  customerId: number;
  washerId: number | null;
  address: string;
  status: string;
  cancelReason?: string | null;
  cancelRequestedAt?: string | null;
  createdAt?: string;
  paymentMode?: string | null;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pendingWashers, setPendingWashers] = useState<PendingWasher[]>([]);
  const [cancelRequests, setCancelRequests] = useState<CancelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function registerServiceWorker() {
    if (typeof window === "undefined") return null;
    if (!("serviceWorker" in navigator)) return null;

    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;

    return navigator.serviceWorker.register("/sw.js");
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  async function subscribeAdminPush() {
    try {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;

      const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
      if (!publicKey) {
        console.warn("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY is missing");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Notification permission not granted");
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const subJson = subscription.toJSON();

      await api.post("/push-subscriptions", {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
        userAgent: navigator.userAgent,
        deviceType: "web",
        isActive: true,
      });
    } catch (error) {
      console.error("Failed to subscribe admin push:", error);
    }
  }

  async function loadAll() {
    try {
      setLoading(true);
      setErr("");

      const [summaryRes, washersRes, cancelRes] = await Promise.all([
        api.get<DashboardSummary>("/admin/dashboard/summary"),
        api.get<PendingWasher[]>("/admin/washers/pending"),
        api.get<CancelRequest[]>("/admin/orders/cancel-requests"),
      ]);

      setSummary(summaryRes.data);
      setPendingWashers(washersRes.data || []);
      setCancelRequests(cancelRes.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      await registerServiceWorker();
      await subscribeAdminPush();
      await loadAll();
    }

    init();
  }, []);

  async function approveWasher(userId: number) {
    try {
      setWorkingId(`approve-${userId}`);
      await api.post(`/admin/washers/${userId}/approve`);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to approve washer.");
    } finally {
      setWorkingId(null);
    }
  }

  async function rejectWasher(userId: number) {
    const reason = window.prompt("Reject reason:", "Rejected");
    if (reason == null) return;

    try {
      setWorkingId(`reject-${userId}`);
      await api.post(`/admin/washers/${userId}/reject`, { reason });
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to reject washer.");
    } finally {
      setWorkingId(null);
    }
  }

  async function approveCancel(orderId: number) {
    try {
      setWorkingId(`cancel-approve-${orderId}`);
      await api.post(`/admin/orders/${orderId}/cancel-decision`, {
        approve: true,
        chargePercent: 0,
        adminDecisionNote: "Approved by admin",
        refundCustomerCreditOnCancel: true,
      });
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to approve cancel.");
    } finally {
      setWorkingId(null);
    }
  }

  async function rejectCancel(orderId: number) {
    try {
      setWorkingId(`cancel-reject-${orderId}`);
      await api.post(`/admin/orders/${orderId}/cancel-decision`, {
        approve: false,
        adminDecisionNote: "Cancel rejected by admin",
      });
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to reject cancel.");
    } finally {
      setWorkingId(null);
    }
  }

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        title: "Customers",
        value: summary.users.customers,
        sub: `Total users: ${summary.users.total}`,
      },
      {
        title: "Washers",
        value: summary.users.washers,
        sub: `Pending: ${summary.users.pendingWashers}`,
      },
      {
        title: "Orders",
        value: summary.orders.total,
        sub: `Active: ${summary.orders.active} • Done: ${summary.orders.done}`,
      },
      {
        title: "Cancel Requests",
        value: summary.orders.cancelRequests,
        sub: `Requested orders: ${summary.orders.requested}`,
      },
      {
        title: "Revenue",
        value: `${summary.payments.capturedAmount}`,
        sub: `Captured payments: ${summary.payments.capturedCount}`,
      },
      {
        title: "Subscriptions",
        value: summary.subscriptions.active,
        sub: `Total subscriptions: ${summary.subscriptions.total}`,
      },
    ];
  }, [summary]);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Admin Panel</div>
          <h1 style={S.title}>Dashboard</h1>
          <div style={S.sub}>
            Manage washers, cancellations, users, orders, payments and subscriptions.
          </div>
        </div>

        <div style={S.headerBtns}>
          <a href="/admin/washers" style={S.btnGhost}>Washers</a>
          <a href="/admin/orders" style={S.btnGhost}>Orders</a>
          <a href="/admin/users" style={S.btnGhost}>Users</a>
          <a href="/admin/support" style={S.btnGhost}>Support</a>
          <a href="/admin/services" style={S.btnGhost}>Services</a>
          <button style={S.btnGhost} onClick={loadAll}>Refresh</button>
          
        </div>
      </header>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? <div style={S.card}><b>⚠️</b> {err}</div> : null}

      {summary ? (
        <>
          <section style={S.statsGrid}>
            {cards.map((c) => (
              <div key={c.title} style={S.statCard}>
                <div style={S.statTitle}>{c.title}</div>
                <div style={S.statValue}>{c.value}</div>
                <div style={S.statSub}>{c.sub}</div>
              </div>
            ))}
          </section>

          <section style={S.twoCol}>
            <div style={S.card}>
              <div style={S.sectionTop}>
                <h2 style={S.cardTitle}>Payment Modes</h2>
                <a href="/admin/orders" style={S.linkBtn}>View orders →</a>
              </div>

              <div style={S.miniGrid}>
                <div style={S.miniBox}>
                  <div style={S.miniLabel}>Credit</div>
                  <div style={S.miniValue}>{summary.orders.byPaymentMode?.credit ?? 0}</div>
                </div>
                <div style={S.miniBox}>
                  <div style={S.miniLabel}>Direct</div>
                  <div style={S.miniValue}>{summary.orders.byPaymentMode?.direct ?? 0}</div>
                </div>
                <div style={S.miniBox}>
                  <div style={S.miniLabel}>Cash</div>
                  <div style={S.miniValue}>{summary.orders.byPaymentMode?.cash ?? 0}</div>
                </div>
                <div style={S.miniBox}>
                  <div style={S.miniLabel}>Cash Paid</div>
                  <div style={S.miniValue}>{summary.orders.cash?.paid ?? 0}</div>
                </div>
                <div style={S.miniBox}>
                  <div style={S.miniLabel}>Cash Pending</div>
                  <div style={S.miniValue}>{summary.orders.cash?.pending ?? 0}</div>
                </div>
                <div style={S.miniBox}>
                  <div style={S.miniLabel}>Reviews</div>
                  <div style={S.miniValue}>{summary.reviews.total}</div>
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.sectionTop}>
                <h2 style={S.cardTitle}>Quick Links</h2>
              </div>

              <div style={S.quickLinks}>
                <a href="/admin/washers" style={S.quickLink}>Manage Washers</a>
                <a href="/admin/orders" style={S.quickLink}>Manage Orders</a>
                <a href="/admin/users" style={S.quickLink}>Manage Users</a>
                <a href="/admin/payments" style={S.quickLink}>View Payments</a>
                <a href="/admin/subscriptions" style={S.quickLink}>View Subscriptions</a>
                <a href="/admin/reviews" style={S.quickLink}>View Reviews</a>
                <a href="/admin/support" style={S.quickLink}>Support Chats</a>
                <a href="/admin/services" style={S.quickLink}>Manage Services</a>
              </div>
            </div>
          </section>

          <section style={S.twoCol}>
            <div style={S.card}>
              <div style={S.sectionTop}>
                <h2 style={S.cardTitle}>Pending Washers</h2>
                <span style={S.countPill}>{pendingWashers.length}</span>
              </div>

              {pendingWashers.length === 0 ? (
                <div style={S.empty}>No pending washers.</div>
              ) : (
                <div style={S.listWrap}>
                  {pendingWashers.map((w) => (
                    <div key={w.userId} style={S.rowCard}>
                      <div style={S.rowMain}>
                        <div style={S.rowTitle}>{w.fullName}</div>
                        <div style={S.rowMeta}>
                          {w.city || "—"} • {w.vehicleType || "—"} • {w.plateNumber || "No plate"}
                        </div>
                        <div style={S.rowMeta}>
                          Submitted: {fmtDate(w.submittedAt || w.createdAt)}
                        </div>
                      </div>

                      <div style={S.rowActions}>
                        <button
                          style={S.approveBtn}
                          onClick={() => approveWasher(w.userId)}
                          disabled={workingId === `approve-${w.userId}`}
                        >
                          {workingId === `approve-${w.userId}` ? "Approving..." : "Approve"}
                        </button>

                        <button
                          style={S.rejectBtn}
                          onClick={() => rejectWasher(w.userId)}
                          disabled={workingId === `reject-${w.userId}`}
                        >
                          {workingId === `reject-${w.userId}` ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={S.card}>
              <div style={S.sectionTop}>
                <h2 style={S.cardTitle}>Cancel Requests</h2>
                <span style={S.countPill}>{cancelRequests.length}</span>
              </div>

              {cancelRequests.length === 0 ? (
                <div style={S.empty}>No cancel requests.</div>
              ) : (
                <div style={S.listWrap}>
                  {cancelRequests.map((o) => (
                    <div key={o.id} style={S.rowCard}>
                      <div style={S.rowMain}>
                        <div style={S.rowTitle}>Order #{o.id}</div>
                        <div style={S.rowMeta}>
                          Customer #{o.customerId} • Washer {o.washerId ? `#${o.washerId}` : "—"}
                        </div>
                        <div style={S.rowMeta}>Payment: {o.paymentMode || "—"}</div>
                        <div style={S.rowMeta}>Address: {o.address}</div>
                        <div style={S.rowMeta}>Reason: {o.cancelReason || "No reason"}</div>
                        <div style={S.rowMeta}>
                          Requested: {fmtDate(o.cancelRequestedAt || o.createdAt)}
                        </div>
                      </div>

                      <div style={S.rowActions}>
                        <button
                          style={S.approveBtn}
                          onClick={() => approveCancel(o.id)}
                          disabled={workingId === `cancel-approve-${o.id}`}
                        >
                          {workingId === `cancel-approve-${o.id}` ? "Approving..." : "Approve"}
                        </button>

                        <button
                          style={S.rejectBtn}
                          onClick={() => rejectCancel(o.id)}
                          disabled={workingId === `cancel-reject-${o.id}`}
                        >
                          {workingId === `cancel-reject-${o.id}` ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },
  statTitle: {
    opacity: 0.8,
    fontSize: 12,
    fontWeight: 900,
  },
  statValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: 950,
  },
  statSub: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.75,
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    marginBottom: 16,
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
  linkBtn: {
    color: "#fff",
    textDecoration: "none",
    opacity: 0.85,
    fontWeight: 800,
  },

  miniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10,
  },
  miniBox: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  miniLabel: {
    fontSize: 12,
    opacity: 0.75,
    fontWeight: 900,
  },
  miniValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: 950,
  },

  quickLinks: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  quickLink: {
    padding: "12px 12px",
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
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

  empty: {
    opacity: 0.8,
    fontSize: 14,
  },
};