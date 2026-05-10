"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { api } from "@/lib/api";

export default function PaymentSuccessPage() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const orderId =
    searchParams.get(
      "orderId",
    );

  const [status, setStatus] =
    useState(
      "Verifying payment...",
    );

  const [error, setError] =
    useState("");

  // -----------------------------------
  // VERIFY LOOP
  // -----------------------------------

  useEffect(() => {
    if (!orderId) {
      setError(
        "Missing orderId",
      );

      return;
    }

    let tries = 0;

    const interval =
      setInterval(async () => {
        tries++;

        try {
          const { data } =
            await api.get(
              `/payments/check/order/${orderId}`,
            );

          // -----------------------------
          // VERIFIED
          // -----------------------------

          if (
            data?.paid ===
              true ||
            data?.status ===
              "CAPTURED"
          ) {
            clearInterval(
              interval,
            );

            setStatus(
              "Payment verified successfully. Redirecting...",
            );

            setTimeout(() => {
              router.replace(
                `/orders/${orderId}/waiting`,
              );
            }, 1500);

            return;
          }

          // -----------------------------
          // STILL WAITING
          // -----------------------------

          setStatus(
            `Waiting for payment confirmation... (${tries})`,
          );

          // -----------------------------
          // TIMEOUT
          // -----------------------------

          if (tries >= 24) {
            clearInterval(
              interval,
            );

            setError(
              "Payment verification timeout. Please refresh.",
            );
          }
        } catch (e: any) {
          console.error(e);

          setError(
            e?.response?.data
              ?.message ||
              e?.message ||
              "Verification failed",
          );
        }
      }, 5000);

    return () =>
      clearInterval(
        interval,
      );
  }, [orderId, router]);

  // -----------------------------------
  // UI
  // -----------------------------------

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.icon}>
          ✅
        </div>

        <h1 style={S.title}>
          Payment Success
        </h1>

        {!error ? (
          <div style={S.status}>
            {status}
          </div>
        ) : (
          <div style={S.error}>
            {error}
          </div>
        )}

        <div style={S.small}>
          Order ID:{" "}
          <b>
            {orderId ??
              "—"}
          </b>
        </div>

        <button
          style={S.button}
          onClick={() => {
            if (orderId) {
              router.push(
                `/orders/${orderId}/waiting`,
              );
            }
          }}
        >
          Open Order
        </button>
      </div>
    </div>
  );
}

const S: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b0f19",
    padding: 20,
    color: "#fff",
    fontFamily: "system-ui",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.10)",
    backdropFilter:
      "blur(14px)",
    textAlign: "center",
  },

  icon: {
    fontSize: 54,
  },

  title: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 30,
    fontWeight: 950,
  },

  status: {
    marginTop: 12,
    opacity: 0.9,
    lineHeight: 1.5,
  },

  error: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background:
      "rgba(255,80,80,0.12)",
    border:
      "1px solid rgba(255,80,80,0.24)",
    color: "#fca5a5",
    fontWeight: 700,
  },

  small: {
    marginTop: 18,
    fontSize: 13,
    opacity: 0.75,
  },

  button: {
    marginTop: 22,
    width: "100%",
    border: "none",
    borderRadius: 16,
    padding: "14px 18px",
    background: "#3cffb1",
    color: "#062112",
    fontWeight: 950,
    fontSize: 16,
    cursor: "pointer",
  },
};