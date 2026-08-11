"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

function PaypalReturnInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token");
  const [msg, setMsg] = useState("Confirming your payment…");
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    async function run() {
      if (!token) {
        setMsg("Missing PayPal token.");
        setOk(false);
        return;
      }

      try {
        await api.post(`/payments/paypal/capture/${token}`);
        setMsg("Payment confirmed. Taking you to your orders…");
        setOk(true);
        setTimeout(() => router.push("/orders/my"), 1200);
      } catch (e: any) {
        setMsg(e?.response?.data?.message || e?.message || "Capture failed");
        setOk(false);
      }
    }

    run();
  }, [token, router]);

  return (
    <main style={S.main}>
      <div style={S.panel}>
        <div style={S.brand}>Tempi</div>
        <h1 style={S.title}>PayPal</h1>
        <p style={{ ...S.text, color: ok === false ? "var(--danger)" : "var(--ink-soft)" }}>
          {msg}
        </p>
        {ok === false ? (
          <button style={S.btn} type="button" onClick={() => router.push("/orders/my")}>
            Back to orders
          </button>
        ) : null}
      </div>
    </main>
  );
}

export default function PaypalReturnPage() {
  return (
    <Suspense
      fallback={
        <main style={S.main}>
          <div style={S.panel}>Loading PayPal result…</div>
        </main>
      }
    >
      <PaypalReturnInner />
    </Suspense>
  );
}

const S: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },
  panel: {
    width: "100%",
    maxWidth: 440,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 24,
    padding: 28,
    boxShadow: "var(--shadow)",
  },
  brand: {
    fontFamily: "var(--font-display)",
    fontSize: 36,
    fontWeight: 600,
    letterSpacing: "-0.04em",
  },
  title: {
    margin: "12px 0 0",
    fontSize: 22,
    fontWeight: 750,
  },
  text: {
    marginTop: 10,
    lineHeight: 1.5,
    fontSize: 15,
  },
  btn: {
    marginTop: 18,
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 750,
    cursor: "pointer",
  },
};
