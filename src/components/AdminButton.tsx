"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type MeResponse = {
  id: number;
  email?: string;
  role?: string;
};

type CustomerOrder = {
  id: number;
  createdAt: string;
};

export default function AdminButton() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openingOrder, setOpeningOrder] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data } = await api.get<MeResponse>("/auth/me");
      setRole(data?.role || "USER");
    } catch {
      setRole(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);

      try {
        await api.post("/auth/logout");
      } catch {
        // ignore if route does not exist
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
      }

      router.push("/auth");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleCustomerOrders() {
    try {
      setOpeningOrder(true);

      const { data } = await api.get<CustomerOrder[]>("/orders/my");

      if (!Array.isArray(data) || data.length === 0) {
        alert("No customer orders found yet.");
        return;
      }

      const latestOrder = [...data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      router.push(`/orders/${latestOrder.id}/waiting`);
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to open latest order."
      );
    } finally {
      setOpeningOrder(false);
    }
  }

  if (loading) return null;
  if (!role) return null;

  const isAdmin = role === "ADMIN";
  const isCustomer = role === "CUSTOMER";

  return (
    <div style={S.wrap}>
      {isAdmin ? (
        <button onClick={() => router.push("/admin")} style={S.adminBtn}>
          ⚙️ Admin
        </button>
      ) : null}

      {isCustomer ? (
        <button
          onClick={handleCustomerOrders}
          style={S.customerBtn}
          disabled={openingOrder}
        >
          {openingOrder ? "Opening..." : "📦 My Latest Order"}
        </button>
      ) : null}

      <button onClick={handleLogout} style={S.logoutBtn} disabled={loggingOut}>
        {loggingOut ? "Logging out..." : "↩ Log Out"}
      </button>
    </div>
  );
}

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
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "#111827",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
  },
  customerBtn: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "#1d4ed8",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
  },
  logoutBtn: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "#7f1d1d",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
  },
};