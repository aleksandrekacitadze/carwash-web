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
      <div style={styles.card}>
        <h1 style={styles.title}>Verify</h1>
        <p style={styles.sub}>
          Sent to <b>{phone || "your phone"}</b>
        </p>

        <label style={styles.label}>OTP Code</label>
        <input
          style={styles.input}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          placeholder="123456"
        />

        {err ? <p style={styles.error}>{err}</p> : null}

        <button style={styles.button} onClick={verify} disabled={loading}>
          {loading ? "Verifying..." : "Verify & continue"}
        </button>

        <p style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
          After success, JWT is saved in <b>localStorage["token"]</b>.
        </p>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <VerifyInner />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "#0b0f19",
    color: "#fff",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 20,
  },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  sub: { marginTop: 8, opacity: 0.85 },
  label: { display: "block", marginTop: 16, marginBottom: 8, fontWeight: 600 },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.2)",
    color: "#fff",
    fontSize: 18,
    letterSpacing: 2,
  },
  button: {
    width: "100%",
    marginTop: 16,
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  },
  error: { marginTop: 12, color: "#ffb4b4" },
};
