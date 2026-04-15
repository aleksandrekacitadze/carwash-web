"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Car = {
  id: number;
  brand: string;
  model: string;
  color?: string | null;
  plateNumber?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Car[]>("/cars/me");
      setCars(data);
    } catch (e: any) {
      console.log(e?.response?.data || e);
      alert("Failed to load /cars/me. Check JWT + backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addCar() {
    if (!brand.trim() || !model.trim()) {
      return alert("Brand and model are required.");
    }

    try {
      await api.post("/cars", {
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim() || undefined,
        plateNumber: plateNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setBrand("");
      setModel("");
      setColor("");
      setPlateNumber("");
      setNotes("");

      await load();
      alert("✅ Car added");
    } catch (e: any) {
      console.log(e?.response?.data || e);
      alert("❌ Failed to add car (DTO validation?)");
    }
  }

  async function removeCar(id: number) {
    if (!confirm("Delete this car?")) return;
    try {
      await api.delete(`/cars/${id}`);
      await load();
    } catch (e: any) {
      console.log(e?.response?.data || e);
      alert("❌ Failed to delete car");
    }
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.title}>My Cars</h1>
        <a style={S.btn} href="/customer/dashboard">← Back to Dashboard</a>
      </header>

      <div style={S.grid}>
        <section style={S.card}>
          <h2 style={S.cardTitle}>Add a car</h2>

          <div style={S.row2}>
            <input style={S.input} placeholder="Brand (Toyota)" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <input style={S.input} placeholder="Model (Camry)" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>

          <div style={S.row2}>
            <input style={S.input} placeholder="Color (optional)" value={color} onChange={(e) => setColor(e.target.value)} />
            <input style={S.input} placeholder="Plate number (optional)" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
          </div>

          <input style={S.input} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <button style={S.primaryBtn} onClick={addCar}>
            Add Car
          </button>

          <div style={S.mutedSmall}>
            Backend: <b>POST /cars</b> • Brand+Model required.
          </div>
        </section>

        <section style={S.card}>
          <h2 style={S.cardTitle}>Saved cars</h2>

          {loading ? <div style={S.muted}>Loading…</div> : null}

          {cars.length === 0 && !loading ? (
            <div style={S.muted}>No cars yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {cars.map((c) => (
                <div key={c.id} style={S.carItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>
                      {c.brand} {c.model}
                      {c.plateNumber ? <span style={{ opacity: 0.8 }}> • {c.plateNumber}</span> : null}
                    </div>

                    <button style={S.dangerBtn} onClick={() => removeCar(c.id)}>
                      Delete
                    </button>
                  </div>

                  <div style={S.meta}>
                    {c.color ? <>Color: <b>{c.color}</b> • </> : null}
                    Id: <b>{c.id}</b>
                  </div>

                  {c.notes ? <div style={S.meta}>Notes: <b>{c.notes}</b></div> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    background: "#0b0f19",
    color: "#fff",
    fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: 26, fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 900 },

  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 },

  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
    marginTop: 12,
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
    marginTop: 12,
  },

  btn: {
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

  muted: { opacity: 0.8, marginTop: 10 },
  mutedSmall: { opacity: 0.7, marginTop: 10, fontSize: 12 },

  carItem: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 12,
  },
  meta: { marginTop: 8, opacity: 0.9 },

  dangerBtn: {
    background: "rgba(255,100,100,0.18)",
    border: "1px solid rgba(255,100,100,0.35)",
    color: "#fff",
    padding: "8px 10px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
    height: 38,
  },
};
