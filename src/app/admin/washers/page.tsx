"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "@/lib/api";

type VerificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NONE";

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

  verificationStatus:
    VerificationStatus;

  availabilityStatus?: string;

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

    driverLicenseUrl?:
      | string
      | null;

    vehicleRegistrationUrl?:
      | string
      | null;

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

function fmtDate(
  v?: string | null,
) {
  if (!v) return "—";

  const d = new Date(v);

  if (
    Number.isNaN(d.getTime())
  )
    return "—";

  return d.toLocaleString();
}

function statusColor(
  status: VerificationStatus,
) {
  if (status === "APPROVED")
    return "#3cffb1";

  if (status === "REJECTED")
    return "#ff7a7a";

  if (status === "PENDING")
    return "#ffd36a";

  return "#b8c0cc";
}

function availabilityColor(
  status?: string,
) {
  if (status === "AVAILABLE")
    return "#3cffb1";

  if (status === "BUSY")
    return "#ffd36a";

  return "#ff7a7a";
}

export default function AdminWashersPage() {
  const [items, setItems] =
    useState<WasherItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [err, setErr] =
    useState("");

  const [status, setStatus] =
    useState<string>("");

  const [q, setQ] =
    useState("");

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState<number | null>(
    null,
  );

  const [details, setDetails] =
    useState<WasherDetailsResponse | null>(
      null,
    );

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [detailsErr, setDetailsErr] =
    useState("");

  async function loadWashers() {
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

      if (q.trim())
        params.set(
          "q",
          q.trim(),
        );

      const url =
        params.toString()
          ? `/admin/washers?${params.toString()}`
          : "/admin/washers";

      const { data } =
        await api.get<
          WasherItem[]
        >(url);

      setItems(data || []);
    } catch (e: any) {
      setErr(
        e?.response?.data
          ?.message ||
          e?.message ||
          "Failed to load washers.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(
    userId: number,
  ) {
    try {
      setDetailsLoading(true);

      setDetailsErr("");

      setSelectedUserId(
        userId,
      );

      const { data } =
        await api.get<WasherDetailsResponse>(
          `/admin/washers/${userId}`,
        );

      setDetails(data);
    } catch (e: any) {
      setDetails(null);

      setDetailsErr(
        e?.response?.data
          ?.message ||
          e?.message ||
          "Failed to load washer details.",
      );
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

  async function approveWasher(
    userId: number,
  ) {
    try {
      setWorkingId(
        `approve-${userId}`,
      );

      await api.post(
        `/admin/washers/${userId}/approve`,
      );

      await loadWashers();

      if (
        selectedUserId ===
        userId
      ) {
        await loadDetails(
          userId,
        );
      }
    } catch (e: any) {
      alert(
        e?.response?.data
          ?.message ||
          e?.message ||
          "Failed to approve washer.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function rejectWasher(
    userId: number,
  ) {
    const reason =
      window.prompt(
        "Reject reason:",
        "Rejected",
      );

    if (reason == null)
      return;

    try {
      setWorkingId(
        `reject-${userId}`,
      );

      await api.post(
        `/admin/washers/${userId}/reject`,
        { reason },
      );

      await loadWashers();

      if (
        selectedUserId ===
        userId
      ) {
        await loadDetails(
          userId,
        );
      }
    } catch (e: any) {
      alert(
        e?.response?.data
          ?.message ||
          e?.message ||
          "Failed to reject washer.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  const counts = useMemo(() => {
    return {
      total: items.length,

      pending: items.filter(
        (x) =>
          x.verificationStatus ===
          "PENDING",
      ).length,

      approved: items.filter(
        (x) =>
          x.verificationStatus ===
          "APPROVED",
      ).length,

      rejected: items.filter(
        (x) =>
          x.verificationStatus ===
          "REJECTED",
      ).length,
    };
  }, [items]);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>
            Admin Panel
          </div>

          <h1 style={S.title}>
            Washers
          </h1>

          <div style={S.sub}>
            Review and
            monitor live
            washer activity.
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
            style={S.btnGhost}
          >
            Open Live Map
          </a>

          <button
            style={S.btnGhost}
            onClick={loadWashers}
          >
            Refresh
          </button>
        </div>
      </header>

      <section style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={S.statTitle}>
            Total
          </div>

          <div style={S.statValue}>
            {counts.total}
          </div>
        </div>

        <div style={S.statCard}>
          <div style={S.statTitle}>
            Pending
          </div>

          <div style={S.statValue}>
            {counts.pending}
          </div>
        </div>

        <div style={S.statCard}>
          <div style={S.statTitle}>
            Approved
          </div>

          <div style={S.statValue}>
            {counts.approved}
          </div>
        </div>

        <div style={S.statCard}>
          <div style={S.statTitle}>
            Rejected
          </div>

          <div style={S.statValue}>
            {counts.rejected}
          </div>
        </div>
      </section>

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

              <option value="PENDING">
                Pending
              </option>

              <option value="APPROVED">
                Approved
              </option>

              <option value="REJECTED">
                Rejected
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
              placeholder="Search..."
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems:
                "end",
            }}
          >
            <button
              style={
                S.primaryBtn
              }
              onClick={
                applyFilters
              }
            >
              Apply
            </button>
          </div>
        </div>
      </section>

      <div style={S.layout}>
        <section style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>
              All Washers
            </h2>
          </div>

          {items.map((w) => (
            <div
              key={w.userId}
              style={S.rowCard}
            >
              <div style={S.rowMain}>
                <div style={S.rowTop}>
                  <div
                    style={
                      S.rowTitle
                    }
                  >
                    {w.fullName}
                  </div>

                  <span
                    style={{
                      ...S.statusPill,
                      borderColor:
                        statusColor(
                          w.verificationStatus,
                        ),
                      color:
                        statusColor(
                          w.verificationStatus,
                        ),
                    }}
                  >
                    {
                      w.verificationStatus
                    }
                  </span>
                </div>

                <div
                  style={
                    S.rowMeta
                  }
                >
                  {w.city ||
                    "—"}{" "}
                  •{" "}
                  {w.vehicleType ||
                    "—"}
                </div>

                <div
                  style={
                    S.rowMeta
                  }
                >
                  Availability:{" "}
                  <span
                    style={{
                      color:
                        availabilityColor(
                          w.availabilityStatus,
                        ),
                      fontWeight: 900,
                    }}
                  >
                    {w.availabilityStatus ||
                      "OFFLINE"}
                  </span>
                </div>

                <div
                  style={
                    S.rowMeta
                  }
                >
                  Plate:{" "}
                  {w.plateNumber ||
                    "—"}
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
                      w.userId,
                    )
                  }
                >
                  View
                </button>

                <button
                  style={
                    S.approveBtn
                  }
                  onClick={() =>
                    approveWasher(
                      w.userId,
                    )
                  }
                >
                  Approve
                </button>

                <button
                  style={
                    S.rejectBtn
                  }
                  onClick={() =>
                    rejectWasher(
                      w.userId,
                    )
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </section>

        <aside style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>
              Details
            </h2>
          </div>

          {!selectedUserId ? (
            <div style={S.empty}>
              Select washer
            </div>
          ) : detailsLoading ? (
            <div style={S.empty}>
              Loading...
            </div>
          ) : detailsErr ? (
            <div style={S.empty}>
              {detailsErr}
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
                  {
                    details
                      .washer
                      .fullName
                  }
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Availability:{" "}
                  <span
                    style={{
                      color:
                        availabilityColor(
                          details
                            .washer
                            .availabilityStatus,
                        ),
                      fontWeight: 900,
                    }}
                  >
                    {details
                      .washer
                      .availabilityStatus ||
                      "OFFLINE"}
                  </span>
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Last Lat:{" "}
                  {details
                    .user
                    ?.lastLat ??
                    "—"}
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Last Lng:{" "}
                  {details
                    .user
                    ?.lastLng ??
                    "—"}
                </div>

                <div
                  style={
                    S.detailMeta
                  }
                >
                  Last Seen:{" "}
                  {fmtDate(
                    details
                      .user
                      ?.lastSeenAt,
                  )}
                </div>

                {details.user
                  ?.lastLat !=
                  null &&
                details.user
                  ?.lastLng !=
                  null ? (
                  <a
                    href={`https://www.google.com/maps?q=${details.user.lastLat},${details.user.lastLng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...S.docLink,
                      marginTop: 10,
                      display:
                        "inline-block",
                    }}
                  >
                    Open
                    Location
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
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
    background: "#0b0f19",
    color: "#fff",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background:
      "rgba(255,255,255,0.10)",
  },

  title: {
    fontSize: 30,
    fontWeight: 900,
    margin: "8px 0",
  },

  sub: {
    opacity: 0.8,
  },

  headerBtns: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  btnGhost: {
    padding: "10px 14px",
    borderRadius: 14,
    border:
      "1px solid rgba(255,255,255,0.14)",
    background:
      "rgba(255,255,255,0.08)",
    color: "#fff",
    textDecoration: "none",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(140px,1fr))",
    gap: 12,
    marginBottom: 20,
  },

  statCard: {
    padding: 16,
    borderRadius: 18,
    background:
      "rgba(255,255,255,0.06)",
  },

  statTitle: {
    opacity: 0.8,
  },

  statValue: {
    fontSize: 28,
    fontWeight: 900,
    marginTop: 10,
  },

  filtersCard: {
    padding: 14,
    borderRadius: 18,
    background:
      "rgba(255,255,255,0.06)",
    marginBottom: 20,
  },

  filtersGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
  },

  label: {
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border:
      "1px solid rgba(255,255,255,0.14)",
    background:
      "rgba(0,0,0,0.20)",
    color: "#fff",
  },

  primaryBtn: {
    padding: 12,
    borderRadius: 14,
    border: "none",
    background: "#3cffb1",
    fontWeight: 900,
  },

  layout: {
    display: "grid",
    gridTemplateColumns:
      "1.2fr 0.8fr",
    gap: 16,
  },

  card: {
    padding: 16,
    borderRadius: 18,
    background:
      "rgba(255,255,255,0.06)",
  },

  sectionTop: {
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: 900,
  },

  rowCard: {
    padding: 14,
    borderRadius: 16,
    background:
      "rgba(0,0,0,0.18)",
    marginBottom: 10,
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  rowMain: {
    flex: 1,
    minWidth: 0,
  },

  rowTop: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  rowTitle: {
    fontSize: 17,
    fontWeight: 900,
  },

  rowMeta: {
    marginTop: 6,
    opacity: 0.84,
    fontSize: 13,
  },

  rowActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  statusPill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 900,
  },

  viewBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background:
      "rgba(255,255,255,0.10)",
    color: "#fff",
  },

  approveBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#3cffb1",
    color: "#062112",
    fontWeight: 900,
  },

  rejectBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#ff6363",
    color: "#230707",
    fontWeight: 900,
  },

  empty: {
    opacity: 0.8,
  },

  detailBox: {
    padding: 14,
    borderRadius: 14,
    background:
      "rgba(0,0,0,0.18)",
  },

  detailTitle: {
    fontWeight: 900,
    marginBottom: 8,
  },

  detailMeta: {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.86,
  },

  docLink: {
    padding: "10px 12px",
    borderRadius: 12,
    background:
      "rgba(255,255,255,0.10)",
    color: "#fff",
    textDecoration: "none",
  },
};