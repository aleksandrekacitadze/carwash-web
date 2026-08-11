"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { isPreviewSession } from "@/lib/preview";

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

type PriceQuote = {
  quoteId?: number;
  basePriceGel: number;
  distanceKm: number | null;
  distancePriceGel: number;
  totalPriceGel: number;
  nearestWasherId: number | null;
  source: "AVAILABLE_WASHER" | "RETURNING_TO_CUSTOMER" | null;

  hasNearbyOnlineWasher?: boolean;

  message?: string;
};

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
    query,
  )}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
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
    headers: { Accept: "application/json" },
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

  const building = addr.house_number || addr.building || "";

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
    [cars, activeCarId],
  );

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesErr, setServicesErr] = useState("");

  const [serviceId, setServiceId] = useState<number | null>(null);
  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId],
  );
const [notifyWhenWasherAvailable, setNotifyWhenWasherAvailable] =
  useState(false);

const [showNoWasherDialog, setShowNoWasherDialog] =
  useState(false);
  const [locMode, setLocMode] = useState<LocationMode>("GPS");

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

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
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualGeoName, setManualGeoName] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");

  const [washers, setWashers] = useState<Washer[]>([]);
  const [washersLoading, setWashersLoading] = useState(false);

  const [priceQuote, setPriceQuote] = useState<PriceQuote | null>(null);
  const [priceQuoteLoading, setPriceQuoteLoading] = useState(false);
  const [priceQuoteErr, setPriceQuoteErr] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [washLoading, setWashLoading] = useState(false);
  const [creditWashLoading, setCreditWashLoading] = useState(false);
  const [cashWashLoading, setCashWashLoading] = useState(false);

  const [editCarOpen, setEditCarOpen] = useState(false);
  const [showAddressExtras, setShowAddressExtras] = useState(false);
  const [payMethod, setPayMethod] = useState<"DIRECT" | "CREDIT" | "CASH">("DIRECT");

  const anyWashLoading = washLoading || creditWashLoading || cashWashLoading;
  const hasLocation =
    (locMode === "GPS" && !!gpsCoords) ||
    (locMode === "MANUAL" && manualSaved && !!manualCoords);
  const canBook = !!activeCar && !!selectedService && hasLocation && !anyWashLoading;

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

  const finalWashPrice = useMemo(() => {
    if (priceQuote?.totalPriceGel != null) return Number(priceQuote.totalPriceGel);
    return Number(selectedService?.priceGel ?? 0);
  }, [priceQuote, selectedService]);

  useEffect(() => {
    loadCars();
    loadServices();
    loadTopWashers();

    const savedLocation = localStorage.getItem("customer_saved_location");
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);

        if (parsed.addressForm) {
          setAddressForm(parsed.addressForm);
        }

        if (parsed.coords) {
          setManualCoords(parsed.coords);
          setLocMode("MANUAL");
          setManualSaved(true);
        }

        if (parsed.manualGeoName) {
          setManualGeoName(parsed.manualGeoName);
        }
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedService || !currentCoords) {
      setPriceQuote(null);
      return;
    }

    const t = setTimeout(() => {
      loadPriceQuote();
    }, 500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService?.id, currentCoords?.lat, currentCoords?.lng]);

  function saveLocationLocally(params: {
    addressForm: AddressForm;
    coords: { lat: number; lng: number };
    manualGeoName?: string;
  }) {
    localStorage.setItem(
      "customer_saved_location",
      JSON.stringify({
        addressForm: params.addressForm,
        coords: params.coords,
        manualGeoName: params.manualGeoName || "",
        savedAt: new Date().toISOString(),
      }),
    );
  }

