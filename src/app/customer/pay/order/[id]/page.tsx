"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { api } from "@/lib/api";

type Order = {
  id: number;
  address: string;
  status: string;
  isPaid?: boolean;
  paymentStatus?: string;
  pricePaid?: string | null;
  washerId?: number | null;
};

type Me = {
  id: number;
  email?: string;
  role?: string;
};

export default function PayOrderPage() {
  const router = useRouter();

  const params = useParams();

  const orderId = useMemo(
    () => Number(params?.id || 0),
    [params],
  );

  const [me, setMe] =
    useState<Me | null>(null);

  const [order, setOrder] =
    useState<Order | null>(null);

  const [amount, setAmount] =
    useState("0");

  const [err, setErr] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [payLoading, setPayLoading] =
    useState(false);

  const [acceptedNotified, setAcceptedNotified] =
    useState(false);

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const canPay =
    !!me?.id &&
    order?.status === "ACCEPTED" &&
    order?.isPaid !== true &&
    order?.paymentStatus !== "PAID";

  // --------------------------------------------------
  // EFFECT
  // --------------------------------------------------

  useEffect(() => {
    audioRef.current = new Audio(
      "/sounds/order-accepted.mp3",
    );

    init();

    const interval = setInterval(() => {
      loadOrder(false);
    }, 3000);

    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, acceptedNotified]);

  // --------------------------------------------------
  // INIT
  // --------------------------------------------------

  async function init() {
    await loadMe();
    await loadOrder();
  }

  // --------------------------------------------------
  // LOAD USER
  // --------------------------------------------------

  async function loadMe() {
    try {
      const { data } =
        await api.get<Me>("/auth/me");

      setMe(data);
    } catch {
      setErr(
        "User not found. Please login again.",
      );

      router.push("/auth");
    }
  }

  // --------------------------------------------------
  // TOAST
  // --------------------------------------------------

  function showToast(message: string) {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 4000);
  }

  // --------------------------------------------------
  // VIBRATION
  // --------------------------------------------------

  function vibrateAccepted() {
    if ("vibrate" in navigator) {
      navigator.vibrate([250, 120, 250]);
    }
  }

  // --------------------------------------------------
  // AUDIO
  // --------------------------------------------------

  async function unlockAudio() {
    try {
      await audioRef.current?.play();

      await audioRef.current?.pause();

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    } catch {}
  }

  // --------------------------------------------------
  // RECALCULATE LIVE PRICE
  // --------------------------------------------------

  async function refreshAcceptedPrice() {
    if (!orderId) return;

    try {
      const { data } = await api.post<{
        totalPriceGel: number;
      }>("/orders/recalculate-price", {
        orderId,
      });

      if (
        data?.totalPriceGel != null
      ) {
        setAmount(
          String(data.totalPriceGel),
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --------------------------------------------------
  // LOAD ORDER
  // --------------------------------------------------

  async function loadOrder(
    showLoading = true,
  ) {
    if (!orderId) return;

    try {
      if (showLoading) {
        setLoading(true);
      }

      setErr("");

      const { data } =
        await api.get<Order>(
          `/orders/${orderId}`,
        );

      setOrder(data);

      // initial amount
      if (data.pricePaid) {
        setAmount(
          String(data.pricePaid),
        );
      }

      // ----------------------------------------------
      // ACCEPTED
      // ----------------------------------------------

      if (
        data.status === "ACCEPTED" &&
        !acceptedNotified
      ) {
        setAcceptedNotified(true);

        showToast(
          "✅ Washer accepted your order. Updating final live price...",
        );

        vibrateAccepted();

        try {
          await audioRef.current?.play();
        } catch {}

        // ✅ LIVE RECALCULATION
        await refreshAcceptedPrice();

        showToast(
          "✅ Final live price updated.",
        );
      }

      // ----------------------------------------------
      // PAID
      // ----------------------------------------------

      if (
        data.isPaid ||
        data.paymentStatus === "PAID"
      ) {
        router.push(
          `/orders/${orderId}/waiting`,
        );
      }
    } catch (e: any) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load order.",
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  // --------------------------------------------------
  // PAYMENT
  // --------------------------------------------------

  async function payWithKeepz() {
    try {
      await unlockAudio();

      setPayLoading(true);

      setErr("");

      if (!me?.id) {
        throw new Error(
          "User not found. Please login again.",
        );
      }

      if (!order) {
        throw new Error(
          "Order not loaded.",
        );
      }

      if (
        order.status !== "ACCEPTED"
      ) {
        throw new Error(
          "Wait until washer accepts your order.",
        );
      }

      const finalAmount =
        Number(amount);

      if (
        !Number.isFinite(finalAmount) ||
        finalAmount <= 0
      ) {
        throw new Error(
          "Invalid payment amount.",
        );
      }

      const { data } =
        await api.post<{
          paymentId: number;
          providerOrderId: string;
          checkoutUrl: string;
        }>("/payments/create", {
          kind: "ORDER",
          orderId: order.id,
          provider: "KEEPZ",
          amount: finalAmount,
          currency: "GEL",
        });

      if (!data.checkoutUrl) {
        throw new Error(
          "Payment checkout URL missing.",
        );
      }

      window.location.href =
        data.checkoutUrl;
    } catch (e: any) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to create payment.",
      );

      setPayLoading(false);
    }
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div
      style={S.page}
      onClick={unlockAudio}
    >
      <header style={S.header}>
        <div>
          <h1 style={S.title}>
            Pay for Order #{orderId}
          </h1>

          <div style={S.sub}>
            Payment unlocks after washer
            accepts your order.
          </div>

          {me?.id ? (
            <div style={S.small}>
              Logged user ID: {me.id}
            </div>
          ) : null}
        </div>

        <button
          style={S.btn}
          onClick={() =>
            router.push("/orders/my")
          }
        >
          My Orders
        </button>
      </header>

      {err ? (
        <div style={S.error}>
          ⚠️ {err}
        </div>
      ) : null}

      <div style={S.card}>
        {loading ? (
          <div>Loading order...</div>
        ) : order ? (
          <>
            <div style={S.statusBox}>
              <div>
                <b>Status:</b>{" "}
                {order.status}
              </div>

              <div>
                <b>Washer:</b>{" "}
                {order.washerId ??
                  "Waiting..."}
              </div>

              <div>
                <b>Payment:</b>{" "}
                {order.paymentStatus ??
                  "PENDING"}
              </div>

              <div>
                <b>Address:</b>{" "}
                {order.address}
              </div>
            </div>

            {order.status !==
            "ACCEPTED" ? (
              <div style={S.waitBox}>
                ⏳ Waiting for washer
                to accept your order...
                <div style={S.small}>
                  This page checks
                  automatically every
                  3 seconds.
                </div>
              </div>
            ) : (
              <div style={S.okBox}>
                ✅ Washer accepted
                your order. You can
                pay now.
              </div>
            )}

            <div
              style={{ marginTop: 14 }}
            >
              <div style={S.label}>
                Amount GEL
              </div>

              <input
                style={S.input}
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value,
                  )
                }
                disabled={
                  !canPay ||
                  payLoading
                }
              />
            </div>

            <button
              style={{
                ...S.payBtn,
                opacity:
                  !canPay ||
                  payLoading
                    ? 0.65
                    : 1,

                cursor:
                  !canPay ||
                  payLoading
                    ? "not-allowed"
                    : "pointer",
              }}
              disabled={
                !canPay ||
                payLoading
              }
              onClick={
                payWithKeepz
              }
            >
              {payLoading
                ? "Creating payment..."
                : "Pay with KEEPZ"}
            </button>

            <div style={S.small}>
              Backend gets userId
              from JWT token, not
              from frontend.
            </div>
          </>
        ) : (
          <div>Order not found.</div>
        )}
      </div>

      {toast ? (
        <div style={S.toast}>
          {toast}
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
    padding: 20,
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "system-ui",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 950,
  },

  sub: {
    marginTop: 6,
    opacity: 0.78,
  },

  btn: {
    background:
      "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    border: "none",
    cursor: "pointer",
  },

  card: {
    marginTop: 14,
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
    maxWidth: 560,
  },

  statusBox: {
    display: "grid",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    background:
      "rgba(0,0,0,0.22)",
    border:
      "1px solid rgba(255,255,255,0.10)",
  },

  waitBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background:
      "rgba(255,200,0,0.12)",
    border:
      "1px solid rgba(255,200,0,0.25)",
    fontWeight: 900,
  },

  okBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background:
      "rgba(60,255,177,0.14)",
    border:
      "1px solid rgba(60,255,177,0.25)",
    fontWeight: 900,
  },

  label: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.8,
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border:
      "1px solid rgba(255,255,255,0.14)",
    background:
      "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
  },

  payBtn: {
    marginTop: 14,
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: "#3cffb1",
    color: "#062112",
    fontWeight: 950,
    fontSize: 16,
  },

  small: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.75,
    lineHeight: 1.45,
  },

  error: {
    marginTop: 14,
    maxWidth: 560,
    padding: 12,
    borderRadius: 14,
    background:
      "rgba(255,99,99,0.12)",
    border:
      "1px solid rgba(255,99,99,0.24)",
  },

  toast: {
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform:
      "translateX(-50%)",

    padding: "12px 16px",

    borderRadius: 14,

    background: "#16a34a",

    color: "#fff",

    fontWeight: 900,

    boxShadow:
      "0 12px 30px rgba(0,0,0,0.35)",

    zIndex: 9999,

    maxWidth: "90vw",

    textAlign: "center",
  },
}; 