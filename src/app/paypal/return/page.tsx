"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function PaypalReturnPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token"); // PayPal usually returns ?token=ORDER_ID
  const [msg, setMsg] = useState("Capturing payment...");

  useEffect(() => {
    async function run() {
      if (!token) {
        setMsg("Missing PayPal token.");
        return;
      }
      try {
        await api.post(`/payments/paypal/capture/${token}`);
        setMsg("✅ Payment captured successfully!");
        setTimeout(() => router.push("/orders/my"), 1200);
      } catch (e: any) {
        setMsg(e?.response?.data?.message || e?.message || "Capture failed");
      }
    }
    run();
  }, [token, router]);

  return (
    <div style={{ padding: 24 }}>
      <h1>PayPal Result</h1>
      <p>{msg}</p>
    </div>
  );
}
