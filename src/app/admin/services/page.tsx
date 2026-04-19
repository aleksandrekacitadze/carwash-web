"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

type ServiceItem = {
  id: number;
  name: string;
  description?: string | null;
  priceGel: number;
  durationMin: number;
  isActive: boolean;
};

type CreateServiceDto = {
  name: string;
  description?: string;
  priceGel: number;
  durationMin: number;
  isActive?: boolean;
};

export default function AdminServicesPage() {
  const router = useRouter();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CreateServiceDto>({
    name: "",
    description: "",
    priceGel: 0,
    durationMin: 30,
    isActive: true,
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  async function loadServices() {
    try {
      setLoading(true);
      setErr("");
      const { data } = await api.get<ServiceItem[]>("/admin/services");
      setServices(data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  function resetForm() {
    setForm({
      name: "",
      description: "",
      priceGel: 0,
      durationMin: 30,
      isActive: true,
    });
    setEditingId(null);
  }

  function startEdit(service: ServiceItem) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      priceGel: service.priceGel,
      durationMin: service.durationMin,
      isActive: service.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitForm() {
    setErr("");

    const payload: CreateServiceDto = {
      name: form.name.trim(),
      description: form.description?.trim() || "",
      priceGel: Number(form.priceGel),
      durationMin: Number(form.durationMin),
      isActive: !!form.isActive,
    };

    if (payload.name.length < 2) {
      setErr("Service name is too short.");
      return;
    }

    if (!Number.isFinite(payload.priceGel) || payload.priceGel < 0) {
      setErr("Price must be 0 or more.");
      return;
    }

    if (!Number.isFinite(payload.durationMin) || payload.durationMin < 1) {
      setErr("Duration must be at least 1 minute.");
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        await api.patch(`/admin/services/${editingId}`, payload);
      } else {
        await api.post("/admin/services", payload);
      }

      resetForm();
      await loadServices();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to save service.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(service: ServiceItem) {
    try {
      setWorkingId(service.id);
      await api.patch(`/admin/services/${service.id}/active`, {
        isActive: !service.isActive,
      });
      await loadServices();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to change service status.");
    } finally {
      setWorkingId(null);
    }
  }

  async function removeService(service: ServiceItem) {
    const ok = window.confirm(`Delete service "${service.name}"?`);
    if (!ok) return;

    try {
      setWorkingId(service.id);
      await api.delete(`/admin/services/${service.id}`);
      await loadServices();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to delete service.");
    } finally {
      setWorkingId(null);
    }
  }

  const activeCount = useMemo(
    () => services.filter((s) => s.isActive).length,
    [services]
  );

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>Admin Panel</div>
          <h1 style={S.title}>Services</h1>
          <div style={S.sub}>
            Manage car wash services, pricing, duration, and active status.
          </div>
        </div>

        <div style={S.headerActions}>
          <button style={S.btnGhost} onClick={() => router.push("/admin")}>
            Dashboard
          </button>
          <button style={S.btnGhost} onClick={loadServices}>
            Refresh
          </button>
        </div>
      </header>

      <section style={S.statsRow}>
        <div style={S.statCard}>
          <div style={S.statLabel}>Total</div>
          <div style={S.statValue}>{services.length}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Active</div>
          <div style={S.statValue}>{activeCount}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Inactive</div>
          <div style={S.statValue}>{services.length - activeCount}</div>
        </div>
      </section>

      {err ? <section style={S.card}><b>⚠️</b> {err}</section> : null}

      <section style={S.card}>
        <div style={S.sectionTop}>
          <h2 style={S.cardTitle}>{editingId ? "Edit Service" : "Create Service"}</h2>
          {editingId ? (
            <button style={S.btnGhost} onClick={resetForm}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        <div style={S.formGrid}>
          <div>
            <div style={S.label}>Service Name</div>
            <input
              style={S.input}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Exterior Wash"
            />
          </div>

          <div>
            <div style={S.label}>Price (GEL)</div>
            <input
              style={S.input}
              type="number"
              min={0}
              value={form.priceGel}
              onChange={(e) =>
                setForm((p) => ({ ...p, priceGel: Number(e.target.value) }))
              }
              placeholder="15"
            />
          </div>

          <div>
            <div style={S.label}>Duration (minutes)</div>
            <input
              style={S.input}
              type="number"
              min={1}
              value={form.durationMin}
              onChange={(e) =>
                setForm((p) => ({ ...p, durationMin: Number(e.target.value) }))
              }
              placeholder="30"
            />
          </div>

          <div>
            <div style={S.label}>Status</div>
            <select
              style={S.input}
              value={form.isActive ? "active" : "inactive"}
              onChange={(e) =>
                setForm((p) => ({ ...p, isActive: e.target.value === "active" }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={S.label}>Description</div>
            <textarea
              style={{ ...S.input, minHeight: 110, resize: "vertical" }}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Describe what is included in this service..."
            />
          </div>
        </div>

        <div style={S.formActions}>
          <button style={S.btnPrimary} onClick={submitForm} disabled={submitting}>
            {submitting
              ? editingId
                ? "Saving..."
                : "Creating..."
              : editingId
              ? "Save Changes"
              : "Create Service"}
          </button>
        </div>
      </section>

      <section style={S.card}>
        <div style={S.sectionTop}>
          <h2 style={S.cardTitle}>All Services</h2>
        </div>

        {loading ? (
          <div style={S.empty}>Loading services…</div>
        ) : services.length === 0 ? (
          <div style={S.empty}>No services yet.</div>
        ) : (
          <div style={S.list}>
            {services.map((service) => (
              <div key={service.id} style={S.rowCard}>
                <div style={S.rowMain}>
                  <div style={S.rowTitleWrap}>
                    <div style={S.rowTitle}>{service.name}</div>
                    <span
                      style={{
                        ...S.statusPill,
                        ...(service.isActive ? S.statusActive : S.statusInactive),
                      }}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div style={S.rowMeta}>
                    Price: <b>{service.priceGel} GEL</b> • Duration:{" "}
                    <b>{service.durationMin} min</b>
                  </div>

                  <div style={S.rowDesc}>
                    {service.description?.trim() || "No description"}
                  </div>
                </div>

                <div style={S.rowActions}>
                  <button
                    style={S.btnSmall}
                    onClick={() => startEdit(service)}
                    disabled={workingId === service.id}
                  >
                    Edit
                  </button>

                  <button
                    style={S.btnSmall}
                    onClick={() => toggleActive(service)}
                    disabled={workingId === service.id}
                  >
                    {workingId === service.id
                      ? "Working..."
                      : service.isActive
                      ? "Deactivate"
                      : "Activate"}
                  </button>

                  <button
                    style={S.btnDanger}
                    onClick={() => removeService(service)}
                    disabled={workingId === service.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    fontSize: 12,
    width: "fit-content",
  },
  title: {
    margin: "8px 0 0",
    fontSize: 28,
    fontWeight: 950,
  },
  sub: {
    marginTop: 6,
    opacity: 0.82,
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },
  statLabel: {
    opacity: 0.8,
    fontSize: 12,
    fontWeight: 900,
  },
  statValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: 950,
  },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
  },
  sectionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
  },
  formActions: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
  },
  btnGhost: {
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
  },
  btnSmall: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },
  btnDanger: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#ff6363",
    color: "#230707",
    cursor: "pointer",
    fontWeight: 900,
  },

  list: {
    display: "grid",
    gap: 10,
  },
  rowCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    padding: 12,
    borderRadius: 16,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  rowMain: {
    flex: "1 1 320px",
    minWidth: 0,
  },
  rowTitleWrap: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  rowTitle: {
    fontWeight: 950,
    fontSize: 16,
  },
  rowMeta: {
    marginTop: 8,
    fontSize: 13,
    opacity: 0.88,
  },
  rowDesc: {
    marginTop: 8,
    fontSize: 13,
    opacity: 0.8,
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  rowActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  statusPill: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid transparent",
  },
  statusActive: {
    background: "rgba(60,255,177,0.12)",
    border: "1px solid rgba(60,255,177,0.24)",
    color: "#c8ffe7",
  },
  statusInactive: {
    background: "rgba(255,99,99,0.10)",
    border: "1px solid rgba(255,99,99,0.22)",
    color: "#ffd0d0",
  },

  empty: {
    opacity: 0.8,
    fontSize: 14,
  },
};