"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

type SupportStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

type Conversation = {
  id: number;
  userId: number;
  subject: string;
  status: SupportStatus;
  assignedAdminId: number | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusColor(status: SupportStatus) {
  if (status === "OPEN") return "#ffd36a";
  if (status === "IN_PROGRESS") return "#8fd3ff";
  return "#ff8b8b";
}

export default function AdminSupportPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  async function loadConversations() {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());

      const url = params.toString()
        ? `/admin/support/conversations?${params.toString()}`
        : "/admin/support/conversations";

      const { data } = await api.get<Conversation[]>(url);
      setItems(data || []);
    } catch (e: any) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load support conversations."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Admin Panel</div>
          <h1 style={S.title}>Support Conversations</h1>
          <div style={S.sub}>View and manage support chat threads.</div>
        </div>

        <div style={S.headerBtns}>
          <Link href="/admin" style={S.btnGhost}>
            Dashboard
          </Link>
          <button style={S.btnGhost as React.CSSProperties} onClick={loadConversations}>
            Refresh
          </button>
        </div>
      </header>

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
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div>
            <div style={S.label}>Search</div>
            <input
              style={S.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Subject or conversation id..."
            />
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button style={S.primaryBtn} onClick={loadConversations}>
              Apply filters
            </button>
          </div>
        </div>
      </section>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? <div style={S.card}>⚠️ {err}</div> : null}

      <section style={S.card}>
        <div style={S.sectionTop}>
          <h2 style={S.cardTitle}>Conversations</h2>
          <span style={S.countPill}>{items.length}</span>
        </div>

        {items.length === 0 ? (
          <div style={S.empty}>No support conversations found.</div>
        ) : (
          <div style={S.listWrap}>
            {items.map((c) => (
              <Link
                key={c.id}
                href={`/admin/support/${c.id}`}
                style={S.rowCard}
              >
                <div style={S.rowMain}>
                  <div style={S.rowTop}>
                    <div style={S.rowTitle}>#{c.id} — {c.subject}</div>
                    <span
                      style={{
                        ...S.statusPill,
                        borderColor: statusColor(c.status),
                        color: statusColor(c.status),
                      }}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div style={S.rowMeta}>User #{c.userId}</div>
                  <div style={S.rowMeta}>
                    Assigned admin: {c.assignedAdminId ? `#${c.assignedAdminId}` : "—"}
                  </div>
                  <div style={S.rowMeta}>
                    Last message: {fmtDate(c.lastMessageAt)}
                  </div>
                  <div style={S.rowMeta}>Updated: {fmtDate(c.updatedAt)}</div>
                </div>

                <div style={S.openBtn}>Open →</div>
              </Link>
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
    padding: 12,
    borderRadius: 16,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
    textDecoration: "none",
    color: "#fff",
  },
  rowMain: { flex: "1 1 260px", minWidth: 0 },
  rowTop: {
    display: "flex",
    gap: 10,
    alignItems: "center",
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
  statusPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 900,
  },
  openBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
};