async function loadPriceQuote() {
  if (!selectedService || !currentCoords) {
    setPriceQuote(null);
    return;
  }

  try {
    setPriceQuoteLoading(true);
    setPriceQuoteErr("");

    if (isPreviewSession()) {
      setPriceQuote({
        basePriceGel: Number(selectedService.priceGel),
        distanceKm: 2.4,
        distancePriceGel: 5,
        totalPriceGel: Number(selectedService.priceGel) + 5,
        nearestWasherId: 1,
        source: "AVAILABLE_WASHER",
        hasNearbyOnlineWasher: true,
      });
      setShowNoWasherDialog(false);
      return;
    }

    const { data } = await api.post<PriceQuote>(
      "/orders/price-quote",
      {
        serviceId: selectedService.id,
        lat: currentCoords.lat,
        lng: currentCoords.lng,
      },
    );

    setPriceQuote(data);

    if (
      data.hasNearbyOnlineWasher === false
    ) {
      setShowNoWasherDialog(true);
    } else {
      setShowNoWasherDialog(false);
    }
  } catch (e: any) {
    setPriceQuote(null);

    setPriceQuoteErr(
      e?.response?.data?.message ||
        e?.message ||
        "Failed to calculate price.",
    );
  } finally {
    setPriceQuoteLoading(false);
  }
}

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
      prev.map((c) => (c.id === activeCar.id ? { ...c, imageDataUrl: dataUrl } : c)),
    );
  }

  async function loadCars() {
    setCarsErr("");
    setCarsLoading(true);
    try {
      if (isPreviewSession()) {
        const demoCars: Car[] = [
          {
            id: 1,
            ownerId: 0,
            brand: "Toyota",
            model: "Prius",
            color: "Silver",
            plateNumber: "TB-123",
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            nickname: "Toyota Prius",
          },
        ];
        setCars(demoCars);
        setActiveCarId(1);
        return;
      }

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
      if (isPreviewSession()) {
        const demoServices: Service[] = [
          {
            id: 1,
            name: "Express exterior",
            description: "Quick rinse, foam, and dry — great for weekly upkeep.",
            priceGel: 25,
            durationMin: 25,
            isActive: true,
          },
          {
            id: 2,
            name: "Full clean",
            description: "Exterior + vacuum interior. Our most booked wash.",
            priceGel: 45,
            durationMin: 45,
            isActive: true,
          },
          {
            id: 3,
            name: "Detail polish",
            description: "Deep clean with polish for a showroom finish.",
            priceGel: 80,
            durationMin: 90,
            isActive: true,
          },
        ];
        setServices(demoServices);
        setServiceId(2);
        return;
      }

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
            : c,
        ),
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
      setPriceQuote(null);
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

          const updatedAddressForm = {
            ...addressForm,
            city: rev.form.city || addressForm.city,
            street: rev.form.street || addressForm.street,
            building: rev.form.building || addressForm.building,
          };

          setAddressForm(updatedAddressForm);
          setManualGeoName(rev.displayName || "");

          saveLocationLocally({
            addressForm: updatedAddressForm,
            coords,
            manualGeoName: rev.displayName || "",
          });

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
      { enableHighAccuracy: true, timeout: 10000 },
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

      const coords = { lat: geo.lat, lng: geo.lng };

      setManualCoords(coords);
      setManualGeoName(geo.displayName || "");
      setManualSaved(true);

      saveLocationLocally({
        addressForm,
        coords,
        manualGeoName: geo.displayName || "",
      });

      try {
        await api.post("/users/me/location", coords);
      } catch {
        // Local location is enough for booking / preview
      }
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
      notifyWhenWasherAvailable,

      paymentMode,
      ...(paymentMode === "DIRECT" || paymentMode === "CASH"
        ? { price: String(finalWashPrice) }
        : {}),
    };
  }

  async function onWashNowDirect() {
    try {
      setWashLoading(true);

      const payload = await buildOrderPayload("DIRECT");
      const { data } = await api.post<{ id: number }>("/orders", payload);

      router.push(`/customer/pay/order/${data.id}`);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to create direct order.");
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
      alert(e?.response?.data?.message || e?.message || "Failed to create credit order.");
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
      alert(e?.response?.data?.message || e?.message || "Failed to create cash order.");
    } finally {
      setCashWashLoading(false);
    }
  }

  async function onBookWash() {
    if (isPreviewSession()) {
      if (!canBook) return;
      setWashLoading(true);
      setTimeout(() => {
        setWashLoading(false);
        router.push("/customer/booked");
      }, 450);
      return;
    }
    if (payMethod === "CREDIT") return onWashNowCredits();
    if (payMethod === "CASH") return onWashNowCash();
    return onWashNowDirect();
  }

  const bookLabel = (() => {
    if (washLoading) return "Opening payment…";
    if (creditWashLoading) return "Using credits…";
    if (cashWashLoading) return "Booking cash wash…";
    if (payMethod === "CREDIT") return "Book with credits";
    if (payMethod === "CASH") return "Book · pay with cash";
    return `Book wash · ${finalWashPrice || "—"} GEL`;
  })();

  return (
    <div style={S.page}>
      {showNoWasherDialog && (
        <div style={S.modalOverlay}>
          <div style={S.modalCard}>
            <div style={S.modalIcon}>○</div>
            <h2 style={S.modalTitle}>No washer nearby right now</h2>
            <p style={S.modalText}>
              We can still take your booking and notify you as soon as someone is free nearby.
            </p>
            <div style={S.modalActions}>
              <button
                style={S.modalSecondaryBtn}
                onClick={() => {
                  setNotifyWhenWasherAvailable(false);
                  setShowNoWasherDialog(false);
                }}
              >
                Continue anyway
              </button>
              <button
                style={S.modalPrimaryBtn}
                onClick={() => {
                  setNotifyWhenWasherAvailable(true);
                  setShowNoWasherDialog(false);
                }}
              >
                Notify me
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={S.header}>
        <div>
          <div style={S.brand}>Tempi</div>
          <p style={S.tagline}>A wash that comes to you.</p>
        </div>
        <nav style={S.nav}>
          <a style={S.navLink} href="/orders/my">
            My orders
          </a>
          <a style={S.navLink} href="/subscriptions">
            Plans
          </a>
          <a style={S.navLink} href="/customer/credits">
            Credits
          </a>
        </nav>
      </header>

      <div style={S.shell}>
        <div style={S.flow}>
          {/* Step 1 — Car */}
          <section style={S.step}>
            <div style={S.stepHead}>
              <span style={S.stepNum}>1</span>
              <div>
                <h2 style={S.stepTitle}>Your car</h2>
                <p style={S.stepHint}>Pick the vehicle you want washed.</p>
              </div>
              <button style={S.textBtn} onClick={addCar} type="button">
                + Add
              </button>
            </div>

            {carsLoading ? <div style={S.muted}>Loading your cars…</div> : null}
            {carsErr ? <div style={S.errorText}>{carsErr}</div> : null}

            {!cars.length && !carsLoading ? (
              <button style={S.emptyCta} onClick={addCar} type="button">
                Add your first car
              </button>
            ) : (
              <div style={S.carList}>
                {cars.map((c) => {
                  const active = c.id === activeCarId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCarId(c.id)}
                      style={{
                        ...S.carChip,
                        ...(active ? S.carChipActive : {}),
                      }}
                    >
                      <span style={S.carChipName}>{c.nickname || prettyCarName(c)}</span>
                      {c.plateNumber ? (
                        <span style={S.carChipMeta}>{c.plateNumber}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {activeCar ? (
              <div style={S.softPanel}>
                <div style={S.softPanelRow}>
                  <div style={S.carPreview}>
                    {activeCar.imageDataUrl ? (
                      <img src={activeCar.imageDataUrl} alt="" style={S.carThumb} />
                    ) : (
                      <div style={S.carThumbEmpty}>No photo</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.carSummaryName}>{prettyCarName(activeCar)}</div>
                    <div style={S.mutedSmall}>
                      {activeCar.color ? `${activeCar.color} · ` : ""}
                      Tap edit only if details need a tweak.
                    </div>
                    <div style={S.inlineActions}>
                      <button style={S.ghostBtn} type="button" onClick={pickCarImage}>
                        Photo
                      </button>
                      <button
                        style={S.ghostBtn}
                        type="button"
                        onClick={() => setEditCarOpen((v) => !v)}
                      >
                        {editCarOpen ? "Hide details" : "Edit details"}
                      </button>
                      <button
                        style={S.dangerGhost}
                        type="button"
                        onClick={() => deleteCar(activeCar.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={onCarImageSelected}
                />

                {editCarOpen ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={S.row2}>
                      <div>
                        <div style={S.label}>Brand</div>
                        <input
                          style={S.input}
                          value={activeCar.brand || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCars((prev) =>
                              prev.map((c) => (c.id === activeCar.id ? { ...c, brand: v } : c)),
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
                              prev.map((c) => (c.id === activeCar.id ? { ...c, model: v } : c)),
                            );
                          }}
                          onBlur={() => updateCarPatch(activeCar.id, { model: activeCar.model })}
                          placeholder="Prius"
                        />
                      </div>
                    </div>
                    <div style={{ ...S.row2, marginTop: 10 }}>
                      <div>
                        <div style={S.label}>Plate</div>
                        <input
                          style={S.input}
                          value={activeCar.plateNumber || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCars((prev) =>
                              prev.map((c) =>
                                c.id === activeCar.id ? { ...c, plateNumber: v } : c,
                              ),
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
                        <div style={S.label}>Color</div>
                        <input
                          style={S.input}
                          value={activeCar.color || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCars((prev) =>
                              prev.map((c) => (c.id === activeCar.id ? { ...c, color: v } : c)),
                            );
                          }}
                          onBlur={() =>
                            updateCarPatch(activeCar.id, { color: activeCar.color || null })
                          }
                          placeholder="Black"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Step 2 — Location */}
          <section style={S.step}>
            <div style={S.stepHead}>
              <span style={S.stepNum}>2</span>
              <div>
                <h2 style={S.stepTitle}>Where should we come?</h2>
                <p style={S.stepHint}>Use GPS for the fastest booking.</p>
              </div>
            </div>

            <button
              style={S.primaryBig}
              type="button"
              onClick={useGpsLocation}
              disabled={gpsLoading}
            >
              {gpsLoading ? "Finding you…" : "Use my current location"}
            </button>

            <button
              style={S.secondaryBig}
              type="button"
              onClick={() => {
                setLocMode("MANUAL");
                setGpsError("");
              }}
            >
              Enter address instead
            </button>

            <div style={S.locationSummary}>
              <div style={S.locationDot} />
              <div style={{ minWidth: 0 }}>
                <div style={S.label}>Wash location</div>
                <div style={S.locationValue}>{currentAddressLabel}</div>
                {hasLocation ? (
                  <div style={S.okBadge}>Ready · washer can find you</div>
                ) : (
                  <div style={S.warnBadge}>Location still needed</div>
                )}
              </div>
            </div>

            {(locMode === "MANUAL" || !hasLocation) && (
              <div style={{ marginTop: 14 }}>
                <div style={S.row2}>
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
                    <div style={S.label}>Building</div>
                    <input
                      style={S.input}
                      value={addressForm.building}
                      onChange={(e) => updateAddressField("building", e.target.value)}
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <div style={S.label}>Comment for washer</div>
                    <input
                      style={S.input}
                      value={addressForm.comment}
                      onChange={(e) => updateAddressField("comment", e.target.value)}
                      placeholder="Call when you arrive"
                    />
                  </div>
                </div>

                <button
                  style={S.textBtn}
                  type="button"
                  onClick={() => setShowAddressExtras((v) => !v)}
                >
                  {showAddressExtras ? "Hide entrance details" : "Add entrance / floor / apt"}
                </button>

                {showAddressExtras ? (
                  <div style={{ ...S.row2, marginTop: 10 }}>
                    <div>
                      <div style={S.label}>Entrance</div>
                      <input
                        style={S.input}
                        value={addressForm.entrance}
                        onChange={(e) => updateAddressField("entrance", e.target.value)}
                        placeholder="A"
                      />
                    </div>
                    <div>
                      <div style={S.label}>Floor</div>
                      <input
                        style={S.input}
                        value={addressForm.floor}
                        onChange={(e) => updateAddressField("floor", e.target.value)}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <div style={S.label}>Apartment</div>
                      <input
                        style={S.input}
                        value={addressForm.apartment}
                        onChange={(e) => updateAddressField("apartment", e.target.value)}
                        placeholder="23"
                      />
                    </div>
                  </div>
                ) : null}

                <button
                  style={{ ...S.secondaryBig, marginTop: 12 }}
                  type="button"
                  onClick={saveManualLocation}
                  disabled={manualLoading}
                >
                  {manualLoading ? "Saving address…" : "Save this address"}
                </button>
              </div>
            )}

            {gpsError ? <div style={S.errorText}>{gpsError}</div> : null}
            {manualError ? <div style={S.errorText}>{manualError}</div> : null}
          </section>

          {/* Step 3 — Service */}
          <section style={S.step}>
            <div style={S.stepHead}>
              <span style={S.stepNum}>3</span>
              <div>
                <h2 style={S.stepTitle}>Choose a wash</h2>
                <p style={S.stepHint}>Clear prices. No surprises.</p>
              </div>
            </div>

            {servicesLoading ? <div style={S.muted}>Loading services…</div> : null}
            {servicesErr ? <div style={S.errorText}>{servicesErr}</div> : null}

            <div style={S.serviceList}>
              {services.map((s) => {
                const active = s.id === serviceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(s.id)}
                    style={{
                      ...S.serviceTile,
                      ...(active ? S.serviceTileActive : {}),
                    }}
                  >
                    <div style={S.serviceTop}>
                      <span style={S.serviceName}>{s.name}</span>
                      <span style={S.servicePrice}>{s.priceGel} GEL</span>
                    </div>
                    <div style={S.serviceMeta}>{s.durationMin} min</div>
                    {s.description ? (
                      <div style={S.serviceDesc}>{s.description}</div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {!services.length && !servicesLoading ? (
              <div style={S.muted}>No services available yet. Please check back soon.</div>
            ) : null}

            <div style={S.priceCard}>
              <div style={S.priceRow}>
                <span>Service</span>
                <strong>{selectedService?.priceGel ?? "—"} GEL</strong>
              </div>
              <div style={S.priceRow}>
                <span>Travel</span>
                <strong>
                  {priceQuoteLoading
                    ? "…"
                    : priceQuote?.distancePriceGel != null
                      ? `${priceQuote.distancePriceGel} GEL`
                      : "0 GEL"}
                </strong>
              </div>
              <div style={S.priceTotal}>
                <span>Total</span>
                <strong>{finalWashPrice || "—"} GEL</strong>
              </div>
              {priceQuote?.distanceKm != null ? (
                <div style={S.mutedSmall}>
                  Nearest washer about {priceQuote.distanceKm.toFixed(1)} km away
                </div>
              ) : null}
              {priceQuote?.message ? (
                <div style={S.mutedSmall}>{priceQuote.message}</div>
              ) : null}
              {priceQuoteErr ? <div style={S.errorText}>{priceQuoteErr}</div> : null}
            </div>
          </section>

          {/* Step 4 — Pay */}
          <section style={S.step}>
            <div style={S.stepHead}>
              <span style={S.stepNum}>4</span>
              <div>
                <h2 style={S.stepTitle}>How will you pay?</h2>
                <p style={S.stepHint}>One tap to confirm — we handle the rest.</p>
              </div>
            </div>

            <div style={S.payList}>
              {(
                [
                  {
                    id: "DIRECT" as const,
                    title: "Pay now",
                    desc: "Card / PayPal — secure checkout",
                  },
                  {
                    id: "CREDIT" as const,
                    title: "Subscription credits",
                    desc: "Use washes from your plan",
                  },
                  {
                    id: "CASH" as const,
                    title: "Cash to washer",
                    desc: "Pay when the wash is done",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPayMethod(opt.id)}
                  style={{
                    ...S.payTile,
                    ...(payMethod === opt.id ? S.payTileActive : {}),
                  }}
                >
                  <div style={S.payTitle}>{opt.title}</div>
                  <div style={S.payDesc}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Washers — secondary, calm */}
          <section style={S.sideSection}>
            <div style={S.stepHead}>
              <div>
                <h2 style={S.sideTitle}>Trusted washers nearby</h2>
                <p style={S.stepHint}>Highly rated people who already work with Tempi.</p>
              </div>
            </div>

            {washersLoading ? (
              <div style={S.muted}>Loading…</div>
            ) : (
              <div style={S.washersRow}>
                {washers.slice(0, 4).map((w) => (
                  <div key={w.id} style={S.washerPill}>
                    <div style={S.washerName}>{w.fullName}</div>
                    <div style={S.washerMeta}>
                      {w.avgRating.toFixed(1)} · {w.totalReviews} reviews
                      {typeof w.distanceKm === "number"
                        ? ` · ${w.distanceKm.toFixed(1)} km`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div style={S.footerLinks}>
            <a style={S.navLink} href="/washer/register-washer">
              Work as a washer
            </a>
          </div>
        </div>
      </div>

      <div style={S.stickyBar}>
        <div style={S.stickyInner}>
          <div style={S.stickyMeta}>
            <div style={S.stickyPrice}>{finalWashPrice || "—"} GEL</div>
            <div style={S.stickySub}>
              {!activeCar
                ? "Add a car to continue"
                : !hasLocation
                  ? "Set your location"
                  : !selectedService
                    ? "Choose a service"
                    : payMethod === "CASH"
                      ? "Cash when finished"
                      : payMethod === "CREDIT"
                        ? "Using plan credits"
                        : "Secure payment next"}
            </div>
          </div>
          <button
            style={{
              ...S.stickyCta,
              ...(!canBook ? S.stickyCtaDisabled : {}),
            }}
            type="button"
            disabled={!canBook}
            onClick={onBookWash}
          >
            {bookLabel}
          </button>
        </div>
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
    padding: "20px 16px 120px",
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
  },
  header: {
    maxWidth: 720,
    margin: "0 auto 22px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  brand: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(40px, 8vw, 56px)",
    fontWeight: 600,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    margin: 0,
  },
  tagline: {
    margin: "8px 0 0",
    color: "var(--ink-soft)",
    fontSize: 16,
  },
  nav: { display: "flex", gap: 8, flexWrap: "wrap" },
  navLink: {
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.7)",
    border: "1px solid var(--line)",
    fontWeight: 600,
    fontSize: 14,
    color: "var(--ink)",
  },
  shell: { maxWidth: 720, margin: "0 auto" },
  flow: { display: "grid", gap: 16 },
  step: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    padding: 20,
    boxShadow: "var(--shadow)",
  },
  stepHead: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 12,
    background: "var(--accent-soft)",
    color: "var(--accent-ink)",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    flex: "0 0 32px",
    marginTop: 2,
  },
  stepTitle: { margin: 0, fontSize: 20, fontWeight: 750, letterSpacing: "-0.02em" },
  stepHint: { margin: "4px 0 0", color: "var(--ink-soft)", fontSize: 14 },
  textBtn: {
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: "var(--accent)",
    fontWeight: 700,
    cursor: "pointer",
    padding: "6px 0",
  },
  muted: { color: "var(--ink-soft)", marginTop: 4 },
  mutedSmall: { color: "var(--ink-soft)", marginTop: 8, fontSize: 13, lineHeight: 1.4 },
  errorText: { marginTop: 10, color: "var(--danger)", fontSize: 14 },
  carList: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  carChip: {
    border: "1px solid var(--line)",
    background: "var(--surface-2)",
    borderRadius: 16,
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left",
    minWidth: 120,
  },
  carChipActive: {
    borderColor: "var(--accent)",
    background: "var(--accent-soft)",
    boxShadow: "inset 0 0 0 1px var(--accent)",
  },
  carChipName: { display: "block", fontWeight: 700, fontSize: 14 },
  carChipMeta: { display: "block", marginTop: 4, fontSize: 12, color: "var(--ink-soft)" },
  emptyCta: {
    width: "100%",
    padding: 18,
    borderRadius: 16,
    border: "1px dashed var(--accent)",
    background: "var(--accent-soft)",
    color: "var(--accent-ink)",
    fontWeight: 750,
    cursor: "pointer",
  },
  softPanel: {
    marginTop: 4,
    padding: 14,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
  },
  softPanelRow: { display: "flex", gap: 12, alignItems: "center" },
  carPreview: { flex: "0 0 72px" },
  carThumb: {
    width: 72,
    height: 72,
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid var(--line)",
  },
  carThumbEmpty: {
    width: 72,
    height: 72,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    border: "1px dashed var(--line)",
    fontSize: 11,
    color: "var(--ink-soft)",
    textAlign: "center",
    padding: 6,
  },
  carSummaryName: { fontWeight: 750, fontSize: 16 },
  inlineActions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  ghostBtn: {
    border: "1px solid var(--line)",
    background: "#fff",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 650,
    cursor: "pointer",
    fontSize: 13,
  },
  dangerGhost: {
    border: "1px solid rgba(180,35,24,0.25)",
    background: "#fff",
    color: "var(--danger)",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 650,
    cursor: "pointer",
    fontSize: 13,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--ink-soft)",
    marginBottom: 6,
    letterSpacing: "0.02em",
  },
  input: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid var(--line)",
    background: "#fff",
    color: "var(--ink)",
    outline: "none",
    minWidth: 0,
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
  },
  primaryBig: {
    width: "100%",
    padding: "16px 18px",
    borderRadius: 16,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 750,
    fontSize: 16,
    cursor: "pointer",
  },
  secondaryBig: {
    width: "100%",
    marginTop: 10,
    padding: "14px 18px",
    borderRadius: 16,
    border: "1px solid var(--line)",
    background: "#fff",
    color: "var(--ink)",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  locationSummary: {
    marginTop: 16,
    display: "flex",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "var(--accent)",
    marginTop: 6,
    flex: "0 0 12px",
  },
  locationValue: {
    marginTop: 4,
    lineHeight: 1.45,
    wordBreak: "break-word",
    fontWeight: 600,
  },
  okBadge: {
    display: "inline-block",
    marginTop: 8,
    padding: "4px 10px",
    borderRadius: 999,
    background: "var(--accent-soft)",
    color: "var(--accent-ink)",
    fontSize: 12,
    fontWeight: 700,
  },
  warnBadge: {
    display: "inline-block",
    marginTop: 8,
    padding: "4px 10px",
    borderRadius: 999,
    background: "#fff1e8",
    color: "var(--warn)",
    fontSize: 12,
    fontWeight: 700,
  },
  serviceList: { display: "grid", gap: 10 },
  serviceTile: {
    textAlign: "left",
    padding: 16,
    borderRadius: 16,
    border: "1px solid var(--line)",
    background: "var(--surface-2)",
    cursor: "pointer",
  },
  serviceTileActive: {
    borderColor: "var(--accent)",
    background: "var(--accent-soft)",
    boxShadow: "inset 0 0 0 1px var(--accent)",
  },
  serviceTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "baseline",
  },
  serviceName: { fontWeight: 750, fontSize: 16 },
  servicePrice: { fontWeight: 800, color: "var(--accent-ink)" },
  serviceMeta: { marginTop: 4, fontSize: 13, color: "var(--ink-soft)" },
  serviceDesc: { marginTop: 8, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4 },
  priceCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid var(--line)",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    color: "var(--ink-soft)",
    fontSize: 14,
  },
  priceTotal: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTop: "1px solid var(--line)",
    fontSize: 18,
    fontWeight: 750,
  },
  payList: { display: "grid", gap: 10 },
  payTile: {
    textAlign: "left",
    padding: 16,
    borderRadius: 16,
    border: "1px solid var(--line)",
    background: "var(--surface-2)",
    cursor: "pointer",
  },
  payTileActive: {
    borderColor: "var(--accent)",
    background: "var(--accent-soft)",
    boxShadow: "inset 0 0 0 1px var(--accent)",
  },
  payTitle: { fontWeight: 750, fontSize: 15 },
  payDesc: { marginTop: 4, fontSize: 13, color: "var(--ink-soft)" },
  sideSection: {
    padding: "8px 4px 0",
  },
  sideTitle: { margin: 0, fontSize: 18, fontWeight: 750 },
  washersRow: { display: "grid", gap: 8 },
  washerPill: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.65)",
    border: "1px solid var(--line)",
  },
  washerName: { fontWeight: 700 },
  washerMeta: { marginTop: 4, fontSize: 13, color: "var(--ink-soft)" },
  footerLinks: { padding: "8px 0 24px", textAlign: "center" },
  stickyBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(14px)",
    borderTop: "1px solid var(--line)",
  },
  stickyInner: {
    maxWidth: 720,
    margin: "0 auto",
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  stickyMeta: { flex: 1, minWidth: 0 },
  stickyPrice: { fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" },
  stickySub: { fontSize: 12, color: "var(--ink-soft)", marginTop: 2 },
  stickyCta: {
    border: "none",
    borderRadius: 16,
    padding: "16px 20px",
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 750,
    fontSize: 15,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  stickyCtaDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(19,37,43,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    background: "#fff",
    color: "var(--ink)",
    padding: 24,
    boxShadow: "var(--shadow)",
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    background: "var(--accent-soft)",
    color: "var(--accent)",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    marginBottom: 14,
    fontWeight: 800,
  },
  modalTitle: { margin: 0, fontSize: 22, fontWeight: 750, letterSpacing: "-0.02em" },
  modalText: { marginTop: 10, color: "var(--ink-soft)", lineHeight: 1.5, fontSize: 14 },
  modalActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 22,
  },
  modalSecondaryBtn: {
    border: "1px solid var(--line)",
    background: "#fff",
    color: "var(--ink)",
    borderRadius: 14,
    padding: "12px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  modalPrimaryBtn: {
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    borderRadius: 14,
    padding: "12px 10px",
    fontWeight: 750,
    cursor: "pointer",
  },
};