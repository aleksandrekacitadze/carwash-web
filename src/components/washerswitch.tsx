"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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
  // LOAD CURRENT PROFILE
  // -----------------------------------------

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data } = await api.get(
        "/washers/me",
      );

      if (data?.availabilityStatus) {
        setStatus(
          data.availabilityStatus,
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------------------
  // LIVE GPS UPDATE
  // -----------------------------------------

  async function updateLiveLocation() {
    try {
      if (
        !navigator.geolocation
      ) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
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
          console.error(err);
        },
        {
          enableHighAccuracy: true,
        },
      );
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------------------
  // GPS POLLING
  // -----------------------------------------

  useEffect(() => {
    if (
      status !== "AVAILABLE"
    ) {
      return;
    }

    // initial update
    updateLiveLocation();

    const interval =
      setInterval(() => {
        updateLiveLocation();
      }, 10000);

    return () =>
      clearInterval(interval);
  }, [status]);

  // -----------------------------------------
  // GO ONLINE
  // -----------------------------------------

  async function goOnline() {
    try {
      setLoading(true);

      await api.post(
        "/washers/online",
      );

      setStatus("AVAILABLE");

      // immediately send location
      await updateLiveLocation();
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
  // UI
  // -----------------------------------------

  const isOnline =
    status === "AVAILABLE";

  const isBusy =
    status === "BUSY";

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
                : "#ef4444",
          }}
        />

        <span
          style={styles.statusText}
        >
          {status ===
          "AVAILABLE"
            ? "Online"
            : status === "BUSY"
            ? "Busy"
            : "Offline"}
        </span>
      </div>

      {isBusy ? (
        <button
          disabled
          style={{
            ...styles.button,
            backgroundColor:
              "#f59e0b",
            cursor: "not-allowed",
            opacity: 0.8,
          }}
        >
          Busy On Order
        </button>
      ) : isOnline ? (
        <button
          onClick={goOffline}
          disabled={loading}
          style={{
            ...styles.button,
            backgroundColor:
              "#ef4444",
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