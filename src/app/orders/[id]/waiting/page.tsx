"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const LiveOrderMap = dynamic(() => import("@/components/LiveOrderMap"), {
  ssr: false,
});

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

  acceptedAt: string | null;
  onTheWayAt?: string | null;
  goingToLaundryAt?: string | null;
  washingAt?: string | null;
  returningAt?: string | null;
  doneAt?: string | null;

  cancelRequestedAt: string | null;
  cancelReason: string | null;
  canceledAt: string | null;

  chargePercent: number | null;
  adminDecisionNote: string | null;

  createdAt: string;
  updatedAt: string;
};

type LiveResp = {
  mode: "NEARBY_WASHERS" | "ASSIGNED_WASHER";
  customer: { lat: number; lng: number } | null;
  washers: { id: number; lat: number; lng: number; status?: string }[];
  assignedWasherId: number | null;
  orderStatus: OrderStatus;
  activeWindowSec: number;
};

type LiveEtaResp = {
  mode: "NO_CUSTOMER_LOCATION" | "NO_ASSIGNED_WASHER" | "WASHER_OFFLINE" | "LIVE_ETA";
  orderId: number;
  orderStatus: OrderStatus;
  customer: { lat: number; lng: number } | null;
  washer: { id: number; lat: number; lng: number } | null;
  activeWindowSec: number;
  distanceMeters: number | null;
  distanceText: string | null;
  durationSeconds: number | null;
  durationText: string | null;
  staticDurationSeconds: number | null;
  staticDurationText: string | null;
  lastSeenAt: string | null;
};

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function WaitingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = useMemo(() => Number(params?.id || 0), [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [live, setLive] = useState<LiveResp | null>(null);
  const [eta, setEta] = useState<LiveEtaResp | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);

  async function fetchOrderOnce() {
    if (!orderId) {
      setErr("Missing order id.");
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get<Order>(`/orders/${orderId}`);
      setOrder(data);
      setErr("");
    } catch (e: any) {
      setOrder(null);
      setErr(e?.response?.data?.message || e?.message || "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLive() {
    if (!orderId) return;
    try {
      const { data } = await api.get<LiveResp>(`/orders/${orderId}/live`);
      setLive(data);
    } catch {
      // silent
    }
  }

  async function fetchLiveEta() {
    if (!orderId) return;
    try {
      const { data } = await api.get<LiveEtaResp>(`/orders/${orderId}/live-eta`);
      setEta(data);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchOrderOnce();
    fetchLive();
    fetchLiveEta();

    const t = setInterval(() => {
      fetchOrderOnce();
      fetchLive();
      fetchLiveEta();
    }, 5000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function cancel() {
    if (!order) return;

    setCanceling(true);
    try {
      await api.post(`/orders/${order.id}/cancel`, {
        reason: cancelReason.trim() || undefined,
      });
      await fetchOrderOnce();
      await fetchLive();
      await fetchLiveEta();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Cancel failed");
    } finally {
      setCanceling(false);
    }
  }

  const ui = useMemo(() => {
    if (!order) return null;

    const steps = [
      {
        key: "REQUESTED" as const,
        title: "Searching washer",
        hint: "We’re finding a washer near you",
        time: fmtTime(order.createdAt),
      },
      {
        key: "ACCEPTED" as const,
        title: "Washer accepted",
        hint: order.washerId
          ? `Washer #${order.washerId} accepted your job`
          : "A washer accepted your job",
        time: fmtTime(order.acceptedAt),
      },
      {
        key: "ON_THE_WAY" as const,
        title: "On the way",
        hint: "Washer is driving to your location",
        time: fmtTime(order.onTheWayAt ?? (order.status === "ON_THE_WAY" ? order.updatedAt : null)),
      },
      {
        key: "GOING_TO_LAUNDRY" as const,
        title: "Going to laundry",
        hint: "Your vehicle is being taken to laundry",
        time: fmtTime(
          order.goingToLaundryAt ??
            (order.status === "GOING_TO_LAUNDRY" ? order.updatedAt : null)
        ),
      },
      {
        key: "WASHING" as const,
        title: "Washing",
        hint: "Your car is being washed now",
        time: fmtTime(order.washingAt ?? (order.status === "WASHING" ? order.updatedAt : null)),
      },
      {
        key: "RETURNING_TO_CUSTOMER" as const,
        title: "Returning to customer",
        hint: "Washer is driving back to you",
        time: fmtTime(
          order.returningAt ??
            (order.status === "RETURNING_TO_CUSTOMER" ? order.updatedAt : null)
        ),
      },
      {
        key: "DONE" as const,
        title: "Done",
        hint: "Service completed ✅",
        time: fmtTime(order.doneAt ?? (order.status === "DONE" ? order.updatedAt : null)),
      },
    ];

    const statusIndex = steps.findIndex((x) => x.key === order.status);

    const hero =
      order.status === "CANCELED"
        ? { title: "Canceled", subtitle: "Your order is canceled." }
        : order.status === "CANCEL_REQUESTED"
        ? { title: "Cancel requested", subtitle: "Waiting for admin decision." }
        : order.status === "REQUESTED"
        ? { title: "Searching washer", subtitle: "We’re showing washers near you on the map." }
        : order.status === "ACCEPTED"
        ? { title: "Washer accepted", subtitle: "Only your assigned washer will be tracked." }
        : order.status === "ON_THE_WAY"
        ? { title: "Washer is on the way", subtitle: "Tracking your washer live." }
        : order.status === "GOING_TO_LAUNDRY"
        ? { title: "Going to laundry", subtitle: "Your vehicle is being taken to laundry." }
        : order.status === "WASHING"
        ? { title: "Washing in progress", subtitle: "Your car is being washed now." }
        : order.status === "RETURNING_TO_CUSTOMER"
        ? { title: "Returning to you", subtitle: "Washer is driving back to your location." }
        : { title: "Done", subtitle: "Your service is completed ✅" };

    return { steps, statusIndex, hero };
  }, [order]);

  const etaText = useMemo(() => {
    if (!eta) return "—";
    if (eta.mode !== "LIVE_ETA") return "—";
    return eta.durationText ?? "—";
  }, [eta]);

  const distanceText = useMemo(() => {
    if (!eta) return "—";
    if (eta.mode !== "LIVE_ETA") return "—";
    return eta.distanceText ?? "—";
  }, [eta]);

  const etaStateText = useMemo(() => {
    if (!eta) return "Loading ETA…";
    if (eta.mode === "NO_ASSIGNED_WASHER") return "Waiting for washer assignment";
    if (eta.mode === "NO_CUSTOMER_LOCATION") return "Customer location unavailable";
    if (eta.mode === "WASHER_OFFLINE") return "Washer GPS offline";
    return `Updated ${fmtTime(eta.lastSeenAt)}`;
  }, [eta]);

  const mapCustomer = useMemo(() => {
    if (live?.customer) return live.customer;
    if (order?.lat != null && order?.lng != null) return { lat: order.lat, lng: order.lng };
    return null;
  }, [live?.customer, order?.lat, order?.lng]);

  const mapMode =
    live?.mode ?? (order?.status === "REQUESTED" ? "NEARBY_WASHERS" : "ASSIGNED_WASHER");

  const mapWashers = useMemo(() => live?.washers ?? [], [live?.washers]);

  const assignedWasherId = useMemo(
    () => live?.assignedWasherId ?? order?.washerId ?? null,
    [live?.assignedWasherId, order?.washerId]
  );

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Order #{orderId || "—"}</div>
          <h1 style={S.title}>Tracking</h1>
          <div style={S.sub}>
            Live updates every 5 seconds • Last update: <b>{order ? fmtTime(order.updatedAt) : "—"}</b>
          </div>
        </div>

        <div style={S.headerActions}>
          <a style={S.btn} href="/customer/dashboard">
            Dashboard
          </a>
          <a style={S.btn} href="/orders/my">
            My Orders
          </a>
        </div>
      </header>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? (
        <div style={S.card}>
          <b>⚠️</b> {err}
        </div>
      ) : null}

      {order && ui ? (
        <div style={S.grid}>
          <section style={S.heroCard}>
            <div style={S.heroTop}>
              <div>
                <div style={S.heroTitle}>{ui.hero.title}</div>
                <div style={S.heroSub}>{ui.hero.subtitle}</div>
              </div>

              <div style={S.etaWrap}>
                <div style={S.etaPill}>
                  ETA <b style={{ marginLeft: 6 }}>{etaText}</b>
                </div>
                <div style={S.etaPillSecondary}>
                  Distance <b style={{ marginLeft: 6 }}>{distanceText}</b>
                </div>
              </div>
            </div>

            <div style={S.mapBox}>
              {mapCustomer ? (
                <LiveOrderMap
                  customer={mapCustomer}
                  washers={mapWashers}
                  assignedWasherId={assignedWasherId}
                  mode={mapMode as any}
                />
              ) : (
                <div style={S.mapFake}>
                  <div style={S.mapBadge}>MAP</div>
                  <div style={S.mapText}>No customer location found for this order.</div>
                </div>
              )}

              <div style={S.mapStatusRow}>
                <div style={S.mapPill}>
                  Status: <b style={{ marginLeft: 6 }}>{order.status}</b>
                </div>
                <div style={S.mapPill}>
                  Mode: <b style={{ marginLeft: 6 }}>{mapMode}</b>
                </div>
                <div style={S.mapPill}>
                  Washers shown: <b style={{ marginLeft: 6 }}>{mapWashers.length}</b>
                </div>
                <div style={S.mapPill}>
                  ETA state: <b style={{ marginLeft: 6 }}>{etaStateText}</b>
                </div>
              </div>
            </div>

            <div style={S.heroInfoRow}>
              <div style={S.infoPill}>
                <div style={S.infoK}>Address</div>
                <div style={S.infoV}>{order.address}</div>
              </div>
              <div style={S.infoPill}>
                <div style={S.infoK}>Scheduled</div>
                <div style={S.infoV}>{fmtDateTime(order.scheduledAt)}</div>
              </div>
              <div style={S.infoPill}>
                <div style={S.infoK}>Washer</div>
                <div style={S.infoV}>{order.washerId ? `#${order.washerId}` : "Not assigned"}</div>
              </div>
            </div>
          </section>

          <section style={S.card}>
            <h2 style={S.cardTitle}>Progress</h2>

            {order.status === "CANCELED" || order.status === "CANCEL_REQUESTED" ? (
              <div style={S.specialBox}>
                <div style={{ fontWeight: 950, fontSize: 18 }}>
                  {order.status === "CANCELED" ? "Canceled" : "Cancel requested"}
                </div>
                <div style={{ opacity: 0.85, marginTop: 6 }}>
                  {order.status === "CANCELED"
                    ? "Your order is canceled."
                    : "Waiting for admin decision."}
                </div>

                {order.cancelReason ? (
                  <div style={{ marginTop: 10, opacity: 0.9 }}>
                    Reason: <b>{order.cancelReason}</b>
                  </div>
                ) : null}

                {order.chargePercent != null ? (
                  <div style={{ marginTop: 10, opacity: 0.9 }}>
                    Charge percent: <b>{order.chargePercent}%</b>
                  </div>
                ) : null}

                {order.adminDecisionNote ? (
                  <div style={{ marginTop: 10, opacity: 0.9 }}>
                    Admin note: <b>{order.adminDecisionNote}</b>
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {ui.steps.map((step, i) => {
                  const active = ui.statusIndex >= i && ui.statusIndex !== -1;
                  const current = ui.statusIndex === i;

                  return (
                    <div key={step.key} style={S.stepRow}>
                      <div
                        style={{
                          ...S.dot,
                          ...(active ? S.dotOn : S.dotOff),
                          ...(current ? S.dotCurrent : {}),
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={S.stepHead}>
                          <span style={S.stepTitle}>{step.title}</span>
                          <span style={S.timeTag}>{step.time}</span>
                        </div>
                        <div style={{ opacity: 0.8, fontSize: 12 }}>{step.hint}</div>
                      </div>
                      <div style={{ marginLeft: "auto", opacity: 0.9, fontWeight: 950 }}>
                        {active ? "✓" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={S.small}>
              Current status: <b>{order.status}</b>
            </div>
          </section>

          <section style={S.card}>
            <h2 style={S.cardTitle}>Cancel</h2>

            <div style={{ opacity: 0.85, fontSize: 12, marginTop: 8 }}>
              If washer is not assigned yet: instant cancel. If assigned: cancel request → admin
              decides.
            </div>

            <input
              style={S.input}
              placeholder="Reason (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            <button
              style={{
                ...S.dangerBtn,
                opacity: order.status === "DONE" || order.status === "CANCELED" ? 0.55 : 1,
                cursor:
                  order.status === "DONE" || order.status === "CANCELED"
                    ? "not-allowed"
                    : "pointer",
              }}
              onClick={cancel}
              disabled={canceling || order.status === "DONE" || order.status === "CANCELED"}
            >
              {canceling ? "Sending…" : "Cancel / Request cancel"}
            </button>

            <div style={S.small}>
              Order created: <b>{fmtDateTime(order.createdAt)}</b>
              <br />
              Last updated: <b>{fmtDateTime(order.updatedAt)}</b>
            </div>

            <div style={S.actionRow}>
              <button style={S.btn2} onClick={() => router.push("/orders/my")}>
                View my orders
              </button>
              <button style={S.btn2} onClick={() => router.push("/customer/dashboard")}>
                New order
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
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
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 950,
  },
  sub: {
    marginTop: 6,
    opacity: 0.85,
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

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 14,
    alignItems: "start",
  },

  heroCard: {
    gridColumn: "1 / -1",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
  },

  heroTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 980,
    letterSpacing: "-0.02em",
  },
  heroSub: {
    marginTop: 6,
    opacity: 0.85,
  },

  etaWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  etaPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(60,255,177,0.15)",
    border: "1px solid rgba(60,255,177,0.25)",
    fontWeight: 900,
    color: "#c8ffe7",
  },
  etaPillSecondary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.15)",
    fontWeight: 900,
    color: "#fff",
  },

  mapBox: { marginTop: 12 },
  mapFake: {
    height: 260,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(135deg, rgba(60,255,177,0.10), rgba(255,255,255,0.04))",
    position: "relative",
    overflow: "hidden",
    padding: 16,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
  },
  mapBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 900,
    fontSize: 12,
  },
  mapText: {
    maxWidth: 520,
    opacity: 0.95,
    fontWeight: 900,
    lineHeight: 1.4,
  },

  mapStatusRow: {
    marginTop: 10,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  mapPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 900,
    fontSize: 12,
  },

  heroInfoRow: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  infoPill: {
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
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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

  btn: {
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btn2: {
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    flex: "1 1 220px",
  },

  small: {
    opacity: 0.8,
    fontSize: 12,
    marginTop: 12,
  },

  stepRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  stepHead: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  stepTitle: {
    fontWeight: 950,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    flex: "0 0 12px",
  },
  dotOn: { background: "#3cffb1" },
  dotOff: { background: "rgba(255,255,255,0.25)" },
  dotCurrent: { boxShadow: "0 0 0 6px rgba(60,255,177,0.12)" },

  timeTag: {
    fontSize: 12,
    fontWeight: 950,
    opacity: 0.8,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
  },

  input: {
    width: "100%",
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
  },

  dangerBtn: {
    width: "100%",
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 14,
    border: "none",
    fontWeight: 950,
    background: "#ff4d4d",
    color: "#0b0f19",
  },

  specialBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    background: "rgba(0,0,0,0.20)",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  actionRow: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
};