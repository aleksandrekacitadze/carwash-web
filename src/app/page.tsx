"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerDashboardPage from "./customer/dashboard/page";

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

  // ✅ Always render the SAME thing on server + first client paint
  if (!ready) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Loading…</div>
      </main>
    );
  }

  // After mount:
  if (!hasToken) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Redirecting…</div>
      </main>
    );
  }

  return <CustomerDashboardPage />;
}
