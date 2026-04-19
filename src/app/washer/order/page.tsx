"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type PaymentMode = "CREDIT" | "DIRECT" | "CASH";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

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

  paymentMode: PaymentMode | null;
  paymentStatus: PaymentStatus;
  isPaid: boolean;

  acceptedAt: string | null;
  cancelRequestedAt: string | null;
  cancelReason: string | null;
  canceledAt: string | null;
  chargePercent: number | null;
  adminDecisionNote: string | null;

  createdAt: string;
  updatedAt: string;
};

type Step = {
  key: OrderStatus;
  label: string;
  hint: string;
  next?: OrderStatus;
};

const STEPS: Step[] = [
  {
    key: "ACCEPTED",
    label: "Accepted",
    hint: "You accepted the job",
    next: "ON_THE_WAY",
  },
  {
    key: "ON_THE_WAY",
    label: "On the way",
    hint: "Drive to customer location",
    next: "GOING_TO_LAUNDRY",
  },
  {
    key: "GOING_TO_LAUNDRY",
    label: "Going to laundry",
    hint: "Vehicle collected, heading to laundry",
    next: "WASHING",
  },
  {
    key: "WASHING",
    label: "Washing",
    hint: "Cleaning is in progress",
    next: "RETURNING_TO_CUSTOMER",
  },
  {
    key: "RETURNING_TO_CUSTOMER",
    label: "Returning to customer",
    hint: "Driving back to the customer",
    next: "DONE",
  },
  {
    key: "DONE",
    label: "Done",
    hint: "Service completed ✅",
  },
];

function estimateEtaMinutes(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return null;
  return 12;
}

function WasherOrderInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const orderId = useMemo(() => Number(sp.get("orderId") || "0"), [sp]);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updating, setUpdating] = useState(false);

  const [gpsState, setGpsState] = useState<
    "idle" | "requesting" | "tracking" | "denied" | "unsupported" | "error"
  >("idle");

  const [gpsError, setGpsError] = useState("");

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const stepIndex = useMemo(() => {
    if (!order) return -1;
    return STEPS.findIndex((s) => s.key === order.status);
  }, [order]);

  const nextStatus = useMemo(() => {
    if (!order) return null;
    const step = STEPS.find((s) => s.key === order.status);
    return step?.next ?? null;
  }, [order]);

  const isBlocked = useMemo(() => {
    if (!order) return false;
    return (
      order.status === "CANCEL_REQUESTED" ||
      order.status === "CANCELED" ||
      order.status === "DONE"
    );
  }, [order]);

  const shouldTrackLiveLocation = useMemo(() => {
    if (!order) return false;
    return (
      order.status === "ACCEPTED" ||
      order.status === "ON_THE_WAY" ||
      order.status === "GOING_TO_LAUNDRY" ||
      order.status === "WASHING" ||
      order.status === "RETURNING_TO_CUSTOMER"
    );
  }, [order]);

  const needsCashCollectionBeforeDone = useMemo(() => {
    if (!order) return false;
    return (
      order.paymentMode === "CASH" &&
      order.paymentStatus !== "PAID" &&
      order.status === "RETURNING_TO_CUSTOMER"
    );
  }, [order]);

  const showCashCollectedButton = useMemo(() => {
    if (!order) return false;
    return (
      order.paymentMode === "CASH" &&
      order.paymentStatus !== "PAID" &&
      order.status === "RETURNING_TO_CUSTOMER"
    );
  }, [order]);

  const canAdvanceNormally = useMemo(() => {
    if (!order || !nextStatus) return false;
    if (isBlocked) return false;

    if (
      order.status === "RETURNING_TO_CUSTOMER" &&
      order.paymentMode === "CASH" &&
      order.paymentStatus !== "PAID"
    ) {
      return false;
    }

    return true;
  }, [order, nextStatus, isBlocked]);

  async function fetchOrder() {
    if (!orderId) {
      setErr("Missing orderId. Open from Jobs page after accepting.");
      setLoading(false);
      return;
    }

    try {
      setErr("");
      setLoading(true);

      const { data } = await api.get<Order[]>("/orders/washer/my");
      const found = (data || []).find((o) => o.id === orderId) || null;

      if (!found) {
        setOrder(null);
        setErr("Order not found in your assigned jobs. (Maybe not accepted yet?)");
      } else {
        setOrder(found);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrder();
    const t = setInterval(fetchOrder, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function setStatus(status: OrderStatus) {
    if (!order) return;

    try {
      setUpdating(true);
      await api.patch(`/orders/${order.id}/status`, { status });
      await fetchOrder();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Status update failed");
    } finally {
      setUpdating(false);
      resetSlider();
    }
  }

  async function markCashCollected() {
    if (!order) return;

    try {
      setUpdating(true);
      await api.patch(`/orders/${order.id}/cash-collected`);
      await fetchOrder();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to mark cash collected");
    } finally {
      setUpdating(false);
    }
  }

  async function sendLiveLocation(lat: number, lng: number) {
    await api.post("/users/me/location", { lat, lng });
  }

  useEffect(() => {
    if (!shouldTrackLiveLocation) {
      setGpsState("idle");
      setGpsError("");
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsState("unsupported");
      setGpsError("Geolocation is not supported in this browser.");
      return;
    }

    let watchId: number | null = null;
    let stopped = false;

    setGpsState("requesting");
    setGpsError("");

    watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (stopped) return;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          await sendLiveLocation(lat, lng);
          if (!stopped) {
            setGpsState("tracking");
            setGpsError("");
          }
        } catch (e: any) {
          if (!stopped) {
            setGpsState("error");
            setGpsError(
              e?.response?.data?.message || e?.message || "Failed to send live location."
            );
          }
        }
      },
      (geoErr) => {
        if (stopped) return;

        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setGpsState("denied");
          setGpsError("Location permission denied. Enable GPS permission for live tracking.");
        } else {
          setGpsState("error");
          setGpsError(geoErr.message || "Unable to get your live location.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      stopped = true;
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [shouldTrackLiveLocation]);

  function openGoogleMapsDirections() {
    if (!order) return;

    const destination =
      order.lat != null && order.lng != null
        ? `${order.lat},${order.lng}`
        : encodeURIComponent(order.address);

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openGoogleMapsSearch() {
    if (!order) return;

    const url =
      order.lat != null && order.lng != null
        ? `https://www.google.com/maps/search/?api=1&query=${order.lat},${order.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function resetSlider() {
    setDragX(0);
    setDragging(false);
  }

  function getMaxDrag() {
    const track = sliderRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return 0;
    const trackW = track.getBoundingClientRect().width;
    const knobW = knob.getBoundingClientRect().width;
    return Math.max(0, trackW - knobW - 6);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!canAdvanceNormally || updating) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !canAdvanceNormally || updating) return;

    const track = sliderRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const max = getMaxDrag();
    const x = e.clientX - rect.left - 32;
    const clamped = Math.max(0, Math.min(max, x));
    setDragX(clamped);
  }

  async function onPointerUp() {
    if (!dragging) return;
    const max = getMaxDrag();
    const ratio = max === 0 ? 0 : dragX / max;

    if (ratio >= 0.92 && nextStatus && canAdvanceNormally) {
      await setStatus(nextStatus);
      return;
    }

    resetSlider();
  }

  const etaMin = useMemo(
    () => estimateEtaMinutes(order?.lat ?? null, order?.lng ?? null),
    [order?.lat, order?.lng]
  );

  const stageTitle = useMemo(() => {
    if (!order) return "";
    if (order.status === "CANCEL_REQUESTED") return "Cancel requested (admin decision)";
    if (order.status === "CANCELED") return "Canceled";
    const s = STEPS.find((x) => x.key === order.status);
    return s ? s.label : order.status;
  }, [order]);

  const stageHint = useMemo(() => {
    if (!order) return "";
    if (order.status === "CANCEL_REQUESTED") {
      return "Customer requested cancel. You cannot change status now.";
    }
    if (order.status === "CANCELED") return "Order is canceled.";

    if (needsCashCollectionBeforeDone) {
      return "Collect cash first, then finish the order.";
    }

    const s = STEPS.find((x) => x.key === order.status);
    return s ? s.hint : "";
  }, [order, needsCashCollectionBeforeDone]);

  const gpsStatusText = useMemo(() => {
    switch (gpsState) {
      case "tracking":
        return "Live GPS is active and being sent to customer tracking.";
      case "requesting":
        return "Requesting GPS permission…";
      case "denied":
        return "GPS permission denied.";
      case "unsupported":
        return "GPS is not supported in this browser.";
      case "error":
        return gpsError || "GPS error.";
      default:
        return shouldTrackLiveLocation
          ? "GPS tracking will start on active job statuses."
          : "Live GPS tracking is off for this status.";
    }
  }, [gpsState, gpsError, shouldTrackLiveLocation]);

  const paymentText = useMemo(() => {
    if (!order) return "";
    const mode = order.paymentMode ?? "—";
    return `${mode} • ${order.paymentStatus}`;
  }, [order]);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Washer • Order #{orderId || "—"}</div>
          <h1 style={S.title}>Job control</h1>
          <div style={S.sub}>
            Live refresh every 3 seconds • Swipe to advance statuses.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={S.btnGhost} onClick={() => router.push("/washer/jobs")}>
            Jobs
          </button>
          <button style={S.btnGhost} onClick={() => router.push("/")}>
            Dashboard
          </button>
          <button style={S.btnGhost} onClick={fetchOrder}>
            Refresh
          </button>
        </div>
      </header>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? (
        <div style={S.card}>
          <b>⚠️</b> {err}
        </div>
      ) : null}

      {order ? (
        <div style={S.grid}>
          <section style={S.card}>
            <div style={S.statusTop}>
              <div style={S.statusIcon}>🧼</div>
              <div style={{ minWidth: 0 }}>
                <div style={S.statusTitle}>{stageTitle}</div>
                <div style={S.statusHint}>{stageHint}</div>
              </div>
              <div style={S.pill}>{order.status}</div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {STEPS.map((st, i) => {
                const idx = stepIndex;
                const active = idx >= i && idx !== -1;
                const current = idx === i;

                return (
                  <div key={st.key} style={S.stepRow}>
                    <div
                      style={{
                        ...S.dot,
                        ...(active ? S.dotOn : S.dotOff),
                        ...(current ? S.dotCurrent : {}),
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 950 }}>
                        {st.label} {current ? "•" : ""}
                      </div>
                      <div style={{ opacity: 0.8, fontSize: 12 }}>{st.hint}</div>
                    </div>
                    <div style={{ marginLeft: "auto", opacity: 0.9, fontWeight: 900 }}>
                      {active ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={S.swipeBox}>
              <div style={S.swipeTitle}>Swipe to update</div>

              {!nextStatus ? (
                <div style={S.small}>
                  {order.status === "DONE" ? "Job finished ✅" : "No next status available."}
                </div>
              ) : isBlocked ? (
                <div style={S.small}>Blocked: {order.status}</div>
              ) : needsCashCollectionBeforeDone ? (
                <div style={S.cashNotice}>
                  Cash payment is still pending. Tap <b>Cash Collected</b> first.
                </div>
              ) : (
                <div
                  ref={sliderRef}
                  style={S.slider}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  <div style={S.sliderText}>
                    Swipe to set <b>{nextStatus}</b>
                  </div>

                  <div
                    ref={knobRef}
                    style={{
                      ...S.knob,
                      transform: `translateX(${dragX}px)`,
                      opacity: updating ? 0.6 : 1,
                      cursor: updating ? "not-allowed" : "grab",
                    }}
                    onPointerDown={onPointerDown}
                  >
                    {updating ? "…" : "➜"}
                  </div>
                </div>
              )}

              {canAdvanceNormally && nextStatus ? (
                <button
                  style={S.btnPrimary}
                  onClick={() => setStatus(nextStatus)}
                  disabled={updating}
                  title="Desktop alternative"
                >
                  {updating ? "Updating…" : `Set ${nextStatus}`}
                </button>
              ) : null}

              {showCashCollectedButton ? (
                <button
                  style={S.btnCash}
                  onClick={markCashCollected}
                  disabled={updating}
                >
                  {updating ? "Processing…" : "💵 Cash Collected"}
                </button>
              ) : null}
            </div>
          </section>

          <section style={S.card}>
            <h2 style={S.cardTitle}>Customer location</h2>

            <div style={S.mapFake}>
              <div style={S.mapPin}>📍</div>

              <div style={S.mapText}>
                <div style={{ fontWeight: 950, fontSize: 14 }}>Destination</div>
                <div style={{ opacity: 0.85, marginTop: 6 }}>{order.address}</div>

                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                  {order.lat != null && order.lng != null
                    ? `GPS: ${order.lat}, ${order.lng}`
                    : "No GPS coords provided"}
                </div>

                {etaMin ? (
                  <div style={{ marginTop: 10, fontWeight: 950 }}>
                    Estimated ETA: ~{etaMin} min (placeholder)
                  </div>
                ) : (
                  <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
                    ETA needs GPS coordinates + routing API.
                  </div>
                )}

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <button style={S.btnPrimary} onClick={openGoogleMapsDirections}>
                    Navigate with Google Maps
                  </button>

                  <button style={S.btnGhost} onClick={openGoogleMapsSearch}>
                    Open destination on map
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={S.kv}>
                <div style={S.k}>Scheduled</div>
                <div style={S.v}>{new Date(order.scheduledAt).toLocaleString()}</div>
              </div>

              {order.notes ? (
                <div style={S.kv}>
                  <div style={S.k}>Notes</div>
                  <div style={S.v}>{order.notes}</div>
                </div>
              ) : null}

              <div style={S.kv}>
                <div style={S.k}>Order</div>
                <div style={S.v}>#{order.id}</div>
              </div>

              <div style={S.kv}>
                <div style={S.k}>Payment</div>
                <div style={S.v}>{paymentText}</div>
              </div>

              <div style={S.kv}>
                <div style={S.k}>Paid</div>
                <div style={S.v}>{order.isPaid ? "Yes ✅" : "No"}</div>
              </div>

              <div style={S.kv}>
                <div style={S.k}>Live GPS</div>
                <div style={S.v}>{gpsStatusText}</div>
              </div>
            </div>

            <div style={S.small}>
              Backend endpoints used by this page:
              <br />• GET <b>/orders/washer/my</b> (load assigned order)
              <br />• PATCH <b>/orders/:id/status</b> (update status)
              <br />• PATCH <b>/orders/:id/cash-collected</b> (mark cash payment collected)
              <br />• POST <b>/users/me/location</b> (send washer live GPS)
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default function WasherOrderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading…</div>}>
      <WasherOrderInner />
    </Suspense>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 16,
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
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
  title: { margin: 0, fontSize: 26, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.85 },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 900 },

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
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
  },
  btnCash: {
    width: "100%",
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#ffd166",
    color: "#1a1a1a",
  },

  statusTop: { display: "flex", alignItems: "center", gap: 12 },
  statusIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
    flex: "0 0 54px",
    fontSize: 22,
  },
  statusTitle: {
    fontWeight: 950,
    fontSize: 18,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  statusHint: { opacity: 0.8, fontSize: 12, marginTop: 6, lineHeight: 1.35 },
  pill: {
    marginLeft: "auto",
    padding: "8px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
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
  dot: { width: 12, height: 12, borderRadius: 999, flex: "0 0 12px" },
  dotOn: { background: "#fff" },
  dotOff: { background: "rgba(255,255,255,0.25)" },
  dotCurrent: { boxShadow: "0 0 0 6px rgba(255,255,255,0.10)" },

  swipeBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    background: "rgba(0,0,0,0.20)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  swipeTitle: { fontWeight: 950, marginBottom: 10 },

  slider: {
    position: "relative",
    width: "100%",
    height: 54,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    touchAction: "none",
    userSelect: "none",
  },
  sliderText: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    opacity: 0.9,
    pointerEvents: "none",
  },
  knob: {
    position: "absolute",
    left: 3,
    top: 3,
    width: 64,
    height: 48,
    borderRadius: 999,
    background: "#3cffb1",
    color: "#062112",
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
  },

  cashNotice: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(255, 209, 102, 0.12)",
    border: "1px solid rgba(255, 209, 102, 0.35)",
    color: "#ffe7a3",
    fontSize: 14,
    lineHeight: 1.4,
  },

  mapFake: {
    marginTop: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "radial-gradient(1200px 500px at 20% 10%, rgba(60,255,177,0.10), rgba(0,0,0,0.20)), rgba(0,0,0,0.18)",
    padding: 14,
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  mapPin: {
    width: 46,
    height: 46,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
    flex: "0 0 46px",
    fontSize: 22,
  },
  mapText: { flex: 1, minWidth: 0 },

  kv: {
    display: "grid",
    gridTemplateColumns: "90px 1fr",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  k: { opacity: 0.75, fontWeight: 900 },
  v: { fontWeight: 800 },

  small: { opacity: 0.8, fontSize: 12, marginTop: 12 },
};