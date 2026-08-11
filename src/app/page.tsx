"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerDashboardPage from "./customer/dashboard/page";
import AutoReviewRedirect from "@/components/AutoReviewRedirect";

function getTokenSafe() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = getTokenSafe();
    setHasToken(!!token);
    setReady(true);

    if (!token) {
      router.replace("/auth");
    }
  }, [router]);

  if (!ready) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--ink-soft)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>Tempi</div>
      </main>
    );
  }

  if (!hasToken) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--ink-soft)",
        }}
      >
        <div>Taking you to sign in…</div>
      </main>
    );
  }

  return (
    <>
      <AutoReviewRedirect />
      <CustomerDashboardPage />
    </>
  );
}