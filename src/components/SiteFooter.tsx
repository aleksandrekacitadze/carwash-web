"use client";

import React from "react";

export default function SiteFooter() {
  return (
    <footer style={S.footer}>
      <div style={S.grid}>
        <div>
          <h3 style={S.title}>Tempi.ge</h3>
          <p style={S.text}>
            Fast car wash booking platform connecting customers with verified washers.
          </p>
        </div>

        <div>
          <h4 style={S.head}>Contact</h4>
          <p style={S.text}>📞 +995 555 00 00 00</p>
          <p style={S.text}>✉️ support@tempi.ge</p>
          <p style={S.text}>📍 Tbilisi, Georgia</p>
        </div>

        <div>
          <h4 style={S.head}>Social</h4>
          <a style={S.link} href="https://facebook.com" target="_blank">Facebook</a>
          <a style={S.link} href="https://instagram.com" target="_blank">Instagram</a>
          <a style={S.link} href="https://tiktok.com" target="_blank">TikTok</a>
        </div>

        <div>
          <h4 style={S.head}>Info</h4>
          <a style={S.link} href="/about">About Us</a>
          <a style={S.link} href="/contact">Contact</a>
          <a style={S.link} href="/privacy">Privacy Policy</a>
          <a style={S.link} href="/terms">Terms</a>
        </div>
      </div>

      <div style={S.bottom}>© {new Date().getFullYear()} Tempi.ge. All rights reserved.</div>
    </footer>
  );
}

const S: Record<string, React.CSSProperties> = {
  footer: {
    background: "#050914",
    color: "#fff",
    padding: "34px 18px 18px",
    borderTop: "1px solid rgba(255,255,255,0.12)",
  },
  grid: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 24,
  },
  title: { margin: 0, fontSize: 22, fontWeight: 950 },
  head: { margin: "0 0 10px", fontSize: 15 },
  text: { margin: "7px 0", opacity: 0.78, lineHeight: 1.5 },
  link: {
    display: "block",
    color: "rgba(255,255,255,0.78)",
    textDecoration: "none",
    margin: "7px 0",
  },
  bottom: {
    maxWidth: 1180,
    margin: "24px auto 0",
    paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    opacity: 0.65,
    fontSize: 13,
  },
};