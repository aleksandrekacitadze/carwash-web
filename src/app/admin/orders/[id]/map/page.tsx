"use client";

import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  useEffect,
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

  const { isLoaded } =
    useJsApiLoader({
      googleMapsApiKey:
        process.env
          .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

  async function load() {
    try {
      const res = await api.get(
        `/admin/orders/${orderId}/map`,
      );

      setData(res.data);
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
  }, [orderId]);

  if (!isLoaded || !data) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
      }}
    >
      <GoogleMap
        zoom={13}
        center={{
          lat: data.customer.lat,
          lng: data.customer.lng,
        }}
        mapContainerStyle={{
          width: "100%",
          height: "100%",
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
              title="Washer"
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
                strokeColor: "#3cffb1",
                strokeOpacity: 1,
                strokeWeight: 4,
              }}
            />
          </>
        )}
      </GoogleMap>
    </div>
  );
}