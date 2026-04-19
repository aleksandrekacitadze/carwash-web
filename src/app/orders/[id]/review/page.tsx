"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

type OrderStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "GOING_TO_LAUNDRY"
  | "WASHING"
  | "RETURNING_TO_CUSTOMER"
  | "DONE"
  | "CANCEL_REQUESTED"
  | "CANCELED";

type Order = {
  id: number;
  customerId: number;
  washerId: number | null;
  serviceId: number;
  carId: number | null;
  address: string;
  lat: number | null;
  lng: number | null;
  scheduledAt: string;
  notes: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function StarButton({
  filled,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  filled: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...S.starBtn,
        ...(filled ? S.starBtnFilled : {}),
      }}
      aria-label="Rate star"
    >
      ★
    </button>
  );
}

export default function OrderReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = useMemo(() => Number(params?.id || 0), [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function loadOrder() {
    if (!orderId) {
      setErr("Missing order id.");
      setLoading(false);
      return;
    }

    try {
      setErr("");
      setLoading(true);

      const { data } = await api.get<Order>(`/orders/${orderId}`);
      setOrder(data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load order.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const canReview = useMemo(() => {
    return !!order && order.status === "DONE" && !!order.washerId && !done;
  }, [order, done]);

  async function submitReview() {
    if (!order || !order.washerId) return;

    if (rating < 1 || rating > 5) {
      alert("Please choose a rating from 1 to 5.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post(`/washers/${order.washerId}/reviews`, {
        orderId: order.id,
        rating,
        comment: comment.trim() || undefined,
      });

      setDone(true);

      setTimeout(() => {
        router.push("/customer/dashboard");
      }, 1200);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  const visibleRating = hoverRating || rating;

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Order Review</div>
          <h1 style={S.title}>Rate your washer</h1>
          <div style={S.sub}>Share your experience after service completion.</div>
        </div>

        <div style={S.headerActions}>
          <button style={S.btnGhost} onClick={() => router.push("/orders/my")}>
            My Orders
          </button>
          <button style={S.btnGhost} onClick={() => router.push("/customer/dashboard")}>
            Dashboard
          </button>
            {/* ✅ NEW: Skip button */}
  <button style={S.btnSkip} onClick={() => router.push("/customer/dashboard")}>
    ✕ Skip
  </button>

        </div>
      </header>

      {loading ? <section style={S.card}>Loading…</section> : null}

      {err ? (
        <section style={S.card}>
          <b>⚠️</b> {err}
        </section>
      ) : null}

      {order ? (
        <div style={S.grid}>
          <section style={S.heroCard}>
            <div style={S.heroTop}>
              <div>
                <div style={S.heroTitle}>Order #{order.id}</div>
                <div style={S.heroSub}>
                  Status: <b>{order.status}</b>
                </div>
              </div>

              <div style={S.pill}>
                Washer {order.washerId ? `#${order.washerId}` : "Not assigned"}
              </div>
            </div>

            <div style={S.infoGrid}>
              <div style={S.infoBox}>
                <div style={S.infoK}>Address</div>
                <div style={S.infoV}>{order.address}</div>
              </div>

              <div style={S.infoBox}>
                <div style={S.infoK}>Scheduled</div>
                <div style={S.infoV}>{fmtDateTime(order.scheduledAt)}</div>
              </div>

              <div style={S.infoBox}>
                <div style={S.infoK}>Updated</div>
                <div style={S.infoV}>{fmtDateTime(order.updatedAt)}</div>
              </div>
            </div>
          </section>

          <section style={S.card}>
            <h2 style={S.cardTitle}>Your review</h2>

            {!order.washerId ? (
              <div style={S.noticeBox}>
                This order has no washer assigned, so it cannot be reviewed.
              </div>
            ) : order.status !== "DONE" ? (
              <div style={S.noticeBox}>
                You can review the washer only after the order is marked <b>DONE</b>.
              </div>
            ) : done ? (
              <div style={S.successBox}>
                <div style={S.successTitle}>Thank you ✅</div>
                <div style={S.successText}>
                  Your review has been submitted. Redirecting to dashboard...
                </div>

                <div style={S.afterActions}>
                  <button
                    style={S.btnPrimary}
                    onClick={() => router.push("/customer/dashboard")}
                  >
                    Go to dashboard
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={S.ratingBlock}>
                  <div style={S.label}>How was your washer?</div>

                  <div style={S.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarButton
                        key={star}
                        filled={star <= visibleRating}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                      />
                    ))}
                  </div>

                  <div style={S.ratingText}>
                    {rating === 0
                      ? "Choose a rating"
                      : rating === 1
                      ? "Very bad"
                      : rating === 2
                      ? "Bad"
                      : rating === 3
                      ? "Okay"
                      : rating === 4
                      ? "Good"
                      : "Excellent"}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={S.label}>Comment</div>
                  <textarea
                    style={S.textarea}
                    placeholder="Write your feedback (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                  />
                  <div style={S.charCount}>{comment.length}/500</div>
                </div>

                <div style={S.submitRow}>
                  <button
                    style={{
                      ...S.btnPrimary,
                      opacity: canReview && rating > 0 && !submitting ? 1 : 0.6,
                      cursor: canReview && rating > 0 && !submitting ? "pointer" : "not-allowed",
                    }}
                    disabled={!canReview || rating === 0 || submitting}
                    onClick={submitReview}
                  >
                    {submitting ? "Submitting…" : "Submit review"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "16px",
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
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
    margin: 0,
    fontSize: 28,
    fontWeight: 950,
  },
  sub: {
    marginTop: 6,
    opacity: 0.85,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 14,
  },

  heroCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 980,
  },
  heroSub: {
    marginTop: 6,
    opacity: 0.85,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    fontSize: 12,
  },

  infoGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  infoBox: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: 12,
    minWidth: 0,
  },
  infoK: {
    fontSize: 12,
    opacity: 0.75,
    fontWeight: 950,
  },
  infoV: {
    marginTop: 6,
    fontWeight: 900,
    wordBreak: "break-word",
  },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
  },

  label: {
    fontSize: 14,
    fontWeight: 900,
    opacity: 0.95,
  },
btnSkip: {
  background: "rgba(255,255,255,0.08)",
  color: "#ff6b6b",
  padding: "10px 12px",
  borderRadius: 14,
  fontWeight: 900,
  border: "1px solid rgba(255,107,107,0.4)",
  cursor: "pointer",
},
  ratingBlock: {
    marginTop: 14,
  },
  starsRow: {
    marginTop: 12,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  starBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.35)",
    fontSize: 28,
    fontWeight: 900,
    cursor: "pointer",
  },
  starBtnFilled: {
    background: "rgba(255,211,77,0.18)",
    border: "1px solid rgba(255,211,77,0.30)",
    color: "#ffd34d",
  },
  ratingText: {
    marginTop: 10,
    opacity: 0.85,
    fontWeight: 800,
  },

  textarea: {
    width: "100%",
    minHeight: 130,
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  charCount: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.7,
    textAlign: "right",
  },

  submitRow: {
    marginTop: 16,
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
  },
  btnPrimary: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
  },

  noticeBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    background: "rgba(0,0,0,0.20)",
    border: "1px solid rgba(255,255,255,0.12)",
    opacity: 0.95,
    lineHeight: 1.45,
  },

  successBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    background: "rgba(60,255,177,0.10)",
    border: "1px solid rgba(60,255,177,0.22)",
  },
  successTitle: {
    fontWeight: 950,
    fontSize: 20,
  },
  successText: {
    marginTop: 6,
    opacity: 0.9,
  },
  afterActions: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
};