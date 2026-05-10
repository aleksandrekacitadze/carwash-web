"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { api } from "@/lib/api";

type Props = {
  orderId: number;
  status: string;
  paymentMode?: string | null;
  paymentStatus?: string | null;
  isPaid?: boolean;
  onCanceled?: () => void;
};

export default function WasherCancelOrderButton({
  orderId,
  status,
  paymentMode,
  paymentStatus,
  isPaid,
  onCanceled,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const [gpsState, setGpsState] =
    useState<
      | "idle"
      | "tracking"
      | "requesting"
      | "error"
      | "denied"
      | "unsupported"
    >("idle");

  const [gpsError, setGpsError] =
    useState("");

  const watchIdRef =
    useRef<number | null>(
      null,
    );

  // -----------------------------------------
  // CAN CANCEL
  // -----------------------------------------

  const canCancel =
    status !== "DONE" &&
    status !== "CANCELED" &&
    status !==
      "CANCEL_REQUESTED";

  // -----------------------------------------
  // LIVE GPS TRACKING
  // -----------------------------------------

  useEffect(() => {
    const shouldTrack =
      status === "ACCEPTED" ||
      status ===
        "ON_THE_WAY" ||
      status ===
        "GOING_TO_LAUNDRY" ||
      status ===
        "WASHING" ||
      status ===
        "RETURNING_TO_CUSTOMER";

    if (!shouldTrack) {
      setGpsState("idle");

      return;
    }

    if (
      !navigator.geolocation
    ) {
      setGpsState(
        "unsupported",
      );

      setGpsError(
        "Geolocation not supported",
      );

      return;
    }

    setGpsState(
      "requesting",
    );

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        async (pos) => {
          try {
            const lat =
              pos.coords
                .latitude;

            const lng =
              pos.coords
                .longitude;

            const accuracy =
              pos.coords
                .accuracy;

            const speed =
              pos.coords
                .speed;

            const heading =
              pos.coords
                .heading;

            await api.post(
              "/users/me/location",
              {
                lat,
                lng,
                accuracy,
                speed,
                heading,
                orderId,
              },
            );

            setGpsState(
              "tracking",
            );

            setGpsError("");
          } catch (e: any) {
            console.error(
              e,
            );

            setGpsState(
              "error",
            );

            setGpsError(
              e?.response?.data
                ?.message ||
                e?.message ||
                "Failed to send live location",
            );
          }
        },

        (err) => {
          console.error(
            err,
          );

          if (
            err.code ===
            err.PERMISSION_DENIED
          ) {
            setGpsState(
              "denied",
            );

            setGpsError(
              "Location permission denied",
            );
          } else {
            setGpsState(
              "error",
            );

            setGpsError(
              err.message ||
                "GPS error",
            );
          }
        },

        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 10000,
        },
      );

    return () => {
      if (
        watchIdRef.current !=
        null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current,
        );
      }
    };
  }, [status, orderId]);

  // -----------------------------------------
  // CANCEL ORDER
  // -----------------------------------------

  async function cancelOrder() {
    try {
      const reason =
        window.prompt(
          "Enter cancel reason",
        );

      if (
        !reason?.trim()
      ) {
        return;
      }

      setLoading(true);

      const paid =
        isPaid === true ||
        paymentStatus ===
          "PAID";

      const needsAdmin =
        paid ||
        paymentMode ===
          "CASH" ||
        paymentMode ===
          "CREDIT";

      await api.patch(
        `/orders/${orderId}/washer-cancel`,
        {
          reason,
        },
      );

      if (needsAdmin) {
        alert(
          "Cancel request sent to admin.",
        );
      } else {
        alert(
          "Order canceled successfully.",
        );
      }

      onCanceled?.();
    } catch (e: any) {
      alert(
        e?.response?.data
          ?.message ||
          e?.message ||
          "Failed to cancel order",
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // GPS STATUS UI
  // -----------------------------------------

  function gpsText() {
    switch (gpsState) {
      case "tracking":
        return "🛰 Live GPS tracking active";

      case "requesting":
        return "📡 Requesting GPS permission";

      case "denied":
        return "❌ GPS permission denied";

      case "unsupported":
        return "⚠️ GPS unsupported";

      case "error":
        return (
          gpsError ||
          "GPS error"
        );

      default:
        return "GPS idle";
    }
  }

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      {/* GPS STATUS */}

      <div
        style={{
          padding: "10px 12px",
          borderRadius: 14,
          background:
            "rgba(255,255,255,0.06)",
          border:
            "1px solid rgba(255,255,255,0.10)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {gpsText()}
      </div>

      {/* CANCEL BUTTON */}

      {canCancel ? (
        <button
          onClick={
            cancelOrder
          }
          disabled={loading}
          style={{
            width: "100%",
            padding:
              "14px 16px",
            borderRadius: 16,
            border: "none",
            background:
              "#ff6363",
            color: "#fff",
            fontWeight: 900,
            fontSize: 15,
            cursor: loading
              ? "not-allowed"
              : "pointer",
            opacity: loading
              ? 0.7
              : 1,
          }}
        >
          {loading
            ? "Processing..."
            : "Cancel Order"}
        </button>
      ) : null}
    </div>
  );
}