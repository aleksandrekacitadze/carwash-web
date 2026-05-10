"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AvailabilityStatus =
  | "AVAILABLE"
  | "OFFLINE"
  | "BUSY"
  | "RETURNING_TO_CUSTOMER";

export default function WasherAvailabilityToggle() {
  const [status, setStatus] =
    useState<AvailabilityStatus>("OFFLINE");

  const [loading, setLoading] =
    useState(false);

  // -----------------------------------------
  // LOAD CURRENT PROFILE
  // -----------------------------------------

  async function fetchProfile() {
    try {
      const { data } = await api.get(
        "/washers/me",
      );

      if (
        data?.availabilityStatus
      ) {
        setStatus(
          data.availabilityStatus,
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------------------
  // INITIAL + POLLING
  // -----------------------------------------

  useEffect(() => {
    fetchProfile();

    const interval =
      setInterval(() => {
        fetchProfile();
      }, 5000);

    return () =>
      clearInterval(interval);
  }, []);

  // -----------------------------------------
  // LIVE GPS UPDATE
  // -----------------------------------------

  

  // -----------------------------------------
  // GPS POLLING
  // -----------------------------------------


  // -----------------------------------------
  // GO ONLINE
  // -----------------------------------------
useEffect(() => {
  if (
    status !== "AVAILABLE" &&
    status !==
      "RETURNING_TO_CUSTOMER" &&
    status !== "BUSY"
  ) {
    return;
  }

  if (
    !navigator.geolocation
  ) {
    return;
  }

  const watchId =
    navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          const lat =
            pos.coords.latitude;

          const lng =
            pos.coords.longitude;

          await api.post(
            "/users/location",
            {
              lat,
              lng,
            },
          );
        } catch (err) {
          console.error(
            "Location update failed",
            err,
          );
        }
      },

      (err) => {
        console.error(
          "GPS watch error",
          err,
        );
      },

      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );

  return () => {
    navigator.geolocation.clearWatch(
      watchId,
    );
  };
}, [status]);
  async function goOnline() {
    try {
      setLoading(true);

      await api.post(
        "/washers/online",
      );

      setStatus("AVAILABLE");

      
    } catch (err) {
      console.error(err);

      alert(
        "Failed to go online",
      );
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

      await api.post(
        "/washers/offline",
      );

      setStatus("OFFLINE");
    } catch (err) {
      console.error(err);

      alert(
        "Failed to go offline",
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // UI STATES
  // -----------------------------------------

  const isOnline =
    status === "AVAILABLE";

  const isBusy =
    status === "BUSY";

  const isReturning =
    status ===
    "RETURNING_TO_CUSTOMER";

  return (
    <div style={styles.wrapper}>
      <div style={styles.statusRow}>
        <div
          style={{
            ...styles.dot,

            backgroundColor:
              isOnline
                ? "#22c55e"
                : isBusy
                ? "#f59e0b"
                : isReturning
                ? "#3b82f6"
                : "#ef4444",
          }}
        />

        <span
          style={styles.statusText}
        >
          {status === "AVAILABLE"
            ? "Online"
            : status === "BUSY"
            ? "Busy"
            : status ===
              "RETURNING_TO_CUSTOMER"
            ? "Returning To Customer"
            : "Offline"}
        </span>
      </div>

    {/* ----------------------------------------- */}
{/* BUTTONS */}
{/* ----------------------------------------- */}

{isBusy ? (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
      width: "100%",
    }}
  >
    <button
      onClick={goOnline}
      disabled={loading}
      style={{
        ...styles.button,
        backgroundColor:
          "#22c55e",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? "Loading..."
        : "Switch To Online"}
    </button>

    <button
      onClick={goOffline}
      disabled={loading}
      style={{
        ...styles.button,
        backgroundColor:
          "#ef4444",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? "Loading..."
        : "Go Offline"}
    </button>
  </div>
) : isReturning ? (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
      width: "100%",
    }}
  >
    <button
      onClick={goOnline}
      disabled={loading}
      style={{
        ...styles.button,
        backgroundColor:
          "#22c55e",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? "Loading..."
        : "Switch To Online"}
    </button>

    <button
      onClick={goOffline}
      disabled={loading}
      style={{
        ...styles.button,
        backgroundColor:
          "#ef4444",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? "Loading..."
        : "Go Offline"}
    </button>
  </div>
) : isOnline ? (
  <button
    onClick={goOffline}
    disabled={loading}
    style={{
      ...styles.button,
      backgroundColor:
        "#ef4444",
      opacity: loading ? 0.7 : 1,
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
      backgroundColor:
        "#22c55e",
      opacity: loading ? 0.7 : 1,
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

const styles: Record<
  string,
  any
> = {
  wrapper: {
    width: "100%",
    maxWidth: 340,
    padding: 20,
    borderRadius: 24,

    background:
      "rgba(255,255,255,0.06)",

    backdropFilter:
      "blur(12px)",

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