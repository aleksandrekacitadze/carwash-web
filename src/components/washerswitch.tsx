"use client";

import { useEffect, useState } from "react";

type AvailabilityStatus =
  | "AVAILABLE"
  | "OFFLINE"
  | "BUSY";

export default function WasherAvailabilityToggle() {
  const [status, setStatus] =
    useState<AvailabilityStatus>("OFFLINE");

  const [loading, setLoading] =
    useState(false);

  // -----------------------------------------
  // OPTIONAL: LOAD CURRENT STATUS
  // -----------------------------------------

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const token =
        localStorage.getItem("token");

      const res = await fetch(
        "http://localhost:3001/washers/me",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) return;

      const data = await res.json();

      if (data?.availabilityStatus) {
        setStatus(data.availabilityStatus);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------------------
  // GO ONLINE
  // -----------------------------------------

  async function goOnline() {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      const res = await fetch(
        "http://localhost:3001/washers/online",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed");
      }

      setStatus("AVAILABLE");
    } catch (err) {
      console.error(err);
      alert("Failed to go online");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // GO OFFLINE
  // -----------------------------------------

  async function goOffline() {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      const res = await fetch(
        "http://localhost:3001/washers/offline",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed");
      }

      setStatus("OFFLINE");
    } catch (err) {
      console.error(err);
      alert("Failed to go offline");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // UI
  // -----------------------------------------

  const isOnline =
    status === "AVAILABLE";

  return (
    <div style={styles.wrapper}>
      <div style={styles.statusRow}>
        <div
          style={{
            ...styles.dot,
            backgroundColor: isOnline
              ? "#22c55e"
              : "#ef4444",
          }}
        />

        <span style={styles.statusText}>
          {status === "AVAILABLE"
            ? "Online"
            : status === "BUSY"
            ? "Busy"
            : "Offline"}
        </span>
      </div>

      {isOnline ? (
        <button
          onClick={goOffline}
          disabled={loading}
          style={{
            ...styles.button,
            backgroundColor: "#ef4444",
          }}
        >
          {loading
            ? "Loading..."
            : "Go Offline"}
        </button>
      ) : (
        <button
          onClick={goOnline}
          disabled={loading}
          style={{
            ...styles.button,
            backgroundColor: "#22c55e",
          }}
        >
          {loading
            ? "Loading..."
            : "Go Online"}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  wrapper: {
    width: "100%",
    maxWidth: 340,
    padding: 20,
    borderRadius: 24,
    background:
      "rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },

  statusText: {
    color: "white",
    fontSize: 16,
    fontWeight: 600,
  },

  button: {
    width: "100%",
    border: "none",
    borderRadius: 16,
    padding: "14px 18px",
    color: "white",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    transition: "0.2s",
  },
};