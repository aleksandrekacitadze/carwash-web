"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { auth, getFirebaseConfigError } from "@/lib/firebaseClient";
import { isPreviewEnabled } from "@/lib/preview";

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
  const configError = getFirebaseConfigError();
  const previewEnabled = isPreviewEnabled();

  useEffect(() => {
    if (configError) return;

    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "normal",
        });
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to initialize Firebase reCAPTCHA.");
    }
  }, [configError]);

  function enterPreview() {
    localStorage.setItem("token", "demo-preview");
    localStorage.setItem("role", "CUSTOMER");
    localStorage.setItem("userId", "0");
    router.replace("/customer/dashboard");
  }

  async function sendCode() {
    setErr("");

    if (configError) {
      setErr(configError);
      return;
    }

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
        window.recaptchaVerifier!,
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
      <div style={styles.panel}>
        <div style={styles.brand}>Tempi</div>
        <p style={styles.lead}>Sign in with your phone — we’ll text you a code.</p>

        {configError ? (
          <div style={styles.configBox}>
            <strong>Firebase setup needed</strong>
            <p style={styles.configText}>
              Create <code>carwash-web/.env.local</code> with your Firebase web
              keys, then restart <code>npm run dev</code>.
            </p>
          </div>
        ) : null}

        <label style={styles.label}>Phone number</label>
        <input
          style={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+9955xxxxxxx"
          inputMode="tel"
          autoComplete="tel"
          disabled={!!configError}
        />

        <div id="recaptcha-container" style={{ marginTop: 14 }} />

        {err ? <p style={styles.error}>{err}</p> : null}

        <button
          style={{
            ...styles.button,
            ...(configError ? styles.buttonDisabled : {}),
          }}
          onClick={sendCode}
          disabled={loading || !!configError}
        >
          {loading ? "Sending code…" : "Continue"}
        </button>

        {previewEnabled ? (
          <button style={styles.previewBtn} type="button" onClick={enterPreview}>
            Preview booking UI (no login)
          </button>
        ) : null}

        <p style={styles.note}>
          {configError
            ? "Add Firebase keys in .env.local, then restart the server."
            : "Takes about 10 seconds. No password needed."}
        </p>
      </div>
    </main>
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
    fontSize: 44,
    fontWeight: 600,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },
  lead: {
    margin: "10px 0 0",
    color: "var(--ink-soft)",
    lineHeight: 1.5,
    fontSize: 15,
  },
  configBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    background: "#fff4e8",
    border: "1px solid rgba(196,92,38,0.25)",
    color: "var(--warn)",
    fontSize: 14,
  },
  configText: {
    margin: "8px 0 0",
    lineHeight: 1.45,
    color: "var(--ink-soft)",
  },
  label: {
    display: "block",
    marginTop: 24,
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
    fontSize: 16,
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
  buttonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  previewBtn: {
    width: "100%",
    marginTop: 10,
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid var(--line)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    background: "#fff",
    color: "var(--ink)",
  },
  error: { marginTop: 12, color: "var(--danger)", fontSize: 14 },
  note: {
    marginTop: 14,
    marginBottom: 0,
    color: "var(--ink-soft)",
    fontSize: 13,
    textAlign: "center",
  },
};
