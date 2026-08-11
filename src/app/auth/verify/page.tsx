"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

type FirebaseExchangeResponse = {
  user: {
    id: number;
    phone: string;
    role: string;
    fullName: string | null;
  };
  accessToken: string;
  refreshToken: string;
};

function VerifyInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const phone = useMemo(() => sp.get("phone") || "", [sp]);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function verify() {
    setErr("");

    if (!window.confirmationResult) {
      setErr("OTP session missing. Go back and resend code.");
      return;
    }

    if (!code.trim()) {
      setErr("Enter the OTP code.");
      return;
    }

    try {
      setLoading(true);

      // 1) Confirm OTP with Firebase
      const cred = await window.confirmationResult.confirm(code.trim());

      // 2) Get Firebase ID token
      const firebaseIdToken = await cred.user.getIdToken();

      // 3) Exchange Firebase token -> YOUR backend JWT
      const { data } = await axios.post<FirebaseExchangeResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/firebase`,
        { idToken: firebaseIdToken }
      );

      // ✅ Save tokens exactly how your backend returns them
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("userId", String(data.user.id));

      // optional: cleanup
      window.confirmationResult = undefined;

      router.replace("/customer/dashboard");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Invalid code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.panel}>
        <div style={styles.brand}>Tempi</div>
        <h1 style={styles.title}>Enter your code</h1>
        <p style={styles.sub}>
          Sent to <b>{phone || "your phone"}</b>
        </p>

        <label style={styles.label}>6-digit code</label>
        <input
          style={styles.input}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
        />

        {err ? <p style={styles.error}>{err}</p> : null}

        <button style={styles.button} onClick={verify} disabled={loading}>
          {loading ? "Checking…" : "Verify & continue"}
        </button>

        <button
          style={styles.back}
          type="button"
          onClick={() => router.push("/auth")}
        >
          Use a different number
        </button>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20, color: "var(--ink-soft)" }}>Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },
  panel: {
    width: "100%",
    maxWidth: 420,
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
    lineHeight: 1,
  },
  title: {
    margin: "14px 0 0",
    fontSize: 22,
    fontWeight: 750,
    letterSpacing: "-0.02em",
  },
  sub: { marginTop: 8, color: "var(--ink-soft)", fontSize: 14 },
  label: {
    display: "block",
    marginTop: 22,
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 13,
    color: "var(--ink-soft)",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid var(--line)",
    background: "#fff",
    color: "var(--ink)",
    fontSize: 22,
    letterSpacing: "0.28em",
    textAlign: "center",
  },
  button: {
    width: "100%",
    marginTop: 18,
    padding: "15px 16px",
    borderRadius: 16,
    border: "none",
    cursor: "pointer",
    fontWeight: 750,
    fontSize: 16,
    background: "var(--accent)",
    color: "#fff",
  },
  back: {
    width: "100%",
    marginTop: 12,
    padding: "12px",
    border: "none",
    background: "transparent",
    color: "var(--ink-soft)",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: { marginTop: 12, color: "var(--danger)", fontSize: 14 },
};
