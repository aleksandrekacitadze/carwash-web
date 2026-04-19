"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  washerId: number | null;
  status: OrderStatus;
  createdAt: string;
};

type MeResponse = {
  id: number;
  role?: string;
};

export default function AutoReviewRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    if (!pathname) return;

    if (
      pathname.startsWith("/orders/") ||
      pathname.startsWith("/washer") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/auth")
    ) {
      return;
    }

    const skippedReviewOrderId =
      typeof window !== "undefined"
        ? localStorage.getItem("skippedReviewOrderId")
        : null;

    checkForPendingReview(skippedReviewOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function checkForPendingReview(skippedReviewOrderId: string | null) {
    try {
      const { data: me } = await api.get<MeResponse>("/auth/me");
      if (me?.role !== "CUSTOMER") return;

      const { data } = await api.get<Order[]>("/orders/my");
      const orders = Array.isArray(data) ? data : [];

      const latestDoneOrder = [...orders]
        .filter((o) => o.status === "DONE" && !!o.washerId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

      if (!latestDoneOrder) return;

      if (skippedReviewOrderId === String(latestDoneOrder.id)) {
        return;
      }

      const reviewStatus = await api.get(`/washers/reviews/order/${latestDoneOrder.id}/status`);

      if (reviewStatus.data?.reviewed) {
        if (
          typeof window !== "undefined" &&
          localStorage.getItem("skippedReviewOrderId") === String(latestDoneOrder.id)
        ) {
          localStorage.removeItem("skippedReviewOrderId");
        }
        return;
      }

      router.replace(`/orders/${latestDoneOrder.id}/review`);
    } catch {
      // silent
    }
  }

  return null;
}