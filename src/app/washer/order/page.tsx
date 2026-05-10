"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import dynamic from "next/dynamic";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { api } from "@/lib/api";

const LiveOrderMap = dynamic(
  () =>
    import(
      "@/components/LiveOrderMap"
    ),
  {
    ssr: false,
  },
);

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

  address: string;

  lat: number | null;

  lng: number | null;

  status: OrderStatus;

  scheduledAt: string;

  createdAt: string;

  updatedAt: string;
};

type LiveResp = {
  mode:
    | "NEARBY_WASHERS"
    | "ASSIGNED_WASHER";

  customer: {
    lat: number;
    lng: number;
  } | null;

  washers: {
    id: number;
    lat: number;
    lng: number;
    status?: string;
  }[];

  assignedWasherId:
    | number
    | null;

  orderStatus: OrderStatus;

  activeWindowSec: number;
};

type LiveEtaResp = {
  mode:
    | "NO_CUSTOMER_LOCATION"
    | "NO_ASSIGNED_WASHER"
    | "WASHER_OFFLINE"
    | "LIVE_ETA";

  orderId: number;

  orderStatus: OrderStatus;

  customer: {
    lat: number;
    lng: number;
  } | null;

  washer: {
    id: number;
    lat: number;
    lng: number;
  } | null;

  distanceMeters: number | null;

  distanceText: string | null;

  durationSeconds: number | null;

  durationText: string | null;

  staticDurationSeconds:
    | number
    | null;

  staticDurationText:
    | string
    | null;

  lastSeenAt: string | null;
};

