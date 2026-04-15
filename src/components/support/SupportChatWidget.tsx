"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

type SupportConversationStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
type SupportSenderRole = "CUSTOMER" | "WASHER" | "ADMIN";

type SupportConversation = {
  id: number;
  userId: number;
  subject: string;
  status: SupportConversationStatus;
  assignedAdminId: number | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SupportMessage = {
  id: number;
  conversationId: number;
  senderUserId: number;
  senderRole: SupportSenderRole;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type ActiveConversationResponse = {
  conversation: SupportConversation;
  messages: SupportMessage[];
};

function fmtTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<ActiveConversationResponse | null>(null);
  const [message, setMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  async function loadActiveConversation(silent = false) {
    try {
      if (!silent) {
        setLoading(true);
        setErr("");
      }

      const res = await api.get<ActiveConversationResponse>("/support/my-active");
      setData(res.data);
    } catch (e: any) {
      if (!silent) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load support chat.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function sendMessage() {
    const text = message.trim();
    if (!text) return;

    try {
      setSending(true);
      setErr("");

      const res = await api.post<ActiveConversationResponse>("/support/my-active/message", {
        message: text,
      });

      setData(res.data);
      setMessage("");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    loadActiveConversation();

    const timer = setInterval(() => {
      loadActiveConversation(true);
    }, 5000);

    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length, open]);

  const statusLabel = useMemo(() => {
    const status = data?.conversation?.status;
    if (!status) return "Support";
    if (status === "OPEN") return "Open";
    if (status === "IN_PROGRESS") return "In progress";
    if (status === "CLOSED") return "Closed";
    return "Support";
  }, [data?.conversation?.status]);

  const canSend = !!data && data.conversation.status !== "CLOSED";

  return (
    <>
      <button
        type="button"
        aria-label="Open support chat"
        onClick={() => setOpen((v) => !v)}
        style={S.fab}
      >
        <span style={S.fabIcon}>💬</span>
      </button>

      {open ? (
        <>
          <div style={S.backdrop} onClick={() => setOpen(false)} />

          <aside style={S.drawer}>
            <div style={S.header}>
              <div>
                <div style={S.kicker}>Support</div>
                <div style={S.title}>Chat with support</div>
                <div style={S.subtitle}>{statusLabel}</div>
              </div>

              <button style={S.closeBtn} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            {loading ? (
              <div style={S.centerBox}>Loading…</div>
            ) : err ? (
              <div style={S.centerBox}>⚠️ {err}</div>
            ) : !data ? (
              <div style={S.centerBox}>No conversation.</div>
            ) : (
              <>
                <div style={S.subjectBar}>
                  <div style={S.subjectTitle}>{data.conversation.subject}</div>
                  <div style={S.subjectMeta}>
                    #{data.conversation.id} • {data.conversation.status}
                  </div>
                </div>

                <div style={S.messagesWrap}>
                  {data.messages.length === 0 ? (
                    <div style={S.emptyState}>
                      Start by sending your first message to support.
                    </div>
                  ) : (
                    data.messages.map((m) => {
                      const isAdmin = m.senderRole === "ADMIN";
                      return (
                        <div
                          key={m.id}
                          style={{
                            ...S.messageRow,
                            justifyContent: isAdmin ? "flex-start" : "flex-end",
                          }}
                        >
                          <div
                            style={{
                              ...S.bubble,
                              ...(isAdmin ? S.bubbleAdmin : S.bubbleUser),
                            }}
                          >
                            <div style={S.bubbleRole}>
                              {isAdmin ? "Support" : "You"}
                            </div>
                            <div style={S.bubbleText}>{m.message}</div>
                            <div style={S.bubbleTime}>{fmtTime(m.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div style={S.composer}>
                  {data.conversation.status === "CLOSED" ? (
                    <div style={S.closedNote}>
                      This conversation is closed. Support will reopen it if needed.
                    </div>
                  ) : null}

                  <div style={S.composerRow}>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        canSend
                          ? "Write your message..."
                          : "Conversation is closed"
                      }
                      style={S.textarea}
                      disabled={!canSend || sending}
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (canSend && !sending) sendMessage();
                        }
                      }}
                    />

                    <button
                      style={{
                        ...S.sendBtn,
                        opacity: !canSend || sending ? 0.6 : 1,
                        cursor: !canSend || sending ? "not-allowed" : "pointer",
                      }}
                      onClick={sendMessage}
                      disabled={!canSend || sending}
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </>
      ) : null}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  fab: {
    position: "fixed",
    right: 18,
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 999,
    border: "none",
    background: "#3cffb1",
    color: "#062112",
    fontWeight: 900,
    cursor: "pointer",
    zIndex: 2000,
    boxShadow: "0 12px 34px rgba(0,0,0,0.35)",
    display: "grid",
    placeItems: "center",
  },
  fabIcon: {
    fontSize: 24,
    lineHeight: 1,
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 1998,
  },
  drawer: {
    position: "fixed",
    right: 0,
    top: 0,
    bottom: 0,
    width: "min(420px, 100vw)",
    background: "#0b0f19",
    borderLeft: "1px solid rgba(255,255,255,0.10)",
    zIndex: 1999,
    display: "flex",
    flexDirection: "column",
    boxShadow: "-12px 0 32px rgba(0,0,0,0.35)",
  },
  header: {
    padding: 14,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  kicker: {
    fontSize: 12,
    opacity: 0.75,
    fontWeight: 900,
  },
  title: {
    fontSize: 20,
    fontWeight: 950,
    color: "#fff",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.8,
    color: "#fff",
    marginTop: 6,
  },
  closeBtn: {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    borderRadius: 12,
    width: 38,
    height: 38,
    cursor: "pointer",
    fontWeight: 900,
  },
  centerBox: {
    color: "#fff",
    padding: 18,
    opacity: 0.9,
  },
  subjectBar: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
  },
  subjectTitle: {
    fontWeight: 900,
    fontSize: 14,
  },
  subjectMeta: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.75,
  },
  messagesWrap: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background:
      "radial-gradient(1000px 300px at 20% 0%, rgba(60,255,177,0.06), rgba(0,0,0,0))",
  },
  emptyState: {
    color: "#fff",
    opacity: 0.72,
    fontSize: 14,
    paddingTop: 12,
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  bubbleAdmin: {
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
  },
  bubbleUser: {
    background: "rgba(60,255,177,0.16)",
    color: "#e8fff5",
    border: "1px solid rgba(60,255,177,0.22)",
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
    borderTop: "1px solid rgba(255,255,255,0.10)",
    padding: 12,
    background: "#0b0f19",
  },
  closedNote: {
    color: "#fff",
    opacity: 0.7,
    fontSize: 12,
    marginBottom: 10,
  },
  composerRow: {
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
    minWidth: 88,
  },
};