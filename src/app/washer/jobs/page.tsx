"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

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
  distanceKm: number | null;
};

export default function WasherJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function registerServiceWorker() {
    if (typeof window === "undefined") return null;
    if (!("serviceWorker" in navigator)) return null;

    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;

    return navigator.serviceWorker.register("/sw.js");
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  async function subscribeWasherPush() {
    try {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;

      const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
      if (!publicKey) {
        console.warn("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY is missing");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Notification permission not granted");
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const subJson = subscription.toJSON();

      await api.post("/push-subscriptions", {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
        userAgent: navigator.userAgent,
        deviceType: "web",
        isActive: true,
      });
    } catch (error) {
      console.error("Failed to subscribe washer push:", error);
    }
  }

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const { data } = await api.get<Order[]>("/orders/available");
      setJobs(data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      await registerServiceWorker();
      await subscribeWasherPush();
      await load();
    }

    init();
  }, []);

  async function accept(orderId: number) {
    try {
      await api.post(`/orders/${orderId}/accept`);
      alert("Accepted ✅");
      router.push(`/washer/order?orderId=${orderId}`);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Accept failed.");
    }
  }

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Washer</div>
          <h1 style={S.title}>Available jobs</h1>
          <div style={S.sub}>
            Endpoint: <code>/orders/available</code> • Sorted nearest first
          </div>
        </div>

        <div style={S.headerActions}>
          <button style={S.btnGhost} onClick={load}>
            Refresh
          </button>
          <button style={S.btnGhost} onClick={() => router.push("/")}>
            Dashboard
          </button>
        </div>
      </header>

      {loading ? <div style={S.card}>Loading…</div> : null}
      {err ? (
        <div style={S.card}>
          <b>⚠️</b> {err}
        </div>
      ) : null}

      <section style={S.card}>
        <h2 style={S.cardTitle}>Jobs</h2>

        {jobs.length === 0 ? (
          <div style={S.small}>No jobs right now.</div>
        ) : (
          <div style={S.jobsList}>
            {jobs.map((o, index) => (
              <div key={o.id} style={S.jobRow}>
                <div style={S.avatar}>🧼</div>

                <div style={S.jobMain}>
                  <div style={S.topLine}>
                    <div style={S.jobTitle}>
                      #{index + 1} • Order #{o.id}
                    </div>

                    <div style={S.distancePill}>
                      {o.distanceKm != null
                        ? `${o.distanceKm} km away`
                        : "Distance unavailable"}
                    </div>
                  </div>

                  <div style={S.jobMeta}>
                    ⏰ {new Date(o.scheduledAt).toLocaleString()}
                  </div>

                  <div style={S.jobMeta}>📍 {o.address}</div>

                  {o.lat != null && o.lng != null ? (
                    <div style={S.jobMeta}>
                      GPS: ({o.lat.toFixed(4)}, {o.lng.toFixed(4)})
                    </div>
                  ) : null}

                  {o.notes ? <div style={S.jobMeta}>📝 {o.notes}</div> : null}

                  <div style={S.jobMeta}>
                    Status: <b>{o.status}</b>
                  </div>
                </div>

                <div style={S.actionBox}>
                  <button style={S.btnPrimary} onClick={() => accept(o.id)}>
                    Accept
                  </button>
                </div>
              </div>
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

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
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
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
    whiteSpace: "nowrap",
    width: "100%",
  },

  jobsList: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },

  jobRow: {
    display: "flex",
    alignItems: "stretch",
    gap: 12,
    padding: "12px",
    borderRadius: 16,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
    flexWrap: "wrap",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.10)",
    flex: "0 0 46px",
    fontSize: 20,
  },

  jobMain: {
    flex: "1 1 280px",
    minWidth: 0,
  },
  topLine: {
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  jobTitle: {
    fontWeight: 950,
    minWidth: 0,
  },
  distancePill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(60,255,177,0.12)",
    border: "1px solid rgba(60,255,177,0.24)",
    color: "#c8ffe7",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  jobMeta: {
    opacity: 0.82,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 1.4,
    wordBreak: "break-word",
  },

  actionBox: {
    flex: "1 1 140px",
    display: "flex",
    alignItems: "center",
    minWidth: 120,
  },

  small: {
    opacity: 0.8,
    fontSize: 12,
    marginTop: 12,
  },
};