export default function WasherLiveOrderPage() {
  const router = useRouter();

  const params = useParams();

  const orderId = useMemo(
    () => Number(params?.id || 0),
    [params],
  );

  const [order, setOrder] =
    useState<Order | null>(
      null,
    );

  const [live, setLive] =
    useState<LiveResp | null>(
      null,
    );

  const [eta, setEta] =
    useState<LiveEtaResp | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [err, setErr] =
    useState("");

  const wakeLockRef =
    useRef<any>(null);

  // ----------------------------------------
  // WAKE LOCK
  // ----------------------------------------

  async function enableWakeLock() {
    try {
      if (
        "wakeLock" in navigator
      ) {
        // @ts-ignore
        wakeLockRef.current =
          await navigator.wakeLock.request(
            "screen",
          );

        console.log(
          "Wake lock enabled",
        );

        wakeLockRef.current?.addEventListener(
          "release",
          () => {
            console.log(
              "Wake lock released",
            );
          },
        );
      }
    } catch (e) {
      console.error(
        "Wake lock failed",
        e,
      );
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockRef.current?.release();

      wakeLockRef.current =
        null;
    } catch (e) {
      console.error(e);
    }
  }

  // ----------------------------------------
  // FETCH ORDER
  // ----------------------------------------

  async function fetchOrder() {
    if (!orderId) return;

    try {
      const { data } =
        await api.get<Order>(
          `/orders/${orderId}`,
        );

      setOrder(data);

      setErr("");
    } catch (e: any) {
      console.error(e);

      setErr(
        e?.response?.data
          ?.message ||
          e?.message ||
          "Failed to load order",
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------
  // FETCH LIVE MAP
  // ----------------------------------------

  async function fetchLive() {
    if (!orderId) return;

    try {
      const { data } =
        await api.get<LiveResp>(
          `/orders/${orderId}/live`,
        );

      setLive(data);
    } catch (e) {
      console.error(e);
    }
  }

  // ----------------------------------------
  // FETCH ETA
  // ----------------------------------------

  async function fetchEta() {
    if (!orderId) return;

    try {
      const { data } =
        await api.get<LiveEtaResp>(
          `/orders/${orderId}/live-eta`,
        );

      setEta(data);
    } catch (e) {
      console.error(
        "ETA fetch failed",
        e,
      );
    }
  }

  // ----------------------------------------
  // POLLING
  // ----------------------------------------

  useEffect(() => {
    enableWakeLock();

    fetchOrder();

    fetchLive();

    fetchEta();

    const t = setInterval(() => {
      fetchOrder();

      fetchLive();

      fetchEta();
    }, 5000);

    return () => {
      clearInterval(t);

      releaseWakeLock();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // ----------------------------------------
  // MAP DATA
  // ----------------------------------------

  const mapCustomer =
    useMemo(() => {
      if (live?.customer)
        return live.customer;

      if (
        order?.lat != null &&
        order?.lng != null
      ) {
        return {
          lat: order.lat,
          lng: order.lng,
        };
      }

      return null;
    }, [
      live?.customer,
      order?.lat,
      order?.lng,
    ]);

  const mapMode =
    live?.mode ??
    "ASSIGNED_WASHER";

  const mapWashers =
    useMemo(
      () => live?.washers ?? [],
      [live?.washers],
    );

  // ----------------------------------------
  // UI
  // ----------------------------------------

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>
            Order #{orderId}
          </div>

          <h1 style={S.title}>
            Live Tracking
          </h1>

          <div style={S.sub}>
            Live updates every 5
            seconds
          </div>
        </div>

        <button
          style={S.btn}
          onClick={() =>
            router.push(
              "/washer/orders",
            )
          }
        >
          Back
        </button>
      </header>

      {loading ? (
        <div style={S.card}>
          Loading...
        </div>
      ) : err ? (
        <div style={S.error}>
          {err}
        </div>
      ) : order ? (
        <div style={S.grid}>
          {/* HERO */}

          <section style={S.heroCard}>
            <div style={S.heroTop}>
              <div>
                <div
                  style={S.heroTitle}
                >
                  {order.status}
                </div>

                <div
                  style={S.heroSub}
                >
                  Live washer
                  tracking
                </div>
              </div>

              <div
                style={S.statusPill}
              >
                {order.status}
              </div>
            </div>

            {/* ETA */}

            <div style={S.etaBox}>
              <div
                style={
                  S.etaTitle
                }
              >
                Live Google ETA
              </div>

              {eta?.mode ===
              "LIVE_ETA" ? (
                <>
                  <div
                    style={
                      S.bigEta
                    }
                  >
                    🚗 ETA:{" "}
                    {eta.durationText ??
                      "Calculating..."}
                  </div>

                  <div
                    style={
                      S.smallInfo
                    }
                  >
                    📍 Distance:{" "}
                    {eta.distanceText ??
                      "Unknown"}
                  </div>

                  <div
                    style={
                      S.smallInfo
                    }
                  >
                    🛰 Last GPS
                    update:{" "}
                    {eta.lastSeenAt
                      ? new Date(
                          eta.lastSeenAt,
                        ).toLocaleTimeString()
                      : "—"}
                  </div>
                </>
              ) : eta?.mode ===
                "WASHER_OFFLINE" ? (
                <div
                  style={
                    S.warning
                  }
                >
                  Washer GPS
                  offline
                </div>
              ) : eta?.mode ===
                "NO_ASSIGNED_WASHER" ? (
                <div
                  style={
                    S.smallInfo
                  }
                >
                  Waiting for
                  washer
                  assignment...
                </div>
              ) : eta?.mode ===
                "NO_CUSTOMER_LOCATION" ? (
                <div
                  style={
                    S.warning
                  }
                >
                  Customer
                  location
                  unavailable
                </div>
              ) : (
                <div
                  style={
                    S.smallInfo
                  }
                >
                  Calculating
                  live ETA...
                </div>
              )}
            </div>

            {/* MAP */}

            <div
              style={{
                marginTop: 18,
              }}
            >
              {mapCustomer ? (
                <LiveOrderMap
                  customer={
                    mapCustomer
                  }
                  washers={
                    mapWashers
                  }
                  assignedWasherId={
                    live?.assignedWasherId ??
                    null
                  }
                  mode={
                    mapMode as any
                  }
                />
              ) : (
                <div
                  style={
                    S.noMap
                  }
                >
                  No customer
                  location found
                </div>
              )}
            </div>
          </section>

          {/* INFO */}

          <section style={S.card}>
            <div style={S.row}>
              <b>Address</b>

              <span>
                {order.address}
              </span>
            </div>

            <div style={S.row}>
              <b>Washer ID</b>

              <span>
                {order.washerId ??
                  "—"}
              </span>
            </div>

            <div style={S.row}>
              <b>Scheduled</b>

              <span>
                {new Date(
                  order.scheduledAt,
                ).toLocaleString()}
              </span>
            </div>

            <div style={S.row}>
              <b>Created</b>

              <span>
                {new Date(
                  order.createdAt,
                ).toLocaleString()}
              </span>
            </div>

            <div style={S.row}>
              <b>Updated</b>

              <span>
                {new Date(
                  order.updatedAt,
                ).toLocaleString()}
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

const S: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",

    background: "#0b0f19",

    color: "#fff",

    padding: 16,

    fontFamily:
      "system-ui",
  },

  header: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "flex-start",

    gap: 12,

    flexWrap: "wrap",

    marginBottom: 16,
  },

  badge: {
    display: "inline-flex",

    padding: "6px 10px",

    borderRadius: 999,

    background:
      "rgba(255,255,255,0.10)",

    fontWeight: 900,

    fontSize: 12,
  },

  title: {
    margin: 0,

    marginTop: 10,

    fontSize: 30,

    fontWeight: 950,
  },

  sub: {
    marginTop: 6,

    opacity: 0.85,
  },

  btn: {
    padding: "12px 14px",

    borderRadius: 14,

    border: "none",

    background:
      "rgba(255,255,255,0.12)",

    color: "#fff",

    fontWeight: 900,

    cursor: "pointer",
  },

  grid: {
    display: "grid",

    gap: 14,
  },

  heroCard: {
    background:
      "rgba(255,255,255,0.06)",

    border:
      "1px solid rgba(255,255,255,0.12)",

    borderRadius: 18,

    padding: 16,
  },

  heroTop: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "flex-start",

    gap: 12,

    flexWrap: "wrap",
  },

  heroTitle: {
    fontSize: 24,

    fontWeight: 950,
  },

  heroSub: {
    marginTop: 6,

    opacity: 0.8,
  },

  statusPill: {
    padding: "10px 12px",

    borderRadius: 999,

    background:
      "rgba(60,255,177,0.14)",

    border:
      "1px solid rgba(60,255,177,0.24)",

    fontWeight: 950,
  },

  etaBox: {
    marginTop: 18,

    padding: 16,

    borderRadius: 18,

    background:
      "rgba(60,255,177,0.08)",

    border:
      "1px solid rgba(60,255,177,0.18)",
  },

  etaTitle: {
    fontWeight: 950,

    marginBottom: 12,

    fontSize: 16,
  },

  bigEta: {
    fontSize: 24,

    fontWeight: 950,

    color: "#3cffb1",
  },

  smallInfo: {
    marginTop: 8,

    opacity: 0.9,
  },

  warning: {
    color: "#fca5a5",

    fontWeight: 900,
  },

  card: {
    background:
      "rgba(255,255,255,0.06)",

    border:
      "1px solid rgba(255,255,255,0.12)",

    borderRadius: 18,

    padding: 16,
  },

  row: {
    display: "flex",

    justifyContent:
      "space-between",

    gap: 12,

    padding: "12px 0",

    borderBottom:
      "1px solid rgba(255,255,255,0.08)",
  },

  error: {
    padding: 16,

    borderRadius: 16,

    background:
      "rgba(255,80,80,0.12)",

    border:
      "1px solid rgba(255,80,80,0.24)",
  },

  noMap: {
    padding: 20,

    borderRadius: 16,

    textAlign: "center",

    background:
      "rgba(255,255,255,0.06)",
  },
};