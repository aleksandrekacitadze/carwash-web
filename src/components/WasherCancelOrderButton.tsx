"use client";

import { useState } from "react";
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

  const canCancel =
    status !== "DONE" &&
    status !== "CANCELED" &&
    status !== "CANCEL_REQUESTED";

  async function cancelOrder() {
    try {
      const reason =
        window.prompt(
          "Enter cancel reason",
        );

      if (!reason?.trim()) {
        return;
      }

      setLoading(true);

      const paid =
        isPaid === true ||
        paymentStatus === "PAID";

      const needsAdmin =
        paid ||
        paymentMode === "CASH" ||
        paymentMode === "CREDIT";

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
        e?.response?.data?.message ||
          e?.message ||
          "Failed to cancel order",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!canCancel) {
    return null;
  }

  return (
    <button
      onClick={cancelOrder}
      disabled={loading}
      style={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: 16,
        border: "none",
        background: "#ff6363",
        color: "#fff",
        fontWeight: 900,
        fontSize: 15,
        cursor: loading
          ? "not-allowed"
          : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? "Processing..."
        : "Cancel Order"}
    </button>
  );
}