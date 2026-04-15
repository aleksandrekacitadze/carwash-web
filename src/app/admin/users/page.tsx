"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

type UserItem = {
  id: number;
  phone?: string | null;
  fullName?: string | null;
  role?: string;
  createdAt?: string;
  lastLat?: number | null;
  lastLng?: number | null;
  lastSeenAt?: string | null;
};

type UserDetails = {
  user: UserItem;
  washerProfile?: {
    id?: number;
    userId?: number;
    fullName?: string;
    city?: string | null;
    vehicleType?: string | null;
    plateNumber?: string | null;
    contactPhone?: string | null;
    verificationStatus?: string;
    washBalance?: number;
    createdAt?: string;
  } | null;
  recentOrders?: Array<{
    id: number;
    status: string;
    address: string;
    customerId: number;
    washerId: number | null;
    paymentMode?: string | null;
    paymentStatus?: string | null;
    isPaid?: boolean;
    createdAt?: string;
  }>;
  recentPayments?: Array<{
    id: number;
    kind: string;
    provider: string;
    status: string;
    amount: string;
    currency: string;
    providerOrderId?: string | null;
    createdAt?: string;
  }>;
  subscriptions?: Array<{
    id: number;
    planId: number;
    status: string;
    creditsLeft: number;
    activeUntil?: string;
  }>;
  reviewsGiven?: Array<{
    id: number;
    rating: number;
    comment?: string | null;
    washerId: number;
    createdAt?: string;
  }>;
  reviewsReceived?: Array<{
    id: number;
    rating: number;
    comment?: string | null;
    customerId: number;
    createdAt?: string;
  }>;
  stats?: {
    reviewsReceivedCount?: number;
    reviewsReceivedAvg?: number;
  };
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function roleColor(role?: string) {
  switch (role) {
    case "ADMIN":
      return "#ffd36a";
    case "WASHER":
      return "#8fd3ff";
    case "CUSTOMER":
      return "#3cffb1";
    default:
      return "#c3cad4";
  }
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [role, setRole] = useState("");
  const [q, setQ] = useState("");

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (q.trim()) params.set("q", q.trim());

      const url = params.toString()
        ? `/admin/users?${params.toString()}`
        : "/admin/users";

      const { data } = await api.get<UserItem[]>(url);
      setItems(data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(userId: number) {
    try {
      setSelectedUserId(userId);
      setDetailsLoading(true);
      setDetailsErr("");

      const { data } = await api.get<UserDetails>(`/admin/users/${userId}`);
      setDetails(data);
    } catch (e: any) {
      setDetails(null);
      setDetailsErr(e?.response?.data?.message || e?.message || "Failed to load user details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function applyFilters() {
    await loadUsers();
  }

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Admin Panel</div>
          <h1 style={S.title}>Users</h1>
          <div style={S.sub}>Search users, inspect accounts, orders, payments, subscriptions, and washer profiles.</div>
        </div>

        <div style={S.headerBtns}>
          <a href="/admin" style={S.btnGhost}>Dashboard</a>
          <button style={S.btnGhost} onClick={loadUsers}>Refresh</button>
        </div>
      </header>

      <section style={S.filtersCard}>
        <div style={S.filtersGrid}>
          <div>
            <div style={S.label}>Role</div>
            <select
              style={S.input}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">All</option>
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="WASHER">WASHER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div>
            <div style={S.label}>Search</div>
            <input
              style={S.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Phone, full name, user id..."
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
            <h2 style={S.cardTitle}>Users</h2>
            <span style={S.countPill}>{items.length}</span>
          </div>

          {items.length === 0 ? (
            <div style={S.empty}>No users found.</div>
          ) : (
            <div style={S.listWrap}>
              {items.map((u) => (
                <div key={u.id} style={S.rowCard}>
                  <div style={S.rowMain}>
                    <div style={S.rowTop}>
                      <div style={S.rowTitle}>{u.fullName || `User #${u.id}`}</div>
                      <span
                        style={{
                          ...S.statusPill,
                          borderColor: roleColor(u.role),
                          color: roleColor(u.role),
                        }}
                      >
                        {u.role || "—"}
                      </span>
                    </div>

                    <div style={S.rowMeta}>ID: #{u.id}</div>
                    <div style={S.rowMeta}>Phone: {u.phone || "—"}</div>
                    <div style={S.rowMeta}>Created: {fmtDate(u.createdAt)}</div>
                    <div style={S.rowMeta}>
                      Last seen: {fmtDate(u.lastSeenAt)}
                    </div>
                    <div style={S.rowMeta}>
                      Location:{" "}
                      {u.lastLat != null && u.lastLng != null
                        ? `${u.lastLat}, ${u.lastLng}`
                        : "—"}
                    </div>
                  </div>

                  <div style={S.rowActions}>
                    <button style={S.viewBtn} onClick={() => loadDetails(u.id)}>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>User Details</h2>
            {selectedUserId ? <span style={S.countPill}>User #{selectedUserId}</span> : null}
          </div>

          {!selectedUserId ? (
            <div style={S.empty}>Select a user to view details.</div>
          ) : detailsLoading ? (
            <div style={S.empty}>Loading details…</div>
          ) : detailsErr ? (
            <div style={S.empty}>⚠️ {detailsErr}</div>
          ) : details ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={S.detailBox}>
                <div style={S.detailTitle}>Basic Info</div>
                <div style={S.detailMeta}>ID: #{details.user.id}</div>
                <div style={S.detailMeta}>Name: {details.user.fullName || "—"}</div>
                <div style={S.detailMeta}>Phone: {details.user.phone || "—"}</div>
                <div style={S.detailMeta}>Role: {details.user.role || "—"}</div>
                <div style={S.detailMeta}>Created: {fmtDate(details.user.createdAt)}</div>
                <div style={S.detailMeta}>Last seen: {fmtDate(details.user.lastSeenAt)}</div>
                <div style={S.detailMeta}>
                  Location:{" "}
                  {details.user.lastLat != null && details.user.lastLng != null
                    ? `${details.user.lastLat}, ${details.user.lastLng}`
                    : "—"}
                </div>
              </div>

              {details.washerProfile ? (
                <div style={S.detailBox}>
                  <div style={S.detailTitle}>Washer Profile</div>
                  <div style={S.detailMeta}>Full name: {details.washerProfile.fullName || "—"}</div>
                  <div style={S.detailMeta}>City: {details.washerProfile.city || "—"}</div>
                  <div style={S.detailMeta}>Vehicle: {details.washerProfile.vehicleType || "—"}</div>
                  <div style={S.detailMeta}>Plate: {details.washerProfile.plateNumber || "—"}</div>
                  <div style={S.detailMeta}>Contact phone: {details.washerProfile.contactPhone || "—"}</div>
                  <div style={S.detailMeta}>Verification: {details.washerProfile.verificationStatus || "—"}</div>
                  <div style={S.detailMeta}>Wash balance: {details.washerProfile.washBalance ?? 0}</div>
                  <div style={S.detailMeta}>Created: {fmtDate(details.washerProfile.createdAt)}</div>
                </div>
              ) : null}

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Review Stats</div>
                <div style={S.detailMeta}>
                  Reviews received count: {details.stats?.reviewsReceivedCount ?? 0}
                </div>
                <div style={S.detailMeta}>
                  Reviews received avg: {details.stats?.reviewsReceivedAvg ?? 0}
                </div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Recent Orders</div>
                {details.recentOrders?.length ? (
                  <div style={S.innerList}>
                    {details.recentOrders.map((o) => (
                      <div key={o.id} style={S.innerItem}>
                        <div style={S.detailMeta}>Order #{o.id}</div>
                        <div style={S.detailMeta}>{o.status}</div>
                        <div style={S.detailMeta}>{o.address}</div>
                        <div style={S.detailMeta}>
                          {o.paymentMode || "—"} • {o.paymentStatus || "—"} • Paid:{" "}
                          {o.isPaid ? "YES" : "NO"}
                        </div>
                        <div style={S.detailMeta}>{fmtDate(o.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No recent orders.</div>
                )}
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Recent Payments</div>
                {details.recentPayments?.length ? (
                  <div style={S.innerList}>
                    {details.recentPayments.map((p) => (
                      <div key={p.id} style={S.innerItem}>
                        <div style={S.detailMeta}>Payment #{p.id}</div>
                        <div style={S.detailMeta}>{p.kind} • {p.provider} • {p.status}</div>
                        <div style={S.detailMeta}>{p.amount} {p.currency}</div>
                        <div style={S.detailMeta}>Provider order: {p.providerOrderId || "—"}</div>
                        <div style={S.detailMeta}>{fmtDate(p.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No recent payments.</div>
                )}
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Subscriptions</div>
                {details.subscriptions?.length ? (
                  <div style={S.innerList}>
                    {details.subscriptions.map((s) => (
                      <div key={s.id} style={S.innerItem}>
                        <div style={S.detailMeta}>Subscription #{s.id}</div>
                        <div style={S.detailMeta}>Plan #{s.planId} • {s.status}</div>
                        <div style={S.detailMeta}>Credits left: {s.creditsLeft}</div>
                        <div style={S.detailMeta}>Active until: {fmtDate(s.activeUntil)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No subscriptions.</div>
                )}
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Reviews Given</div>
                {details.reviewsGiven?.length ? (
                  <div style={S.innerList}>
                    {details.reviewsGiven.map((r) => (
                      <div key={r.id} style={S.innerItem}>
                        <div style={S.detailMeta}>⭐ {r.rating}</div>
                        <div style={S.detailMeta}>To washer #{r.washerId}</div>
                        <div style={S.detailMeta}>{r.comment || "No comment"}</div>
                        <div style={S.detailMeta}>{fmtDate(r.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No given reviews.</div>
                )}
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Reviews Received</div>
                {details.reviewsReceived?.length ? (
                  <div style={S.innerList}>
                    {details.reviewsReceived.map((r) => (
                      <div key={r.id} style={S.innerItem}>
                        <div style={S.detailMeta}>⭐ {r.rating}</div>
                        <div style={S.detailMeta}>From customer #{r.customerId}</div>
                        <div style={S.detailMeta}>{r.comment || "No comment"}</div>
                        <div style={S.detailMeta}>{fmtDate(r.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No received reviews.</div>
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
    gridTemplateColumns: "1fr 1.5fr auto",
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
    gridTemplateColumns: "1.05fr 0.95fr",
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