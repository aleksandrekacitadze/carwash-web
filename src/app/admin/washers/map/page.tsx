"use client";

import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "@/lib/api";

type Washer = {
  id: number;
  fullName: string;
  city: string;
  lat: number;
  lng: number;
  availabilityStatus: string;
};

const defaultCenter = {
  lat: 41.7151,
  lng: 44.8271,
};

export default function LiveWashersMapPage() {
  const [washers, setWashers] =
    useState<Washer[]>([]);

  const { isLoaded, loadError } =
    useJsApiLoader({
      googleMapsApiKey:
        process.env
          .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

  async function load() {
    try {
      const { data } =
        await api.get(
          "/admin/washers/live-map",
        );

      setWashers(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(
      load,
      5000,
    );

    return () =>
      clearInterval(interval);
  }, []);

  const center = useMemo(() => {
    if (!washers.length) {
      return defaultCenter;
    }

    return {
      lat: washers[0].lat,
      lng: washers[0].lng,
    };
  }, [washers]);

  if (loadError) {
    return (
      <div
        style={{
          padding: 20,
          color: "white",
        }}
      >
        Failed to load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          padding: 20,
          color: "white",
        }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "transparent",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "85vh",
          minHeight: 500,
          borderRadius: 24,
          overflow: "hidden",
          border:
            "1px solid var(--line)",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <GoogleMap
          zoom={12}
          center={center}
          mapContainerStyle={{
            width: "100%",
            height: "100%",
          }}
          options={{
            fullscreenControl: true,
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          {washers.map((w) => (
            <Marker
              key={w.id}
              position={{
                lat: w.lat,
                lng: w.lng,
              }}
              title={`${w.fullName} (${w.city})`}
            />
          ))}
        </GoogleMap>
      </div>
    </main>
  );
}