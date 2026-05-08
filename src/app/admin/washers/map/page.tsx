"use client";

import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  useEffect,
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

export default function LiveWashersMapPage() {
  const [washers, setWashers] =
    useState<Washer[]>([]);

  const { isLoaded } =
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

  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
      }}
    >
      <GoogleMap
        zoom={12}
        center={{
          lat: 41.7151,
          lng: 44.8271,
        }}
        mapContainerStyle={{
          width: "100%",
          height: "100%",
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
  );
}