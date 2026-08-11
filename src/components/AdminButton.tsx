"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type MeResponse = {
  id: number;
  email?: string;
  role?: string;
};

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

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

type CustomerOrder = {
  id: number;
  status: OrderStatus;
  paymentMode?: "CREDIT" | "DIRECT" | "CASH" | null;
  paymentStatus?: PaymentStatus;
  isPaid?: boolean;
  washerId?: number | null;
  createdAt: string;
};

export default function AdminButton() {
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openingOrder, setOpeningOrder] = useState(false);

 useEffect(() => {
  checkUserAndOrders();

  const interval = setInterval(() => {
    checkUserAndOrders();
  }, 5000); // every 5 sec

  return () => clearInterval(interval);
}, []);

  async function checkUserAndOrders() {
    try {
      const { data: me } = await api.get<MeResponse>("/auth/me");
      setRole(me?.role || "USER");

      const normalizedRole = String(me?.role || "").toUpperCase();

      if (normalizedRole === "CUSTOMER" || normalizedRole === "USER") {
        try {
          const { data } = await api.get<CustomerOrder[]>("/orders/my");
          setOrders(Array.isArray(data) ? data : []);
        } catch {
          setOrders([]);
        }
      }
    } catch {
      setRole(null);
    } finally {
      setLoading(false);
    }
  }

  const activeOrder = useMemo(() => {
    const unfinished = orders.filter(
      (o) => o.status !== "DONE" && o.status !== "CANCELED",
    );

    return [...unfinished].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [orders]);

  function getOrderButton(order: CustomerOrder) {
    const needsPayment =
      order.paymentMode === "DIRECT" &&
      order.paymentStatus !== "PAID" &&
      order.isPaid !== true;

    if (needsPayment) {
      return {
        label: `💳 Finish Payment #${order.id}`,
        route: `/customer/pay/order/${order.id}`,
        style: S.paymentBtn,
      };
    }

    if (order.status === "REQUESTED") {
      return {
        label: `⏳ Waiting for Washer #${order.id}`,
        route: `/orders/${order.id}/waiting`,
        style: S.waitingBtn,
      };
    }

    if (order.status === "ACCEPTED") {
      return {
        label: `✅ Washer Accepted #${order.id}`,
        route: `/orders/${order.id}/waiting`,
        style: S.activeBtn,
      };
    }

    if (
      order.status === "ON_THE_WAY" ||
      order.status === "GOING_TO_LAUNDRY" ||
      order.status === "WASHING" ||
      order.status === "RETURNING_TO_CUSTOMER"
    ) {
      return {
        label: `🚗 Track Order #${order.id}`,
        route: `/orders/${order.id}/waiting`,
        style: S.activeBtn,
      };
    }

    if (order.status === "CANCEL_REQUESTED") {
      return {
        label: `⚠️ Cancel Requested #${order.id}`,
        route: `/orders/${order.id}/waiting`,
        style: S.warningBtn,
      };
    }

    return {
      label: `📦 My Order #${order.id}`,
      route: `/orders/${order.id}/waiting`,
      style: S.customerBtn,
    };
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);

      try {
        await api.post("/auth/logout");
      } catch {}

      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");

      router.push("/auth");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  async function openActiveOrder() {
    if (!activeOrder) {
      alert("No active order found.");
      return;
    }

    try {
      setOpeningOrder(true);
      const info = getOrderButton(activeOrder);
      router.push(info.route);
    } finally {
      setOpeningOrder(false);
    }
  }

  if (loading) return null;
  if (!role) return null;

  const normalizedRole = role.toUpperCase();
  const isAdmin = normalizedRole === "ADMIN";
  const isCustomer = normalizedRole === "CUSTOMER" || normalizedRole === "USER";

  const orderButton = activeOrder ? getOrderButton(activeOrder) : null;

  return (
    <div style={S.wrap}>
      {isAdmin ? (
        <button onClick={() => router.push("/admin")} style={S.adminBtn}>
          ⚙️ Admin
        </button>
      ) : null}

      {isCustomer && orderButton ? (
        <button
          onClick={openActiveOrder}
          style={orderButton.style}
          disabled={openingOrder}
        >
          {openingOrder ? "Opening..." : orderButton.label}
        </button>
      ) : null}

      <button onClick={handleLogout} style={S.logoutBtn} disabled={loggingOut}>
        {loggingOut ? "Logging out..." : "↩ Log Out"}
      </button>
    </div>
  );
}

const baseBtn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "none",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "var(--shadow)",
};

const S: Record<string, React.CSSProperties> = {
  wrap: {
    position: "fixed",
    left: 18,
    bottom: 18,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    zIndex: 2000,
  },
  adminBtn: {
    ...baseBtn,
    background: "var(--ink)",
  },
  customerBtn: {
    ...baseBtn,
    background: "var(--accent)",
  },
  paymentBtn: {
    ...baseBtn,
    background: "#0b6e7a",
  },
  waitingBtn: {
    ...baseBtn,
    background: "#c45c26",
  },
  activeBtn: {
    ...baseBtn,
    background: "var(--accent)",
  },
  warningBtn: {
    ...baseBtn,
    background: "#c45c26",
  },
  logoutBtn: {
    ...baseBtn,
    background: "var(--danger)",
  },
};