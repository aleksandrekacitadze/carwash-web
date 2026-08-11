"use client";

import { useRouter } from "next/navigation";

export default function PreviewBookedPage() {
  const router = useRouter();

  return (
    <main style={S.main}>
      <div style={S.panel}>
        <div style={S.brand}>Tempi</div>
        <h1 style={S.title}>You’re booked</h1>
        <p style={S.text}>
          Preview mode only — no real washer was contacted. When Firebase and the
          API are connected, this screen will track your wash live.
        </p>

        <div style={S.card}>
          <div style={S.row}>
            <span>Status</span>
            <strong>Looking for a washer</strong>
          </div>
          <div style={S.row}>
            <span>ETA</span>
            <strong>~25–40 min</strong>
          </div>
          <div style={S.row}>
            <span>Next</span>
            <strong>You’ll get a live map here</strong>
          </div>
        </div>

        <button style={S.primary} type="button" onClick={() => router.push("/customer/dashboard")}>
          Back to booking
        </button>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    paddingBottom: 40,
  },
  panel: {
    width: "100%",
    maxWidth: 460,
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
    fontSize: 26,
    fontWeight: 750,
    letterSpacing: "-0.02em",
  },
  text: {
    marginTop: 10,
    color: "var(--ink-soft)",
    lineHeight: 1.5,
    fontSize: 15,
  },
  card: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid var(--line)",
    fontSize: 14,
    color: "var(--ink-soft)",
  },
  primary: {
    width: "100%",
    marginTop: 20,
    padding: "15px 16px",
    borderRadius: 16,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 750,
    fontSize: 16,
    cursor: "pointer",
  },
};
