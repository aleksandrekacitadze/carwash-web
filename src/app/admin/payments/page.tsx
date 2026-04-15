"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

type PaymentItem = {
  id: number;
  userId: number;
  kind: "ORDER" | "SUBSCRIPTION";
  orderId: number | null;
  planId: number | null;
  provider: "PAYPAL" | "CARD";
  providerOrderId: string | null;
  providerCaptureId?: string | null;
  providerRefundId?: string | null;
  amount: string;
  currency: string;
  status: "CREATED" | "CAPTURED" | "REFUNDED" | "FAILED";
  failureReason?: string | null;
  metaJson?: string | null;
  createdAt: string;
  updatedAt?: string;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusColor(status?: string) {
  switch (status) {
    case "CAPTURED":
      return "#3cffb1";
    case "CREATED":
      return "#8fd3ff";
    case "REFUNDED":
      return "#ffd36a";
    case "FAILED":
      return "#ff7a7a";
    default:
      return "#c3cad4";
  }
}

function kindColor(kind?: string) {
  switch (kind) {
    case "ORDER":
      return "#8fd3ff";
    case "SUBSCRIPTION":
      return "#c59bff";
    default:
      return "#c3cad4";
  }
}

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [kind, setKind] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const [selected, setSelected] = useState<PaymentItem | null>(null);

  async function loadPayments() {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();
      if (kind) params.set("kind", kind);
      if (provider) params.set("provider", provider);
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());

      const url = params.toString()
        ? `/admin/payments?${params.toString()}`
        : "/admin/payments";

      const { data } = await api.get<PaymentItem[]>(url);
      setItems(data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const totalAmount = items.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const capturedCount = items.filter((p) => p.status === "CAPTURED").length;
  const failedCount = items.filter((p) => p.status === "FAILED").length;

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Admin Panel</div>
          <h1 style={S.title}>Payments</h1>
          <div style={S.sub}>
            View order and subscription payments, statuses, provider ids, and failures.
          </div>
        </div>

        <div style={S.headerBtns}>
          <Link href="/admin" style={S.btnGhost}>
            Dashboard
          </Link>
          <button style={S.btnGhost as React.CSSProperties} onClick={loadPayments}>
            Refresh
          </button>
        </div>
      </header>

      <section style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={S.statTitle}>Total Payments</div>
          <div style={S.statValue}>{items.length}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statTitle}>Captured</div>
          <div style={S.statValue}>{capturedCount}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statTitle}>Failed</div>
          <div style={S.statValue}>{failedCount}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statTitle}>Visible Amount</div>
          <div style={S.statValue}>{totalAmount.toFixed(2)}</div>
        </div>
      </section>

      <section style={S.filtersCard}>
        <div style={S.filtersGrid}>
          <div>
            <div style={S.label}>Kind</div>
            <select style={S.input} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All</option>
              <option value="ORDER">ORDER</option>
              <option value="SUBSCRIPTION">SUBSCRIPTION</option>
            </select>
          </div>

          <div>
            <div style={S.label}>Provider</div>
            <select style={S.input} value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="">All</option>
              <option value="PAYPAL">PAYPAL</option>
              <option value="CARD">CARD</option>
            </select>
          </div>

          <div>
            <div style={S.label}>Status</div>
            <select style={S.input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="CREATED">CREATED</option>
              <option value="CAPTURED">CAPTURED</option>
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
              placeholder="Payment id, user id, provider order id..."
            />
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button style={S.primaryBtn} onClick={loadPayments}>
              Apply filters
            </button>
          </div>
        </div>
      </section>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? <div style={S.card}>⚠️ {err}</div> : null}

      <div style={S.layout}>
        <section style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>Payments</h2>
            <span style={S.countPill}>{items.length}</span>
          </div>

          {items.length === 0 ? (
            <div style={S.empty}>No payments found.</div>
          ) : (
            <div style={S.listWrap}>
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  style={S.rowCard}
                >
                  <div style={S.rowMain}>
                    <div style={S.rowTop}>
                      <div style={S.rowTitle}>Payment #{p.id}</div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            ...S.kindPill,
                            borderColor: kindColor(p.kind),
                            color: kindColor(p.kind),
                          }}
                        >
                          {p.kind}
                        </span>

                        <span
                          style={{
                            ...S.statusPill,
                            borderColor: statusColor(p.status),
                            color: statusColor(p.status),
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>

                    <div style={S.rowMeta}>
                      User #{p.userId} • {p.provider}
                    </div>

                    <div style={S.rowMeta}>
                      Amount: {p.amount} {p.currency}
                    </div>

                    <div style={S.rowMeta}>
                      Order: {p.orderId ?? "—"} • Plan: {p.planId ?? "—"}
                    </div>

                    <div style={S.rowMeta}>
                      Provider order: {p.providerOrderId || "—"}
                    </div>

                    <div style={S.rowMeta}>
                      Created: {fmtDate(p.createdAt)}
                    </div>
                  </div>

                  <div style={S.openBtn}>View →</div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside style={S.card}>
          <div style={S.sectionTop}>
            <h2 style={S.cardTitle}>Payment Details</h2>
            {selected ? <span style={S.countPill}>#{selected.id}</span> : null}
          </div>

          {!selected ? (
            <div style={S.empty}>Select a payment to inspect details.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={S.detailBox}>
                <div style={S.detailTitle}>Basic Info</div>
                <div style={S.detailMeta}>ID: #{selected.id}</div>
                <div style={S.detailMeta}>User ID: #{selected.userId}</div>
                <div style={S.detailMeta}>Kind: {selected.kind}</div>
                <div style={S.detailMeta}>Provider: {selected.provider}</div>
                <div style={S.detailMeta}>Status: {selected.status}</div>
                <div style={S.detailMeta}>
                  Amount: {selected.amount} {selected.currency}
                </div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Linked Entities</div>
                <div style={S.detailMeta}>Order ID: {selected.orderId ?? "—"}</div>
                <div style={S.detailMeta}>Plan ID: {selected.planId ?? "—"}</div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Provider IDs</div>
                <div style={S.detailMeta}>
                  Provider Order ID: {selected.providerOrderId || "—"}
                </div>
                <div style={S.detailMeta}>
                  Provider Capture ID: {selected.providerCaptureId || "—"}
                </div>
                <div style={S.detailMeta}>
                  Provider Refund ID: {selected.providerRefundId || "—"}
                </div>
              </div>

              <div style={S.detailBox}>
                <div style={S.detailTitle}>Timestamps</div>
                <div style={S.detailMeta}>Created: {fmtDate(selected.createdAt)}</div>
                <div style={S.detailMeta}>Updated: {fmtDate(selected.updatedAt)}</div>
              </div>

              {selected.failureReason ? (
                <div style={S.detailBox}>
                  <div style={S.detailTitle}>Failure Reason</div>
                  <div style={S.detailMeta}>{selected.failureReason}</div>
                </div>
              ) : null}

              {selected.metaJson ? (
                <div style={S.detailBox}>
                  <div style={S.detailTitle}>Meta JSON</div>
                  <pre style={S.pre}>{selected.metaJson}</pre>
                </div>
              ) : null}
            </div>
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
  },
  title: { margin: "8px 0 0", fontSize: 28, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.82 },
  headerBtns: { display: "flex", gap: 10, flexWrap: "wrap" },
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
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 16,
  },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },
  sectionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 900 },
  countPill: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontSize: 12,
    fontWeight: 900,
  },
  empty: { opacity: 0.8, fontSize: 14 },

  listWrap: { display: "grid", gap: 10 },
  rowCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    width: "100%",
    textAlign: "left" as const,
    padding: 12,
    borderRadius: 16,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#fff",
    cursor: "pointer",
  },
  rowMain: {
    flex: "1 1 260px",
    minWidth: 0,
  },
  rowTop: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  rowTitle: { fontWeight: 950, fontSize: 16 },
  rowMeta: {
    fontSize: 12,
    opacity: 0.82,
    marginTop: 6,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  openBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  kindPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 900,
  },
  statusPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 900,
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
  pre: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 12,
    opacity: 0.9,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
};