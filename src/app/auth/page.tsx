"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+995");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "normal",
      });
    }
  }, []);

  async function sendCode() {
    setErr("");
    const p = phone.trim();

    if (p.length < 8) {
      setErr("Enter a valid phone number.");
      return;
    }

    try {
      setLoading(true);

      const result = await signInWithPhoneNumber(
        auth,
        p,
        window.recaptchaVerifier!
      );

      window.confirmationResult = result;

      router.push(`/auth/verify?phone=${encodeURIComponent(p)}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sign in</h1>

        <label style={styles.label}>Phone</label>
        <input
          style={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+9955xxxxxxx"
        />

        <div id="recaptcha-container" style={{ marginTop: 12 }} />

        {err ? <p style={styles.error}>{err}</p> : null}

        <button style={styles.button} onClick={sendCode} disabled={loading}>
          {loading ? "Sending..." : "Send code"}
        </button>
      </div>
    </main>
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
  label: { display: "block", marginTop: 16, marginBottom: 8, fontWeight: 600 },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.2)",
    color: "#fff",
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
