import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import MotionPage from "@/components/MotionPage";
import "./globals.css";
import "leaflet/dist/leaflet.css";

import AdminButton from "@/components/AdminButton";
import SupportChatWidget from "@/components/support/SupportChatWidget";
import LiveWeatherBar from "@/components/LiveWeatherBar";
import SiteFooter from "@/components/SiteFooter";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tempi",
  description: "Tempi — On-demand car wash, wherever you are",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${fraunces.variable} antialiased`}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <LiveWeatherBar />

        <div style={{ flex: 1 }}>
          <MotionPage>{children}</MotionPage>
        </div>

        <SiteFooter />

        <AdminButton />
        <SupportChatWidget />
      </body>
    </html>
  );
}
