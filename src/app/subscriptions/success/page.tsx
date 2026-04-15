"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type CaptureResp =
  | { ok: true; alreadyCaptured?: boolean; capture?: any; subscription?: any; wallet?: any }
  | { ok: false; message: string };

type WalletMe = {
  credits: number;
  updatedAt?: string;
};

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // Support multiple param names (because PayPal integrations differ)
  const providerOrderId = useMemo(() => {
    return (
      sp.get("providerOrderId") || // ✅ our recommended param
      sp.get("token") || // PayPal often returns token=
      sp.get("orderId") || // fallback
      ""
    );
  }, [sp]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"success" | "error" | "idle">("idle");
  const [message, setMessage] = useState<string>("");
  const [wallet, setWallet] = useState<WalletMe | null>(null);

  async function capture() {
    if (!providerOrderId) {
      setStatus("error");
      setMessage("Missing providerOrderId in URL.");
      setLoading(false);
      return;
    }

    try {
      // ✅ capture subscription payment + activate subscription + add credits (backend should do this)
      const cap = await api.post<CaptureResp>(
        `/subscriptions/paypal/capture/${providerOrderId}`
      );

      // if backend returns ok true -> success
      if ((cap.data as any)?.ok === false) {
        setStatus("error");
        setMessage((cap.data as any).message || "Capture failed.");
      } else {
        setStatus("success");
        setMessage(
          (cap.data as any)?.alreadyCaptured
            ? "Payment already captured ✅"
            : "Payment captured ✅ Credits activated ✅"
        );
      }

      // ✅ refresh wallet
      try {
        const w = await api.get<WalletMe>("/wallet/me");
        setWallet(w.data);
      } catch {
        // wallet endpoint might not exist yet
        setWallet(null);
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.response?.data?.message || e?.message || "Capture failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    capture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerOrderId]);

  // auto redirect after success
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => {
      router.replace("/subscriptions");
    }, 3500);
    return () => clearTimeout(t);
  }, [status, router]);

  return (
    <main style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>Subscription Result</h1>

        <div style={S.sub}>
          OrderId: <b style={{ wordBreak: "break-all" }}>{providerOrderId || "—"}</b>
        </div>

        {loading ? (
          <div style={S.box}>
            <div style={S.big}>Processing…</div>
            <div style={S.small}>Capturing PayPal payment and activating credits.</div>
          </div>
        ) : status === "success" ? (
          <div style={{ ...S.box, ...S.ok }}>
            <div style={S.big}>✅ Success</div>
            <div style={S.small}>{message}</div>

            {wallet ? (
              <div style={{ marginTop: 12, fontWeight: 900 }}>
                Your credits: <span style={S.credits}>{wallet.credits}</span>
              </div>
            ) : (
              <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
                Wallet info not available (no /wallet/me yet).
              </div>
            )}

            <div style={{ marginTop: 12, opacity: 0.85, fontSize: 12 }}>
              Redirecting back to subscriptions…
            </div>
          </div>
        ) : (
          <div style={{ ...S.box, ...S.err }}>
            <div style={S.big}>❌ Error</div>
            <div style={S.small}>{message || "Something went wrong."}</div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button style={S.btn} onClick={() => capture()}>
                Retry
              </button>
              <button style={S.btnGhost} onClick={() => router.replace("/subscriptions")}>
                Back to subscriptions
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b0f19",
    color: "#fff",
    padding: 24,
    display: "grid",
    placeItems: "center",
    fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
  },
  card: {
    width: "min(720px, 100%)",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
  },
  title: { margin: 0, fontSize: 26, fontWeight: 950 },
  sub: { marginTop: 8, opacity: 0.85, fontSize: 13 },

  box: {
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
  },
  ok: {
    border: "1px solid rgba(60,255,177,0.25)",
    background: "rgba(60,255,177,0.10)",
  },
  err: {
    border: "1px solid rgba(255,100,100,0.30)",
    background: "rgba(255,100,100,0.10)",
  },
  big: { fontSize: 18, fontWeight: 950 },
  small: { marginTop: 8, opacity: 0.9, fontSize: 13, lineHeight: 1.4 },

  credits: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.14)",
  },

  btn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },
  btnGhost: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    opacity: 0.9,
  },
};
