"use client";

import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import { api } from "@/lib/api";

type OrderMapResponse = {
  orderId: number;

  orderStatus: string;

  customer: {
    lat: number;
    lng: number;
    address: string;
  };

  washer: {
    id: number;
    lat: number;
    lng: number;
    lastSeenAt?: string;
  } | null;
};

export default function AdminOrderMapPage() {
  const params = useParams();

  const orderId = Number(
    params?.id,
  );

  const [data, setData] =
    useState<OrderMapResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const {
    isLoaded,
    loadError,
  } = useJsApiLoader({
    googleMapsApiKey:
      process.env
        .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  async function load() {
    try {
      setError("");

      const res = await api.get(
        `/admin/orders/${orderId}/map`,
      );

      setData(res.data);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Failed to load map",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!orderId) return;

    load();

    const interval = setInterval(
      load,
      5000,
    );

    return () =>
      clearInterval(interval);
  }, [orderId]);

  const center = useMemo(() => {
    if (!data) {
      return {
        lat: 41.7151,
        lng: 44.8271,
      };
    }

    return {
      lat: data.customer.lat,
      lng: data.customer.lng,
    };
  }, [data]);

  if (loadError) {
    return (
      <div
        style={{
          padding: 20,
          color: "white",
          background: "#0b0f19",
          minHeight: "100vh",
        }}
      >
        Failed to load Google Maps.
      </div>
    );
  }

  if (loading || !isLoaded) {
    return (
      <div
        style={{
          padding: 20,
          color: "white",
          background: "#0b0f19",
          minHeight: "100vh",
        }}
      >
        Loading map...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          padding: 20,
          color: "white",
          background: "#0b0f19",
          minHeight: "100vh",
        }}
      >
        {error || "Map data not found"}
      </div>
    );
  }

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#0b0f19",
        padding: 16,
        boxSizing: "border-box",
        color: "white",
      }}
    >
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent:
            "space-between",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            Order #{data.orderId}
          </h1>

          <div
            style={{
              marginTop: 6,
              opacity: 0.8,
            }}
          >
            Status: {data.orderStatus}
          </div>

          <div
            style={{
              marginTop: 6,
              opacity: 0.8,
              fontSize: 14,
            }}
          >
            📍 {data.customer.address}
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            background:
              "rgba(255,255,255,0.08)",
            border:
              "1px solid rgba(255,255,255,0.10)",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Live refresh: 5s
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: "82vh",
          minHeight: 500,
          borderRadius: 24,
          overflow: "hidden",
          border:
            "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <GoogleMap
          zoom={13}
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
          {/* CUSTOMER */}
          <Marker
            position={{
              lat: data.customer.lat,
              lng: data.customer.lng,
            }}
            title="Customer"
          />

          {/* WASHER */}
          {data.washer && (
            <>
              <Marker
                position={{
                  lat: data.washer.lat,
                  lng: data.washer.lng,
                }}
                title={`Washer #${data.washer.id}`}
              />

              <Polyline
                path={[
                  {
                    lat: data.customer.lat,
                    lng: data.customer.lng,
                  },
                  {
                    lat: data.washer.lat,
                    lng: data.washer.lng,
                  },
                ]}
                options={{
                  strokeColor:
                    "#3cffb1",
                  strokeOpacity: 1,
                  strokeWeight: 4,
                }}
              />
            </>
          )}
        </GoogleMap>
      </div>
    </main>
  );
}