"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

type LocationMode = "GPS" | "MANUAL";

type Car = {
  id: number;
  ownerId: number;
  brand: string;
  model: string;
  color?: string | null;
  plateNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  imageDataUrl?: string;
  nickname?: string;
};

type Service = {
  id: number;
  name: string;
  description?: string | null;
  priceGel: number;
  durationMin: number;
  isActive: boolean;
};

type Washer = {
  id: number;
  fullName: string;
  avgRating: number;
  totalReviews: number;
  distanceKm?: number | null;
};

type AddressForm = {
  city: string;
  street: string;
  building: string;
  entrance: string;
  floor: string;
  apartment: string;
  comment: string;
};

type SubscriptionMe = {
  id?: number;
  userId?: number;
  planId?: number;
  status?: string;
  creditsLeft: number;
  activeUntil?: string;
} | null;

function prettyCarName(c: Car) {
  const b = (c.brand || "").trim();
  const m = (c.model || "").trim();
  const p = (c.plateNumber || "").trim();
  if (b || m) return `${b} ${m}${p ? ` • ${p}` : ""}`.trim();
  return `Car #${c.id}`;
}

function formatAddress(a: AddressForm) {
  const parts = [
    a.city?.trim(),
    a.street?.trim(),
    a.building?.trim() ? `Bldg ${a.building.trim()}` : "",
    a.entrance?.trim() ? `Entrance ${a.entrance.trim()}` : "",
    a.floor?.trim() ? `Floor ${a.floor.trim()}` : "",
    a.apartment?.trim() ? `Apt ${a.apartment.trim()}` : "",
  ].filter(Boolean);

  const main = parts.join(", ");
  const comment = a.comment?.trim();
  return comment ? `${main} — ${comment}` : main;
}

async function geocodeAddress(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(
    query
  )}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error("Geocoding failed");

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  return {
    lat: Number.parseFloat(data[0].lat),
    lng: Number.parseFloat(data[0].lon),
    displayName: String(data[0].display_name || ""),
    address: data[0].address || {},
  };
}

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error("Reverse geocoding failed");

  const data = await res.json();
  const addr = data?.address || {};

  const street =
    addr.road ||
    addr.pedestrian ||
    addr.footway ||
    addr.cycleway ||
    addr.path ||
    addr.residential ||
    "";

  const building =
    addr.house_number ||
    addr.building ||
    "";

  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    "Tbilisi";

  return {
    displayName: String(data?.display_name || ""),
    form: {
      city: String(city || ""),
      street: String(street || ""),
      building: String(building || ""),
      entrance: "",
      floor: "",
      apartment: "",
      comment: "",
    } as AddressForm,
  };
}

