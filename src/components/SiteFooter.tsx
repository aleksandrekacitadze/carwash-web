"use client";

import React from "react";

export default function SiteFooter() {
  return (
    <footer style={S.footer}>
      <div style={S.grid}>
        <div>
          <h3 style={S.title}>Tempi</h3>
          <p style={S.text}>
            A calmer way to book a car wash — washers come to you across Tbilisi.
          </p>
        </div>

        <div>
          <h4 style={S.head}>Help</h4>
          <p style={S.text}>+995 555 00 00 00</p>
          <p style={S.text}>support@tempi.ge</p>
        </div>

        <div>
          <h4 style={S.head}>Follow</h4>
          <a style={S.link} href="https://instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a style={S.link} href="https://facebook.com" target="_blank" rel="noreferrer">
            Facebook
          </a>
        </div>

        <div>
          <h4 style={S.head}>Legal</h4>
          <a style={S.link} href="/privacy">
            Privacy
          </a>
          <a style={S.link} href="/terms">
            Terms
          </a>
        </div>
      </div>

      <div style={S.bottom}>© {new Date().getFullYear()} Tempi. Made for Tbilisi drivers.</div>
    </footer>
  );
}

const S: Record<string, React.CSSProperties> = {
  footer: {
    background: "rgba(255,255,255,0.72)",
    color: "var(--ink)",
    padding: "40px 18px 22px",
    borderTop: "1px solid var(--line)",
    marginTop: 40,
  },
  grid: {
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 28,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 600,
    fontFamily: "var(--font-display)",
    letterSpacing: "-0.03em",
  },
  head: { margin: "0 0 10px", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)" },
  text: { margin: "6px 0", color: "var(--ink-soft)", lineHeight: 1.55, fontSize: 14 },
  link: {
    display: "block",
    color: "var(--ink-soft)",
    textDecoration: "none",
    margin: "7px 0",
    fontSize: 14,
  },
  bottom: {
    maxWidth: 980,
    margin: "28px auto 0",
    paddingTop: 16,
    borderTop: "1px solid var(--line)",
    color: "var(--ink-soft)",
    fontSize: 13,
  },
};
