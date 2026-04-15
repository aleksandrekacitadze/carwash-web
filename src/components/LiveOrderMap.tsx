"use client";

import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type WasherPin = { id: number; lat: number; lng: number; status?: string };

export default function LiveOrderMap({
  customer,
  washers,
  assignedWasherId,
  mode,
}: {
  customer: { lat: number; lng: number };
  washers: WasherPin[];
  assignedWasherId: number | null;
  mode: "NEARBY_WASHERS" | "ASSIGNED_WASHER";
}) {
  const center = useMemo(
    () => [customer.lat, customer.lng] as [number, number],
    [customer.lat, customer.lng]
  );

  const assigned = useMemo(
    () => (assignedWasherId ? washers.find((w) => w.id === assignedWasherId) : null),
    [washers, assignedWasherId]
  );

  const line = useMemo(() => {
    if (!assigned) return null;
    return [
      [customer.lat, customer.lng] as [number, number],
      [assigned.lat, assigned.lng] as [number, number],
    ];
  }, [assigned, customer.lat, customer.lng]);

  return (
    <div style={{ height: 260, width: "100%", borderRadius: 16, overflow: "hidden" }}>
      <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Customer */}
        <Marker position={center} icon={defaultIcon}>
          <Popup>You</Popup>
        </Marker>

        {/* “Near” circle only while searching */}
        {mode === "NEARBY_WASHERS" ? <Circle center={center} radius={1200} /> : null}

        {/* Washers */}
        {washers.map((w) => (
          <Marker key={w.id} position={[w.lat, w.lng]} icon={defaultIcon}>
            <Popup>
              Washer #{w.id}
              {assignedWasherId === w.id ? " ✅ assigned" : ""}
              {w.status ? <div>Status: {w.status}</div> : null}
            </Popup>
          </Marker>
        ))}

        {/* Optional line from washer to customer */}
        {line ? <Polyline positions={line} /> : null}
      </MapContainer>
    </div>
  );
}