export default function CustomerDashboardPage() {
  const router = useRouter();

  const [cars, setCars] = useState<Car[]>([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [carsErr, setCarsErr] = useState("");

  const [activeCarId, setActiveCarId] = useState<number | null>(null);
  const activeCar = useMemo(
    () => cars.find((c) => c.id === activeCarId) || null,
    [cars, activeCarId]
  );

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesErr, setServicesErr] = useState("");

  const [serviceId, setServiceId] = useState<number | null>(null);
  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId]
  );

  const [locMode, setLocMode] = useState<LocationMode>("GPS");

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const [addressForm, setAddressForm] = useState<AddressForm>({
    city: "Tbilisi",
    street: "",
    building: "",
    entrance: "",
    floor: "",
    apartment: "",
    comment: "",
  });

  const [manualSaved, setManualSaved] = useState(false);
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [manualGeoName, setManualGeoName] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");

  const [washers, setWashers] = useState<Washer[]>([]);
  const [washersLoading, setWashersLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [washLoading, setWashLoading] = useState(false);
  const [creditWashLoading, setCreditWashLoading] = useState(false);
  const [cashWashLoading, setCashWashLoading] = useState(false);

  const currentCoords = useMemo(() => {
    if (locMode === "GPS") return gpsCoords;
    return manualCoords;
  }, [locMode, gpsCoords, manualCoords]);

  const currentAddressLabel = useMemo(() => {
    const formatted = formatAddress(addressForm);
    if (formatted) return formatted;
    if (locMode === "GPS" && gpsCoords) {
      return `GPS: ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`;
    }
    return "No address selected yet";
  }, [addressForm, locMode, gpsCoords]);

  async function pickCarImage() {
    fileRef.current?.click();
  }

  async function onCarImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeCar) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB).");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setCars((prev) =>
      prev.map((c) => (c.id === activeCar.id ? { ...c, imageDataUrl: dataUrl } : c))
    );
  }

  useEffect(() => {
    loadCars();
    loadServices();
    loadTopWashers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCars() {
    setCarsErr("");
    setCarsLoading(true);
    try {
      const { data } = await api.get<Car[]>("/cars/me");
      const withNick = (data || []).map((c) => ({
        ...c,
        nickname:
          `${(c.brand || "Car").trim()} ${(c.model || "").trim()}`.trim() ||
          `Car ${c.id}`,
      }));
      setCars(withNick);
      if (!activeCarId && withNick.length) setActiveCarId(withNick[0].id);
    } catch (e: any) {
      setCarsErr(e?.response?.data?.message || "Failed to load cars.");
    } finally {
      setCarsLoading(false);
    }
  }

  async function loadServices() {
    setServicesErr("");
    setServicesLoading(true);
    try {
      const { data } = await api.get<Service[]>("/services");
      setServices(data || []);
      if (!serviceId && data?.length) setServiceId(data[0].id);
    } catch (e: any) {
      setServicesErr(e?.response?.data?.message || "Failed to load services.");
    } finally {
      setServicesLoading(false);
    }
  }

  async function loadTopWashers() {
    setWashersLoading(true);
    try {
      const { data } = await api.get<Washer[]>("/washers/top?limit=6");
      setWashers(data || []);
    } catch {
      setWashers([
        { id: 1, fullName: "Nika G.", avgRating: 4.9, totalReviews: 118, distanceKm: 2.4 },
        { id: 2, fullName: "Giorgi K.", avgRating: 4.8, totalReviews: 92, distanceKm: 3.1 },
        { id: 3, fullName: "Luka M.", avgRating: 4.7, totalReviews: 64, distanceKm: 1.7 },
        { id: 4, fullName: "Saba T.", avgRating: 4.7, totalReviews: 51, distanceKm: 4.8 },
        { id: 5, fullName: "Data B.", avgRating: 4.6, totalReviews: 39, distanceKm: 5.2 },
        { id: 6, fullName: "Ilia P.", avgRating: 4.6, totalReviews: 33, distanceKm: 2.9 },
      ]);
    } finally {
      setWashersLoading(false);
    }
  }

  async function addCar() {
    const brand = prompt("Brand? (e.g. Toyota)")?.trim();
    if (!brand) return;

    const model = prompt("Model? (e.g. Prius)")?.trim();
    if (!model) return;

    try {
      const { data } = await api.post<Car>("/cars", { brand, model });
      const newCar = { ...data, nickname: `${brand} ${model}`.trim() };
      setCars((prev) => [newCar, ...prev]);
      setActiveCarId(newCar.id);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to add car.");
    }
  }

  async function updateCarPatch(id: number, patch: Partial<Car>) {
    try {
      const body: any = {};
      if (patch.brand !== undefined) body.brand = patch.brand;
      if (patch.model !== undefined) body.model = patch.model;
      if (patch.color !== undefined) body.color = patch.color;
      if (patch.plateNumber !== undefined) body.plateNumber = patch.plateNumber;
      if (patch.notes !== undefined) body.notes = patch.notes;

      const { data } = await api.patch<Car>(`/cars/${id}`, body);
      setCars((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...data,
                nickname: `${data.brand || c.brand} ${data.model || c.model}`.trim(),
              }
            : c
        )
      );
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to update car.");
    }
  }

  async function deleteCar(id: number) {
    if (!confirm("Delete this car?")) return;
    try {
      await api.delete(`/cars/${id}`);
      setCars((prev) => prev.filter((c) => c.id !== id));
      if (activeCarId === id) {
        const next = cars.find((c) => c.id !== id);
        setActiveCarId(next?.id ?? null);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to delete car.");
    }
  }

  function updateAddressField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setAddressForm((prev) => ({ ...prev, [key]: value }));
    if (locMode === "MANUAL") {
      setManualSaved(false);
      setManualError("");
    }
  }

  async function useGpsLocation() {
    setLocMode("GPS");
    setGpsError("");
    setManualError("");
    setManualGeoName("");

    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation not supported");
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          setGpsCoords(coords);

          const rev = await reverseGeocode(coords.lat, coords.lng);
          setAddressForm((prev) => ({
            ...prev,
            city: rev.form.city || prev.city,
            street: rev.form.street || prev.street,
            building: rev.form.building || prev.building,
          }));
          setManualGeoName(rev.displayName || "");

          try {
            await api.post("/users/me/location", coords);
          } catch {
            // ignore
          }
        } catch (e: any) {
          setGpsError(e?.message || "Failed to reverse geocode location");
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.message || "Failed to get location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function saveManualLocation() {
    setLocMode("MANUAL");
    setGpsError("");
    setManualError("");

    if (addressForm.street.trim().length < 3) {
      alert("Enter a valid street (min 3 chars).");
      return;
    }

    if (addressForm.building.trim().length < 1) {
      alert("Enter building / house number.");
      return;
    }

    const query = `${addressForm.street} ${addressForm.building}, ${addressForm.city}, Georgia`;

    try {
      setManualLoading(true);

      const geo = await geocodeAddress(query);
      if (!geo) {
        setManualError("Address not found. Try a more specific street/building.");
        setManualSaved(false);
        setManualCoords(null);
        return;
      }

      setManualCoords({ lat: geo.lat, lng: geo.lng });
      setManualGeoName(geo.displayName || "");

      await api.post("/users/me/location", { lat: geo.lat, lng: geo.lng });

      setManualSaved(true);
    } catch (e: any) {
      setManualError(e?.message || "Failed to geocode/save location.");
      setManualSaved(false);
      setManualCoords(null);
    } finally {
      setManualLoading(false);
    }
  }

  async function buildOrderPayload(paymentMode: "DIRECT" | "CREDIT" | "CASH") {
    if (!activeCar) throw new Error("Please add/select a car first.");
    if (!selectedService) throw new Error("Please select a service.");

    const hasLocation =
      (locMode === "GPS" && !!gpsCoords) ||
      (locMode === "MANUAL" && manualSaved && !!manualCoords);

    if (!hasLocation) throw new Error("Please select a location first.");

    const address = formatAddress(addressForm) || "GPS location (auto)";

    const scheduledAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return {
      serviceId: selectedService.id,
      carId: activeCar.id,
      address,
      street: addressForm.street || null,
      building: addressForm.building || null,
      entrance: addressForm.entrance || null,
      floor: addressForm.floor || null,
      apartment: addressForm.apartment || null,
      lat: locMode === "GPS" ? gpsCoords!.lat : manualCoords?.lat,
      lng: locMode === "GPS" ? gpsCoords!.lng : manualCoords?.lng,
      scheduledAt,
      notes: addressForm.comment || null,
      paymentMode,
      ...(paymentMode === "DIRECT" || paymentMode === "CASH"
        ? { price: String(selectedService.priceGel) }
        : {}),
    };
  }

  async function onWashNowDirect() {
    try {
      setWashLoading(true);

      const payload = await buildOrderPayload("DIRECT");
      const { data } = await api.post<{ id: number }>("/orders", payload);

      const checkout = await api.post<{
        providerOrderId: string;
        approveUrl?: string | null;
      }>(`/payments/checkout/${data.id}`, {
        provider: "PAYPAL",
        amount: String(selectedService?.priceGel ?? "0"),
      });

      const approveUrl = checkout.data?.approveUrl;
      if (!approveUrl) {
        throw new Error("Payment approval URL missing.");
      }

      window.location.href = approveUrl;
    } catch (e: any) {
      alert(
        e?.response?.data?.message || e?.message || "Failed to start direct payment."
      );
    } finally {
      setWashLoading(false);
    }
  }

  async function onWashNowCredits() {
    try {
      setCreditWashLoading(true);

      const subResp = await api.get<SubscriptionMe>("/subscriptions/me");
      const sub = subResp.data;

      if (!sub || sub.creditsLeft <= 0) {
        alert("You do not have subscription credits left.");
        router.push("/subscriptions");
        return;
      }

      const payload = await buildOrderPayload("CREDIT");
      const { data } = await api.post<{ id: number }>("/orders", payload);

      router.push(`/orders/${data.id}/waiting`);
    } catch (e: any) {
      alert(
        e?.response?.data?.message || e?.message || "Failed to create credit order."
      );
    } finally {
      setCreditWashLoading(false);
    }
  }

  async function onWashNowCash() {
    try {
      setCashWashLoading(true);

      const payload = await buildOrderPayload("CASH");
      const { data } = await api.post<{ id: number }>("/orders", payload);

      router.push(`/orders/${data.id}/waiting`);
    } catch (e: any) {
      alert(
        e?.response?.data?.message || e?.message || "Failed to create cash order."
      );
    } finally {
      setCashWashLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Customer Dashboard</h1>
          <div style={S.subtitle}>Book a wash in seconds.</div>
        </div>

        <div style={S.headerActions}>
          <a style={S.secondaryBtn} href="/subscriptions">
            Buy Subscriptions
          </a>
          <a style={S.secondaryBtn} href="/washer/register-washer">
            Register as Washer
          </a>
        </div>
      </header>

      <div style={S.grid}>
        <section style={S.card}>
          <div style={S.cardHeaderRow}>
            <h2 style={S.cardTitle}>Your Car</h2>
            <button style={S.linkBtn as any} onClick={addCar}>
              + Add car
            </button>
          </div>

          {carsLoading ? <div style={S.muted}>Loading cars…</div> : null}
          {carsErr ? <div style={S.errorText}>{carsErr}</div> : null}

          <div style={S.carTabs}>
            {cars.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCarId(c.id)}
                style={{
                  ...S.carTab,
                  ...(c.id === activeCarId ? S.carTabActive : {}),
                }}
              >
                {c.nickname || prettyCarName(c)}
              </button>
            ))}
          </div>

          {!activeCar ? (
            <div style={S.muted}>No car selected. Add a car to continue.</div>
          ) : (
            <div style={S.carCard}>
              <div style={S.carImageBox}>
                {activeCar.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeCar.imageDataUrl} alt="Car" style={S.carImage} />
                ) : (
                  <div style={S.carImagePlaceholder}>
                    <div style={S.carEmoji}>🚗</div>
                    <div style={S.muted}>Upload your car image</div>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={onCarImageSelected}
                />

                <button style={S.smallBtn} onClick={pickCarImage}>
                  Upload Image
                </button>

                <button
                  style={{ ...S.smallBtn, marginTop: 10 }}
                  onClick={() => deleteCar(activeCar.id)}
                >
                  Delete Car
                </button>
              </div>

              <div style={S.carMeta}>
                <div style={S.row2}>
                  <div>
                    <div style={S.label}>Brand</div>
                    <input
                      style={S.input}
                      value={activeCar.brand || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCars((prev) =>
                          prev.map((c) => (c.id === activeCar.id ? { ...c, brand: v } : c))
                        );
                      }}
                      onBlur={() => updateCarPatch(activeCar.id, { brand: activeCar.brand })}
                      placeholder="Toyota"
                    />
                  </div>
                  <div>
                    <div style={S.label}>Model</div>
                    <input
                      style={S.input}
                      value={activeCar.model || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCars((prev) =>
                          prev.map((c) => (c.id === activeCar.id ? { ...c, model: v } : c))
                        );
                      }}
                      onBlur={() => updateCarPatch(activeCar.id, { model: activeCar.model })}
                      placeholder="Prius"
                    />
                  </div>
                </div>

                <div style={S.row2}>
                  <div>
                    <div style={S.label}>Plate (optional)</div>
                    <input
                      style={S.input}
                      value={activeCar.plateNumber || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCars((prev) =>
                          prev.map((c) =>
                            c.id === activeCar.id ? { ...c, plateNumber: v } : c
                          )
                        );
                      }}
                      onBlur={() =>
                        updateCarPatch(activeCar.id, {
                          plateNumber: activeCar.plateNumber || null,
                        })
                      }
                      placeholder="ABC-123"
                    />
                  </div>
                  <div>
                    <div style={S.label}>Color (optional)</div>
                    <input
                      style={S.input}
                      value={activeCar.color || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCars((prev) =>
                          prev.map((c) => (c.id === activeCar.id ? { ...c, color: v } : c))
                        );
                      }}
                      onBlur={() =>
                        updateCarPatch(activeCar.id, { color: activeCar.color || null })
                      }
                      placeholder="Black"
                    />
                  </div>
                </div>

                <div style={S.pricesBox}>
                  <div style={S.pricesTitle}>Service</div>

                  {servicesLoading ? <div style={S.muted}>Loading services…</div> : null}
                  {servicesErr ? <div style={S.errorText}>{servicesErr}</div> : null}

                  {services.length ? (
                    <>
                      <div style={S.label}>Choose service</div>
                      <select
                        style={S.input}
                        value={serviceId ?? ""}
                        onChange={(e) => setServiceId(Number(e.target.value))}
                      >
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {s.priceGel} GEL • {s.durationMin} min
                          </option>
                        ))}
                      </select>

                      {selectedService?.description ? (
                        <div style={{ ...S.mutedSmall, marginTop: 8 }}>
                          {selectedService.description}
                        </div>
                      ) : null}

                      <div style={{ ...S.washTypeRow, marginTop: 12 }}>
                        <div style={S.totalPrice}>
                          Total: <b>{selectedService?.priceGel ?? "-"} GEL</b>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={S.mutedSmall}>
                      No services found. Create them in backend using <code>POST /services</code>.
                    </div>
                  )}
                </div>

                <div style={S.washButtonsWrap}>
                  <button
                    style={S.washBtn}
                    onClick={onWashNowDirect}
                    disabled={washLoading || creditWashLoading || cashWashLoading}
                  >
                    {washLoading
                      ? "STARTING PAYMENT..."
                      : `WASH NOW — ${selectedService?.priceGel ?? "-"} GEL`}
                  </button>

                  <button
                    style={S.creditWashBtn}
                    onClick={onWashNowCredits}
                    disabled={washLoading || creditWashLoading || cashWashLoading}
                  >
                    {creditWashLoading ? "CHECKING CREDITS..." : "WASH NOW WITH CREDITS"}
                  </button>

                  <button
                    style={S.cashWashBtn}
                    onClick={onWashNowCash}
                    disabled={washLoading || creditWashLoading || cashWashLoading}
                  >
                    {cashWashLoading ? "CREATING CASH ORDER..." : "WASH NOW WITH CASH"}
                  </button>
                </div>

                <div style={S.mutedSmall}>
                  Direct payment creates order + starts checkout. Credit and cash go directly
                  to the waiting page.
                </div>
              </div>
            </div>
          )}
        </section>

        <section style={S.card}>
          <h2 style={S.cardTitle}>Location</h2>

          <div style={S.locationModes}>
            <button
              style={{
                ...S.pill,
                ...(locMode === "GPS" ? S.pillActive : {}),
              }}
              onClick={useGpsLocation}
            >
              Track (GPS)
            </button>

            <button
              style={{
                ...S.pill,
                ...(locMode === "MANUAL" ? S.pillActive : {}),
              }}
              onClick={() => {
                setLocMode("MANUAL");
                setGpsError("");
              }}
            >
              Manual
            </button>
          </div>

          <div style={S.locationBox}>
            <div style={S.locationRow}>
              <div style={S.locationIndicator} />
              <div>
                <div style={S.locationLabel}>Chosen location</div>
                <div style={S.locationValue}>{currentAddressLabel}</div>

                {currentCoords ? (
                  <div style={{ ...S.mutedSmall, marginTop: 6 }}>
                    Coordinates: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                  </div>
                ) : null}

                {manualGeoName ? (
                  <div style={{ ...S.mutedSmall, marginTop: 6 }}>
                    Found: {manualGeoName}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ ...S.row2, marginTop: 14 }}>
              <div>
                <div style={S.label}>City</div>
                <input
                  style={S.input}
                  value={addressForm.city}
                  onChange={(e) => updateAddressField("city", e.target.value)}
                  placeholder="Tbilisi"
                />
              </div>

              <div>
                <div style={S.label}>Street</div>
                <input
                  style={S.input}
                  value={addressForm.street}
                  onChange={(e) => updateAddressField("street", e.target.value)}
                  placeholder="A. Kazbegi Ave"
                />
              </div>
            </div>

            <div style={{ ...S.row2, marginTop: 10 }}>
              <div>
                <div style={S.label}>Building / House #</div>
                <input
                  style={S.input}
                  value={addressForm.building}
                  onChange={(e) => updateAddressField("building", e.target.value)}
                  placeholder="12"
                />
              </div>

              <div>
                <div style={S.label}>Entrance (optional)</div>
                <input
                  style={S.input}
                  value={addressForm.entrance}
                  onChange={(e) => updateAddressField("entrance", e.target.value)}
                  placeholder="A"
                />
              </div>
            </div>

            <div style={{ ...S.row2, marginTop: 10 }}>
              <div>
                <div style={S.label}>Floor (optional)</div>
                <input
                  style={S.input}
                  value={addressForm.floor}
                  onChange={(e) => updateAddressField("floor", e.target.value)}
                  placeholder="5"
                />
              </div>

              <div>
                <div style={S.label}>Apartment (optional)</div>
                <input
                  style={S.input}
                  value={addressForm.apartment}
                  onChange={(e) => updateAddressField("apartment", e.target.value)}
                  placeholder="23"
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={S.label}>Comment (optional)</div>
              <input
                style={S.input}
                value={addressForm.comment}
                onChange={(e) => updateAddressField("comment", e.target.value)}
                placeholder="Call me when arrived"
              />
            </div>

            <div style={S.locationActions}>
              <button style={S.primaryBtn} onClick={useGpsLocation} disabled={gpsLoading}>
                {gpsLoading ? "Tracking..." : "Track my location"}
              </button>

              <button
                style={S.secondaryActionBtn}
                onClick={saveManualLocation}
                disabled={manualLoading}
              >
                {manualLoading ? "Finding address..." : "Save manual location"}
              </button>
            </div>

            {gpsError ? <div style={S.errorText}>{gpsError}</div> : null}
            {manualError ? <div style={S.errorText}>{manualError}</div> : null}

            <div style={S.mutedSmall}>
              GPS now auto-fills the address fields. You can edit them before ordering.
              Manual mode geocodes the entered address and saves coordinates.
            </div>
          </div>
        </section>

        <section style={S.card}>
          <div style={S.cardHeaderRow}>
            <h2 style={S.cardTitle}>Top Washers</h2>
            <a style={S.linkBtn} href="/washers">
              View all →
            </a>
          </div>

          {washersLoading ? (
            <div style={S.muted}>Loading washers…</div>
          ) : (
            <div style={S.washersGrid}>
              {washers.map((w) => (
                <div key={w.id} style={S.washerCard}>
                  <div style={S.washerAvatar}>
                    <div style={S.washerAvatarInner}>🧽</div>
                  </div>

                  <div style={S.washerInfo}>
                    <div style={S.washerName}>{w.fullName}</div>
                    <div style={S.washerMeta}>
                      ⭐ {w.avgRating.toFixed(1)} ({w.totalReviews})
                      {typeof w.distanceKm === "number"
                        ? ` • ${w.distanceKm.toFixed(1)}km`
                        : ""}
                    </div>
                  </div>

                  <a style={S.smallBtnInline} href={`/washers/${w.id}`}>
                    View
                  </a>
                </div>
              ))}
            </div>
          )}

          <div style={S.mutedSmall}>Ranked by rating (distance later).</div>
        </section>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 16,
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" },
  subtitle: { marginTop: 6, opacity: 0.8 },
  headerActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
    minWidth: 0,
  },

  cardHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 800 },

  linkBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.86)",
    cursor: "pointer",
    padding: "6px 8px",
    borderRadius: 10,
    textDecoration: "none",
  },

  secondaryBtn: {
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtn: {
    background: "#fff",
    color: "#0b0f19",
    padding: "12px 12px",
    borderRadius: 14,
    fontWeight: 900,
    width: "100%",
    border: "none",
    cursor: "pointer",
  },

  secondaryActionBtn: {
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "12px 12px",
    borderRadius: 14,
    fontWeight: 900,
    width: "100%",
    border: "1px solid rgba(255,255,255,0.16)",
    cursor: "pointer",
  },

  smallBtn: {
    marginTop: 10,
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    padding: "10px 10px",
    borderRadius: 14,
    fontWeight: 800,
    width: "100%",
    border: "none",
    cursor: "pointer",
  },

  smallBtnInline: {
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    padding: "8px 10px",
    borderRadius: 12,
    fontWeight: 800,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },

  muted: { opacity: 0.8, marginTop: 8 },
  mutedSmall: { opacity: 0.7, marginTop: 10, fontSize: 12, lineHeight: 1.35 },
  errorText: { marginTop: 10, color: "#ffb4b4" },

  carTabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  carTab: {
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: "8px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    opacity: 0.9,
  },
  carTabActive: { background: "rgba(255,255,255,0.18)", opacity: 1 },

  carCard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
  },

  carImageBox: {
    borderRadius: 16,
    border: "1px dashed rgba(255,255,255,0.22)",
    background: "rgba(0,0,0,0.15)",
    padding: 12,
    minWidth: 0,
  },
  carImage: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
  },
  carImagePlaceholder: {
    height: 220,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "center",
    padding: 10,
  },
  carEmoji: { fontSize: 42, marginBottom: 8 },

  carMeta: { display: "flex", flexDirection: "column", gap: 10, minWidth: 0 },

  label: { fontSize: 12, fontWeight: 800, opacity: 0.8, marginBottom: 6 },

  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
    minWidth: 0,
  },

  row2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },

  pricesBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
  },
  pricesTitle: { fontWeight: 900, marginBottom: 8 },
  washTypeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: 800,
  },

  washButtonsWrap: {
    display: "grid",
    gap: 10,
    marginTop: 8,
  },

  washBtn: {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 16,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "#3cffb1",
    color: "#062112",
    fontSize: 15,
  },

  creditWashBtn: {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    fontWeight: 900,
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    fontSize: 15,
  },

  cashWashBtn: {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    fontWeight: 900,
    background: "#ffd166",
    color: "#2b2100",
    fontSize: 15,
  },

  locationModes: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  pill: {
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
  },
  pillActive: {
    background: "rgba(255,255,255,0.18)",
  },

  locationBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
  },
  locationRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 10,
  },
  locationIndicator: {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "#3cffb1",
    marginTop: 4,
    flex: "0 0 12px",
  },
  locationLabel: { fontSize: 12, fontWeight: 800, opacity: 0.8 },
  locationValue: { marginTop: 4, lineHeight: 1.4, wordBreak: "break-word" },

  locationActions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 12,
  },

  washersGrid: {
    display: "grid",
    gap: 10,
    marginTop: 10,
  },
  washerCard: {
    display: "grid",
    gridTemplateColumns: "52px 1fr auto",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    background: "rgba(0,0,0,0.16)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  washerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background: "rgba(255,255,255,0.10)",
    display: "grid",
    placeItems: "center",
  },
  washerAvatarInner: { fontSize: 24 },
  washerInfo: { minWidth: 0 },
  washerName: {
    fontWeight: 800,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  washerMeta: {
    marginTop: 4,
    opacity: 0.78,
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};