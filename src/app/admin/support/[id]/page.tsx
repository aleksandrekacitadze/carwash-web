"use client";

import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";

type SupportStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
type SenderRole = "CUSTOMER" | "WASHER" | "ADMIN";

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

type Message = {
  id: number;
  conversationId: number;
  senderUserId: number;
  senderRole: SenderRole;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type UserLite = {
  id: number;
  phone?: string | null;
  fullName?: string | null;
  role?: string;
};

type ConversationDetails = {
  conversation: Conversation;
  user: UserLite | null;
  assignedAdmin: UserLite | null;
  messages: Message[];
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtTime(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusColor(status: SupportStatus) {
  if (status === "OPEN") return "#ffd36a";
  if (status === "IN_PROGRESS") return "#8fd3ff";
  return "#ff8b8b";
}

export default function AdminSupportConversationPage() {
  const params = useParams();
  const id = Number(params?.id);

  const [data, setData] = useState<ConversationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  async function loadConversation(silent = false) {
    if (!id) return;
    try {
      if (!silent) {
        setLoading(true);
        setErr("");
      }
      const { data } = await api.get<ConversationDetails>(`/admin/support/conversations/${id}`);
      setData(data);
    } catch (e: any) {
      if (!silent) {
        setErr(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load support conversation."
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadConversation();

    const timer = setInterval(() => {
      loadConversation(true);
    }, 5000);

    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  async function sendMessage() {
    const text = message.trim();
    if (!text || !id) return;

    try {
      setSending(true);
      const { data } = await api.post<ConversationDetails>(
        `/admin/support/conversations/${id}/messages`,
        { message: text }
      );
      setData(data);
      setMessage("");
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function closeConversation() {
    if (!id) return;
    try {
      setActing(true);
      const { data } = await api.post<ConversationDetails>(
        `/admin/support/conversations/${id}/close`
      );
      setData(data);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to close conversation.");
    } finally {
      setActing(false);
    }
  }

  async function reopenConversation() {
    if (!id) return;
    try {
      setActing(true);
      const { data } = await api.post<ConversationDetails>(
        `/admin/support/conversations/${id}/reopen`
      );
      setData(data);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to reopen conversation.");
    } finally {
      setActing(false);
    }
  }

  async function assignToAdmin() {
    if (!id) return;
    const raw = window.prompt("Enter admin user id to assign:");
    if (!raw) return;

    const adminUserId = Number(raw);
    if (!Number.isFinite(adminUserId)) {
      alert("Invalid admin user id.");
      return;
    }

    try {
      setAssigning(true);
      const { data } = await api.post<ConversationDetails>(
        `/admin/support/conversations/${id}/assign`,
        { adminUserId }
      );
      setData(data);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to assign conversation.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Admin Panel</div>
          <h1 style={S.title}>Support Conversation</h1>
          <div style={S.sub}>Open, assign, reply, close or reopen this thread.</div>
        </div>

        <div style={S.headerBtns}>
          <Link href="/admin/support" style={S.btnGhost}>
            Back
          </Link>
          <button style={S.btnGhost as React.CSSProperties} onClick={() => loadConversation()}>
            Refresh
          </button>
        </div>
      </header>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? <div style={S.card}>⚠️ {err}</div> : null}

      {data ? (
        <div style={S.layout}>
          <section style={S.card}>
            <div style={S.sectionTop}>
              <div>
                <div style={S.subject}>{data.conversation.subject}</div>
                <div style={S.metaLine}>Conversation #{data.conversation.id}</div>
              </div>

              <span
                style={{
                  ...S.statusPill,
                  borderColor: statusColor(data.conversation.status),
                  color: statusColor(data.conversation.status),
                }}
              >
                {data.conversation.status}
              </span>
            </div>

            <div style={S.infoGrid}>
              <div style={S.infoBox}>
                <div style={S.infoLabel}>User</div>
                <div style={S.infoValue}>
                  #{data.user?.id ?? data.conversation.userId}
                </div>
                <div style={S.infoSmall}>{data.user?.fullName || "—"}</div>
                <div style={S.infoSmall}>{data.user?.phone || "—"}</div>
              </div>

              <div style={S.infoBox}>
                <div style={S.infoLabel}>Assigned Admin</div>
                <div style={S.infoValue}>
                  {data.assignedAdmin ? `#${data.assignedAdmin.id}` : "—"}
                </div>
                <div style={S.infoSmall}>{data.assignedAdmin?.fullName || "Unassigned"}</div>
              </div>

              <div style={S.infoBox}>
                <div style={S.infoLabel}>Dates</div>
                <div style={S.infoSmall}>Created: {fmtDate(data.conversation.createdAt)}</div>
                <div style={S.infoSmall}>Updated: {fmtDate(data.conversation.updatedAt)}</div>
                <div style={S.infoSmall}>Last msg: {fmtDate(data.conversation.lastMessageAt)}</div>
              </div>
            </div>

            <div style={S.actionRow}>
              <button
                style={S.assignBtn}
                onClick={assignToAdmin}
                disabled={assigning}
              >
                {assigning ? "Assigning..." : "Assign admin"}
              </button>

              {data.conversation.status !== "CLOSED" ? (
                <button
                  style={S.closeBtn}
                  onClick={closeConversation}
                  disabled={acting}
                >
                  {acting ? "Saving..." : "Close"}
                </button>
              ) : (
                <button
                  style={S.reopenBtn}
                  onClick={reopenConversation}
                  disabled={acting}
                >
                  {acting ? "Saving..." : "Reopen"}
                </button>
              )}
            </div>

            <div style={S.messagesWrap}>
              {data.messages.length === 0 ? (
                <div style={S.empty}>No messages yet.</div>
              ) : (
                data.messages.map((m) => {
                  const isAdmin = m.senderRole === "ADMIN";
                  return (
                    <div
                      key={m.id}
                      style={{
                        ...S.messageRow,
                        justifyContent: isAdmin ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          ...S.bubble,
                          ...(isAdmin ? S.bubbleAdmin : S.bubbleUser),
                        }}
                      >
                        <div style={S.bubbleRole}>
                          {isAdmin ? "Admin" : m.senderRole}
                        </div>
                        <div style={S.bubbleText}>{m.message}</div>
                        <div style={S.bubbleTime}>
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <div style={S.composer}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  data.conversation.status === "CLOSED"
                    ? "Conversation is closed"
                    : "Write reply..."
                }
                style={S.textarea}
                rows={3}
                disabled={data.conversation.status === "CLOSED" || sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (data.conversation.status !== "CLOSED" && !sending) {
                      sendMessage();
                    }
                  }
                }}
              />

              <button
                style={{
                  ...S.sendBtn,
                  opacity:
                    data.conversation.status === "CLOSED" || sending ? 0.6 : 1,
                }}
                onClick={sendMessage}
                disabled={data.conversation.status === "CLOSED" || sending}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </section>
        </div>
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
  layout: { display: "grid", gridTemplateColumns: "1fr", gap: 16 },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },
  sectionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  subject: { fontSize: 20, fontWeight: 950 },
  metaLine: { marginTop: 6, opacity: 0.78, fontSize: 12 },
  statusPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 900,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginBottom: 12,
  },
  infoBox: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  infoLabel: { fontSize: 12, opacity: 0.75, fontWeight: 900 },
  infoValue: { marginTop: 8, fontSize: 16, fontWeight: 900 },
  infoSmall: { marginTop: 4, fontSize: 12, opacity: 0.84, lineHeight: 1.4 },
  actionRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  assignBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#8fd3ff",
    color: "#071d2c",
  },
  closeBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#ff8b8b",
    color: "#2a0505",
  },
  reopenBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#3cffb1",
    color: "#062112",
  },
  messagesWrap: {
    minHeight: 320,
    maxHeight: "55vh",
    overflowY: "auto",
    padding: 10,
    borderRadius: 16,
    background: "rgba(0,0,0,0.16)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  empty: { opacity: 0.8, fontSize: 14 },
  messageRow: { display: "flex", width: "100%" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  bubbleAdmin: {
    background: "rgba(60,255,177,0.16)",
    color: "#e8fff5",
    border: "1px solid rgba(60,255,177,0.22)",
  },
  bubbleUser: {
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
  },
  bubbleRole: {
    fontSize: 11,
    fontWeight: 900,
    opacity: 0.72,
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  bubbleTime: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: 6,
    textAlign: "right",
  },
  composer: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    alignItems: "end",
  },
  textarea: {
    width: "100%",
    minHeight: 72,
    resize: "none",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    padding: 12,
    outline: "none",
    fontFamily: "inherit",
  },
  sendBtn: {
    border: "none",
    borderRadius: 14,
    background: "#3cffb1",
    color: "#062112",
    fontWeight: 950,
    padding: "12px 14px",
    minWidth: 96,
    cursor: "pointer",
  },
};