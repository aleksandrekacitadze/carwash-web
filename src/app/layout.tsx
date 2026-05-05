import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MotionPage from "@/components/MotionPage";
import "./globals.css";
import "leaflet/dist/leaflet.css";

// ✅ GLOBAL UI COMPONENTS
import AdminButton from "@/components/AdminButton";
import SupportChatWidget from "@/components/support/SupportChatWidget";

// ✅ NEW COMPONENTS
import LiveWeatherBar from "@/components/LiveWeatherBar";
import SiteFooter from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tempi",
  description: "Tempi — On-demand car wash service platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        {/* ✅ TOP WEATHER BAR */}
        <LiveWeatherBar />

        {/* ✅ MAIN CONTENT WITH ANIMATION */}
        <div style={{ flex: 1 }}>
          <MotionPage>{children}</MotionPage>
        </div>

        {/* ✅ FOOTER */}
        <SiteFooter />

        {/* ✅ FLOATING COMPONENTS */}
        <AdminButton />
        <SupportChatWidget />
      </body>
    </html>
  );
}