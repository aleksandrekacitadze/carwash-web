"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED" | "NONE";

type WasherItem = {
  id: number;
  userId: number;
  fullName: string;
  city?: string | null;
  vehicleType?: string | null;
  plateNumber?: string | null;
  notes?: string | null;
  contactPhone?: string | null;
  personalIdNumber?: string | null;
  verificationStatus: VerificationStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type WasherDetailsResponse = {
  washer: WasherItem & {
    idFrontUrl?: string | null;
    idBackUrl?: string | null;
    selfieUrl?: string | null;
    driverLicenseUrl?: string | null;
    vehicleRegistrationUrl?: string | null;
    washBalance?: number;
  };
  user?: {
    id: number;
    phone?: string | null;
    fullName?: string | null;
    role?: string;
    createdAt?: string;
    lastLat?: number | null;
    lastLng?: number | null;
    lastSeenAt?: string | null;
  } | null;
  stats?: {
    totalReviews?: number;
    avgRating?: number;
    totalOrders?: number;
    washBalance?: number;
  };
  recentReviews?: Array<{
    id: number;
    rating: number;
    comment?: string | null;
    createdAt?: string;
  }>;
  recentOrders?: Array<{
    id: number;
    status: string;
    address: string;
    createdAt?: string;
    paymentMode?: string | null;
    paymentStatus?: string | null;
  }>;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusColor(status: VerificationStatus) {
  if (status === "APPROVED") return "#3cffb1";
  if (status === "REJECTED") return "#ff7a7a";
  if (status === "PENDING") return "#ffd36a";
  return "#b8c0cc";
}

export default function AdminWashersPage() {
  const [items, setItems] = useState<WasherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");

  const [workingId, setWorkingId] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [details, setDetails] = useState<WasherDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");

  async function loadWashers() {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());

      const url = params.toString()
        ? `/admin/washers?${params.toString()}`
        : "/admin/washers";

      const { data } = await api.get<WasherItem[]>(url);
      setItems(data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load washers.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(userId: number) {
    try {
      setDetailsLoading(true);
      setDetailsErr("");
      setSelectedUserId(userId);

      const { data } = await api.get<WasherDetailsResponse>(`/admin/washers/${userId}`);
      setDetails(data);
    } catch (e: any) {
      setDetails(null);
      setDetailsErr(e?.response?.data?.message || e?.message || "Failed to load washer details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    loadWashers();
  }, []);

  async function applyFilters() {
    await loadWashers();
  }

  async function approveWasher(userId: number) {
    try {
      setWorkingId(`approve-${userId}`);
      await api.post(`/admin/washers/${userId}/approve`);
      await loadWashers();
      if (selectedUserId === userId) {
        await loadDetails(userId);
      }
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
      await loadWashers();
      if (selectedUserId === userId) {
        await loadDetails(userId);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to reject washer.");
    } finally {
      setWorkingId(null);
    }
  }

  const counts = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((x) => x.verificationStatus === "PENDING").length,
      approved: items.filter((x) => x.verificationStatus === "APPROVED").length,
      rejected: items.filter((x) => x.verificationStatus === "REJECTED").length,
    };
  }, [items]);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Admin Panel</div>
          <h1 style={S.title}>Washers</h1>
          <div style={S.sub}>Review, approve, reject, and inspect washer profiles.</div>
        </div>

        <div style={S.headerBtns}>
          <a href="/admin" style={S.btnGhost}>Dashboard</a>
          <button style={S.btnGhost} onClick={loadWashers}>Refresh</button>
        </div>
      </header>

      <section style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={S.statTitle}>Total</div>
          <div style={S.statValue}>{counts.total}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statTitle}>Pending</div>
          <div style={S.statValue}>{counts.pending}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statTitle}>Approved</div>
          <div style={S.statValue}>{counts.approved}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statTitle}>Rejected</div>
          <div style={S.statValue}>{counts.rejected}</div>
        </div>
      </section>

      <section style={S.filtersCard}>
        <div style={S.filtersGrid}>
          <div>
            <div style={S.label}>Status</div>
            <select
              style={S.input}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <div style={S.label}>Search</div>
            <input
              style={S.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, city, phone, plate..."
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
            <h2 style={S.cardTitle}>All Washers</h2>
            <span style={S.countPill}>{items.length}</span>
          </div>

          {items.length === 0 ? (
            <div style={S.empty}>No washers found.</div>
          ) : (
            <div style={S.listWrap}>
              {items.map((w) => (
                <div key={w.userId} style={S.rowCard}>
                  <div style={S.rowMain}>
                    <div style={S.rowTop}>
                      <div style={S.rowTitle}>{w.fullName}</div>
                      <span
                        style={{
                          ...S.statusPill,
                          borderColor: statusColor(w.verificationStatus),
                          color: statusColor(w.verificationStatus),
                        }}
                      >
                        {w.verificationStatus}
                      </span>
                    </div>

                    <div style={S.rowMeta}>
                      User #{w.userId} • {w.city || "—"} • {w.vehicleType || "—"}
                    </div>
                    <div style={S.rowMeta}>
                      Plate: {w.plateNumber || "—"} • Phone: {w.contactPhone || "—"}
                    </div>
                    <div style={S.rowMeta}>
                      Submitted: {fmtDate(w.submittedAt || w.createdAt)}
                    </div>

                    {w.rejectionReason ? (
                      <div style={S.rowMeta}>Reason: {w.rejectionReason}</div>
                    ) : null}
                  </div>

                  <div style={S.rowActions}>
                    <button
                      style={S.viewBtn}
                      onClick={() => loadDetails(w.userId)}
                    >
                      View
                    </button>

                    {w.verificationStatus !== "APPROVED" ? (
                      <button
                        style={S.approveBtn}
                        onClick={() => approveWasher(w.userId)}
                        disabled={workingId === `approve-${w.userId}`}
                      >
                        {workingId === `approve-${w.userId}` ? "Approving..." : "Approve"}
                      </button>
                    ) : null}

                    {w.verificationStatus !== "REJECTED" ? (
                      <button
                        style={S.rejectBtn}
                        onClick={() => rejectWasher(w.userId)}
                        disabled={workingId === `reject-${w.userId}`}
                      >
                        {workingId === `reject-${w.userId}` ? "Rejecting..." : "Reject"}
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
            <h2 style={S.cardTitle}>Washer Details</h2>
            {selectedUserId ? <span style={S.countPill}>User #{selectedUserId}</span> : null}
          </div>

          {!selectedUserId ? (
            <div style={S.empty}>Select a washer to view details.</div>
          ) : detailsLoading ? (
            <div style={S.empty}>Loading details…</div>
          ) : detailsErr ? (
            <div style={S.empty}>⚠️ {detailsErr}</div>
          ) : details ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={S.detailBox}>
                <div style={S.detailTitle}>{details.washer.fullName}</div>
                <div style={S.detailMeta}>Status: {details.washer.verificationStatus}</div>
                <div style={S.detailMeta}>City: {details.washer.city || "—"}</div>
                <div style={S.detailMeta}>Vehicle: {details.washer.vehicleType || "—"}</div>
                <div style={S.detailMeta}>Plate: {details.washer.plateNumber || "—"}</div>
                <div style={S.detailMeta}>Phone: {details.washer.contactPhone || details.user?.phone || "—"}</div>
                <div style={S.detailMeta}>Submitted: {fmtDate(details.washer.submittedAt || details.washer.createdAt)}</div>
                <div style={S.detailMeta}>Reviewed: {fmtDate(details.washer.reviewedAt)}</div>
                <div style={S.detailMeta}>Wash balance: {details.stats?.washBalance ?? (details.washer as any)?.washBalance ?? 0}</div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Stats</div>
                <div style={S.detailMeta}>Average rating: {details.stats?.avgRating ?? 0}</div>
                <div style={S.detailMeta}>Total reviews: {details.stats?.totalReviews ?? 0}</div>
                <div style={S.detailMeta}>Recent orders shown: {details.stats?.totalOrders ?? 0}</div>
              </div>

              {details.washer.rejectionReason ? (
                <div style={S.detailBox}>
                  <div style={S.detailTitle}>Rejection reason</div>
                  <div style={S.detailMeta}>{details.washer.rejectionReason}</div>
                </div>
              ) : null}

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Documents</div>
                <div style={S.linkList}>
                  {details.washer.idFrontUrl ? (
                    <a style={S.docLink} href={details.washer.idFrontUrl} target="_blank" rel="noreferrer">
                      ID Front
                    </a>
                  ) : null}
                  {details.washer.idBackUrl ? (
                    <a style={S.docLink} href={details.washer.idBackUrl} target="_blank" rel="noreferrer">
                      ID Back
                    </a>
                  ) : null}
                  {details.washer.selfieUrl ? (
                    <a style={S.docLink} href={details.washer.selfieUrl} target="_blank" rel="noreferrer">
                      Selfie
                    </a>
                  ) : null}
                  {details.washer.driverLicenseUrl ? (
                    <a style={S.docLink} href={details.washer.driverLicenseUrl} target="_blank" rel="noreferrer">
                      Driver License
                    </a>
                  ) : null}
                  {details.washer.vehicleRegistrationUrl ? (
                    <a style={S.docLink} href={details.washer.vehicleRegistrationUrl} target="_blank" rel="noreferrer">
                      Vehicle Registration
                    </a>
                  ) : null}
                  {!details.washer.idFrontUrl &&
                  !details.washer.idBackUrl &&
                  !details.washer.selfieUrl &&
                  !details.washer.driverLicenseUrl &&
                  !details.washer.vehicleRegistrationUrl ? (
                    <div style={S.detailMeta}>No documents found.</div>
                  ) : null}
                </div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Recent Reviews</div>
                {details.recentReviews?.length ? (
                  <div style={S.innerList}>
                    {details.recentReviews.map((r) => (
                      <div key={r.id} style={S.innerItem}>
                        <div style={S.detailMeta}>⭐ {r.rating}</div>
                        <div style={S.detailMeta}>{r.comment || "No comment"}</div>
                        <div style={S.detailMeta}>{fmtDate(r.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No reviews yet.</div>
                )}
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
                          {o.paymentMode || "—"} • {o.paymentStatus || "—"}
                        </div>
                        <div style={S.detailMeta}>{fmtDate(o.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={S.detailMeta}>No recent orders.</div>
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

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

  filtersCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.4fr auto",
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
  linkList: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  docLink: {
    padding: "8px 10px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 12,
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