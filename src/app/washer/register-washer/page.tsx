"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type VerificationStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

type WasherProfile = {
  id: number;
  userId: number;
  fullName: string;
  city: string;
  vehicleType?: string | null;
  plateNumber?: string | null;
  notes?: string | null;

  contactPhone?: string | null;
  personalIdNumber?: string | null;

  verificationStatus: VerificationStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;

  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  selfieUrl?: string | null;
  driverLicenseUrl?: string | null;
  vehicleRegistrationUrl?: string | null;

  createdAt: string;
  updatedAt: string;
};

type FileKey =
  | "idFront"
  | "idBack"
  | "selfie"
  | "driverLicense"
  | "vehicleRegistration";

type UploadedUrls = Partial<Record<FileKey, string>>;

const REQUIRED_FILES: { key: FileKey; label: string; hint: string }[] = [
  { key: "idFront", label: "ID Front", hint: "Front side of your ID card" },
  { key: "idBack", label: "ID Back", hint: "Back side of your ID card" },
  {
    key: "selfie",
    label: "Selfie",
    hint: "A selfie holding your ID (or clear face selfie if you prefer)",
  },
  {
    key: "driverLicense",
    label: "Driver License",
    hint: "Photo of your driver license",
  },
  {
    key: "vehicleRegistration",
    label: "Vehicle Registration",
    hint: "Photo of vehicle registration document",
  },
];

function getProfileUrl(profile: WasherProfile | null, key: FileKey): string {
  if (!profile) return "";
  if (key === "idFront") return profile.idFrontUrl || "";
  if (key === "idBack") return profile.idBackUrl || "";
  if (key === "selfie") return profile.selfieUrl || "";
  if (key === "driverLicense") return profile.driverLicenseUrl || "";
  return profile.vehicleRegistrationUrl || "";
}

async function uploadImageToBackend(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<{ url: string }>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (!data?.url) {
    throw new Error("Upload failed: missing URL");
  }

  return data.url;
}

export default function RegisterWasherPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<WasherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("Tbilisi");
  const [vehicleType, setVehicleType] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [personalIdNumber, setPersonalIdNumber] = useState("");

  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<FileKey, string>>>({});
  const [uploadedUrls, setUploadedUrls] = useState<UploadedUrls>({});
  const [uploadingKey, setUploadingKey] = useState<FileKey | null>(null);

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function setFile(key: FileKey, file: File | null) {
    setErr("");

    setFiles((prev) => {
      const next = { ...prev };
      if (!file) delete next[key];
      else next[key] = file;
      return next;
    });

    setUploadedUrls((prev) => {
      const next = { ...prev };
      if (!file) delete next[key];
      return next;
    });

    setPreviews((prev) => {
      const next = { ...prev };
      const old = next[key];

      if (old && old.startsWith("blob:")) {
        URL.revokeObjectURL(old);
      }

      if (!file) {
        const existingProfileUrl = getProfileUrl(profile, key);
        if (existingProfileUrl) next[key] = existingProfileUrl;
        else delete next[key];
        return next;
      }

      next[key] = URL.createObjectURL(file);
      return next;
    });
  }

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((u) => {
        if (u && u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  }, [previews]);

  async function loadMyProfile() {
    setErr("");
    try {
      const { data } = await api.get<WasherProfile | null>("/washers/me");
      const p = data || null;
      setProfile(p);

      if (p?.fullName) setFullName(p.fullName);
      if (p?.city) setCity(p.city);
      if (p?.vehicleType) setVehicleType(p.vehicleType || "");
      if (p?.plateNumber) setPlateNumber(p.plateNumber || "");
      if (p?.notes) setNotes(p.notes || "");
      if (p?.contactPhone) setContactPhone(p.contactPhone || "");
      if (p?.personalIdNumber) setPersonalIdNumber(p.personalIdNumber || "");

      if (p) {
        const initialUrls: UploadedUrls = {
          idFront: p.idFrontUrl || "",
          idBack: p.idBackUrl || "",
          selfie: p.selfieUrl || "",
          driverLicense: p.driverLicenseUrl || "",
          vehicleRegistration: p.vehicleRegistrationUrl || "",
        };

        setUploadedUrls(initialUrls);
        setPreviews({
          idFront: p.idFrontUrl || "",
          idBack: p.idBackUrl || "",
          selfie: p.selfieUrl || "",
          driverLicense: p.driverLicenseUrl || "",
          vehicleRegistration: p.vehicleRegistrationUrl || "",
        });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || "";
      if (e?.response?.status === 404 || String(msg).toLowerCase().includes("not found")) {
        setProfile(null);
      } else {
        setErr(msg || e?.message || "Failed to load washer profile.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const banner = useMemo(() => {
    if (!profile) return null;

    if (profile.verificationStatus === "PENDING") {
      return {
        title: "Application received",
        sub: "We are reviewing your documents. This usually takes 24–72 hours.",
        tone: "PENDING" as const,
      };
    }

    if (profile.verificationStatus === "APPROVED") {
      return {
        title: "Approved ✅",
        sub: "You can start accepting jobs now.",
        tone: "APPROVED" as const,
      };
    }

    if (profile.verificationStatus === "REJECTED") {
      return {
        title: "Rejected",
        sub: profile.rejectionReason
          ? `Reason: ${profile.rejectionReason}`
          : "Your application was rejected.",
        tone: "REJECTED" as const,
      };
    }

    return {
      title: "Not submitted",
      sub: "Submit your application to start verification.",
      tone: "NONE" as const,
    };
  }, [profile]);

  const missingFiles = useMemo(() => {
    const missing: string[] = [];
    for (const f of REQUIRED_FILES) {
      const hasSelectedFile = !!files[f.key];
      const hasUploadedUrl = !!uploadedUrls[f.key];
      const hasExistingProfileUrl = !!getProfileUrl(profile, f.key);

      if (!hasSelectedFile && !hasUploadedUrl && !hasExistingProfileUrl) {
        missing.push(f.label);
      }
    }
    return missing;
  }, [files, uploadedUrls, profile]);

  const isWasher = !!profile;
  const isApproved = profile?.verificationStatus === "APPROVED";
  const isPending = profile?.verificationStatus === "PENDING";

  async function ensureFileUploaded(key: FileKey): Promise<string> {
    const existingUploaded = uploadedUrls[key];
    if (existingUploaded) return existingUploaded;

    const existingProfileUrl = getProfileUrl(profile, key);
    if (existingProfileUrl && !files[key]) return existingProfileUrl;

    const file = files[key];
    if (!file) {
      throw new Error(`Missing required file: ${key}`);
    }

    setUploadingKey(key);
    try {
      const url = await uploadImageToBackend(file);
      setUploadedUrls((prev) => ({ ...prev, [key]: url }));
      setPreviews((prev) => ({ ...prev, [key]: url }));
      return url;
    } finally {
      setUploadingKey(null);
    }
  }

  async function apply() {
    setErr("");

    const fn = fullName.trim();
    const c = city.trim();

    if (fn.length < 3) return setErr("Full name must be at least 3 characters.");
    if (c.length < 2) return setErr("City is required.");

    const phone = contactPhone.trim();
    if (phone && phone.length < 6) return setErr("Contact phone looks too short.");

    const pid = personalIdNumber.trim();
    if (pid && pid.length < 6) return setErr("Personal ID number looks too short.");

    if (!agree) return setErr("You must agree to the requirements.");

    if (missingFiles.length) {
      return setErr(`Please upload required documents: ${missingFiles.join(", ")}`);
    }

    try {
      setSubmitting(true);

      const [
        idFrontUrl,
        idBackUrl,
        selfieUrl,
        driverLicenseUrl,
        vehicleRegistrationUrl,
      ] = await Promise.all([
        ensureFileUploaded("idFront"),
        ensureFileUploaded("idBack"),
        ensureFileUploaded("selfie"),
        ensureFileUploaded("driverLicense"),
        ensureFileUploaded("vehicleRegistration"),
      ]);

      const payload = {
        fullName: fn,
        city: c,
        vehicleType: vehicleType.trim() || null,
        plateNumber: plateNumber.trim() || null,
        notes: notes.trim() || null,
        contactPhone: phone || null,
        personalIdNumber: pid || null,
        idFrontUrl,
        idBackUrl,
        selfieUrl,
        driverLicenseUrl,
        vehicleRegistrationUrl,
      };

      const { data } = await api.post<WasherProfile>("/washers/apply", payload);

      setProfile(data);
      setUploadedUrls({
        idFront: data.idFrontUrl || idFrontUrl,
        idBack: data.idBackUrl || idBackUrl,
        selfie: data.selfieUrl || selfieUrl,
        driverLicense: data.driverLicenseUrl || driverLicenseUrl,
        vehicleRegistration: data.vehicleRegistrationUrl || vehicleRegistrationUrl,
      });

      setPreviews({
        idFront: data.idFrontUrl || idFrontUrl,
        idBack: data.idBackUrl || idBackUrl,
        selfie: data.selfieUrl || selfieUrl,
        driverLicense: data.driverLicenseUrl || driverLicenseUrl,
        vehicleRegistration: data.vehicleRegistrationUrl || vehicleRegistrationUrl,
      });

      alert("Application sent ✅");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to apply.");
    } finally {
      setSubmitting(false);
    }
  }

  const disableSubmit =
    submitting ||
    (!!profile &&
      (profile.verificationStatus === "PENDING" ||
        profile.verificationStatus === "APPROVED"));

  if (loading) {
    return (
      <div style={S.page}>
        <section style={S.card}>Loading…</section>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.badge}>{isWasher ? "Washer Panel" : "Washer Registration"}</div>
          <h1 style={S.title}>{isWasher ? "Washer Dashboard" : "Become a Washer"}</h1>
          <div style={S.sub}>
            {isWasher
              ? "Manage your washer account, jobs, and orders."
              : "Upload documents → verification → start earning."}
          </div>
        </div>

        <div style={S.headerActions}>
          <button style={S.btnGhost} onClick={() => router.push("/")}>
            Customer
          </button>

          {isWasher ? (
            <>
              <button style={S.btnGhost} onClick={() => router.push("/washer/jobs")}>
                Available Jobs
              </button>
              <button style={S.btnGhost} onClick={() => router.push("/washer/my-orders")}>
                My Orders
              </button>
            </>
          ) : null}
        </div>
      </header>

      {banner ? (
        <section
          style={{
            ...S.banner,
            ...(banner.tone === "APPROVED"
              ? S.bannerOk
              : banner.tone === "REJECTED"
              ? S.bannerBad
              : banner.tone === "PENDING"
              ? S.bannerPending
              : S.bannerNeutral),
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18 }}>{banner.title}</div>
          <div style={{ opacity: 0.9, marginTop: 6 }}>{banner.sub}</div>

          {isApproved ? (
            <div style={S.bannerActions}>
              <button style={S.btnPrimaryHalf} onClick={() => router.push("/washer/jobs")}>
                Available Jobs
              </button>
              <button style={S.btnSoftHalf} onClick={() => router.push("/washer/my-orders")}>
                My Orders
              </button>
            </div>
          ) : null}

          {profile?.verificationStatus === "REJECTED" ? (
            <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12 }}>
              You can fix details and re-submit. New submission overwrites previous data.
            </div>
          ) : null}
        </section>
      ) : null}

      {err ? (
        <section style={S.card}>
          <b>⚠️</b> {err}
        </section>
      ) : null}

      {isWasher ? (
        <div style={S.grid}>
          <section style={S.card}>
            <h2 style={S.cardTitle}>Profile</h2>

            <div style={S.infoGrid}>
              <InfoBox label="Full name" value={profile?.fullName || "—"} />
              <InfoBox label="City" value={profile?.city || "—"} />
              <InfoBox label="Vehicle type" value={profile?.vehicleType || "—"} />
              <InfoBox label="Plate number" value={profile?.plateNumber || "—"} />
              <InfoBox label="Contact phone" value={profile?.contactPhone || "—"} />
              <InfoBox label="Submitted" value={profile?.submittedAt || "—"} />
            </div>

            {profile?.notes ? (
              <div style={S.noteBox}>
                <div style={S.label}>Notes</div>
                <div style={S.noteText}>{profile.notes}</div>
              </div>
            ) : null}

            {profile?.verificationStatus === "REJECTED" ? (
              <div style={S.warningBox}>
                <div style={S.label}>Rejection reason</div>
                <div style={S.noteText}>{profile.rejectionReason || "—"}</div>
              </div>
            ) : null}
          </section>

          <section style={S.card}>
            <h2 style={S.cardTitle}>Navigation</h2>

            <div style={S.navGrid}>
              <button
                style={{
                  ...S.navCard,
                  ...(isApproved ? {} : S.navCardDisabled),
                }}
                onClick={() => isApproved && router.push("/washer/jobs")}
                disabled={!isApproved}
              >
                <div style={S.navTitle}>Available Jobs</div>
                <div style={S.navSub}>
                  See open requested orders sorted for you.
                </div>
              </button>

              <button style={S.navCard} onClick={() => router.push("/washer/my-orders")}>
                <div style={S.navTitle}>My Orders</div>
                <div style={S.navSub}>
                  View all your assigned orders with current statuses.
                </div>
              </button>
            </div>

            {!isApproved ? (
              <div style={S.small}>
                {isPending
                  ? "Your application is pending. Job acceptance opens after approval."
                  : "Available jobs open after approval."}
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <div style={S.grid}>
          <section style={S.card}>
            <h2 style={S.cardTitle}>Requirements</h2>

            <div style={S.reqList}>
              <ReqItem
                title="Phone verified"
                desc="You must be logged in with verified phone number."
              />
              <ReqItem
                title="Vehicle info"
                desc="Vehicle type + optional plate number."
              />
              <ReqItem
                title="Identity check"
                desc="Upload ID + selfie + license + registration."
              />
              <ReqItem
                title="Quality"
                desc="Ratings matter. Low rating may pause your account."
              />
            </div>

            <div style={S.small}>
              Tip: take photos in good light, all text readable. Admin will reject blurry images.
            </div>
          </section>

          <section style={S.card}>
            <h2 style={S.cardTitle}>Application</h2>
            <div style={{ opacity: 0.8, marginTop: 6, fontSize: 12 }}>
              After approval, you can accept jobs. Status updates on refresh.
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <Field
                label="Full name"
                value={fullName}
                setValue={setFullName}
                placeholder="e.g. Giorgi K."
              />
              <Field label="City" value={city} setValue={setCity} placeholder="Tbilisi" />

              <div style={S.row2}>
                <div>
                  <div style={S.label}>Vehicle type (optional)</div>
                  <select
                    style={S.input}
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Car">Car</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Van">Van</option>
                  </select>
                </div>

                <div>
                  <div style={S.label}>Plate number (optional)</div>
                  <input
                    style={S.input}
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="ABC-123"
                  />
                </div>
              </div>

              <div style={S.row2}>
                <div>
                  <div style={S.label}>Contact phone (optional)</div>
                  <input
                    style={S.input}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+9955xxxxxxx"
                  />
                </div>
                <div>
                  <div style={S.label}>Personal ID number (optional)</div>
                  <input
                    style={S.input}
                    value={personalIdNumber}
                    onChange={(e) => setPersonalIdNumber(e.target.value)}
                    placeholder="Personal ID"
                  />
                </div>
              </div>

              <div>
                <div style={S.label}>Notes (optional)</div>
                <textarea
                  style={{ ...S.input, minHeight: 90, resize: "vertical" }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Experience, working hours, anything you want to add…"
                />
              </div>

              <div style={S.docsBox}>
                <div style={{ fontWeight: 950, marginBottom: 8 }}>Verification documents</div>

                <div style={S.docsGrid}>
                  {REQUIRED_FILES.map((f) => {
                    const hasSelectedFile = !!files[f.key];
                    const hasUploadedUrl = !!uploadedUrls[f.key];
                    const currentPreview = previews[f.key] || "";
                    const isUploading = uploadingKey === f.key;

                    return (
                      <div key={f.key} style={S.docCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 950 }}>{f.label}</div>
                            <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>
                              {f.hint}
                            </div>
                          </div>

                          {hasSelectedFile || hasUploadedUrl ? (
                            <div style={S.okPill}>
                              {isUploading ? "Uploading..." : "✓ Added"}
                            </div>
                          ) : (
                            <div style={S.needPill}>Required</div>
                          )}
                        </div>

                        {currentPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={currentPreview} alt={f.label} style={S.previewImg} />
                        ) : (
                          <div style={S.previewEmpty}>No image</div>
                        )}

                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <label style={S.fileBtn}>
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (file && file.size > 8 * 1024 * 1024) {
                                  setErr("Each image must be <= 8MB.");
                                  return;
                                }
                                setFile(f.key, file);
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            style={S.fileBtnSoft}
                            onClick={() => setFile(f.key, null)}
                            disabled={!Boolean(files[f.key] || uploadedUrls[f.key] || previews[f.key])}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {missingFiles.length ? (
                  <div style={{ marginTop: 10, color: "#ffb4b4", fontSize: 12 }}>
                    Missing: <b>{missingFiles.join(", ")}</b>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: "#c8ffe7", fontSize: 12 }}>
                    All required documents added ✅
                  </div>
                )}
              </div>

              <label style={S.checkboxRow}>
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  style={{ transform: "scale(1.2)" }}
                />
                <span style={{ fontWeight: 900 }}>
                  I confirm the information is correct and agree to verification.
                </span>
              </label>

              <button
                style={{
                  ...S.btnPrimary,
                  opacity: disableSubmit ? 0.65 : 1,
                  cursor: disableSubmit ? "not-allowed" : "pointer",
                }}
                onClick={apply}
                disabled={disableSubmit}
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>

              <button style={S.btnSoft} onClick={loadMyProfile}>
                Refresh status
              </button>

              <div style={S.small}>
                Files are uploaded through your backend, then Cloudinary URLs are saved in the washer profile.
                <div>
                  <code>POST /uploads/image</code> • <code>GET /washers/me</code> •{" "}
                  <code>POST /washers/apply</code>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ReqItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={S.reqItem}>
      <div style={S.reqIcon}>✓</div>
      <div>
        <div style={{ fontWeight: 950 }}>{title}</div>
        <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>{desc}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div style={S.label}>{label}</div>
      <input
        style={S.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.infoBox}>
      <div style={S.label}>{label}</div>
      <div style={S.infoValue}>{value}</div>
    </div>
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
    marginBottom: 12,
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
  title: { margin: 0, fontSize: 26, fontWeight: 950 },
  sub: { marginTop: 6, opacity: 0.85 },

  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },

  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 900 },

  banner: {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    marginBottom: 12,
  },
  bannerPending: { background: "rgba(255,255,255,0.08)" },
  bannerOk: { background: "rgba(60,255,177,0.12)" },
  bannerBad: { background: "rgba(255,77,77,0.10)" },
  bannerNeutral: { background: "rgba(0,0,0,0.18)" },
  bannerActions: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
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
  btnSoft: {
    width: "100%",
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },
  btnPrimary: {
    width: "100%",
    marginTop: 8,
    padding: "12px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
  },
  btnPrimaryHalf: {
    flex: "1 1 180px",
    padding: "12px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    background: "#3cffb1",
    color: "#062112",
  },
  btnSoftHalf: {
    flex: "1 1 180px",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },

  label: { fontSize: 12, fontWeight: 900, opacity: 0.85, marginBottom: 6 },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    outline: "none",
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
  },

  reqList: { display: "grid", gap: 10, marginTop: 12 },
  reqItem: {
    display: "flex",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
  },
  reqIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 950,
    flex: "0 0 30px",
  },

  docsBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
  },
  docsGrid: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  docCard: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    padding: 12,
  },
  previewImg: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    marginTop: 10,
  },
  previewEmpty: {
    height: 220,
    borderRadius: 14,
    border: "1px dashed rgba(255,255,255,0.22)",
    background: "rgba(0,0,0,0.12)",
    display: "grid",
    placeItems: "center",
    marginTop: 10,
    opacity: 0.75,
    fontWeight: 900,
  },
  okPill: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(60,255,177,0.15)",
    border: "1px solid rgba(60,255,177,0.25)",
    color: "#c8ffe7",
    fontWeight: 900,
    height: "fit-content",
    whiteSpace: "nowrap",
  },
  needPill: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,77,77,0.10)",
    border: "1px solid rgba(255,77,77,0.20)",
    color: "#ffd0d0",
    fontWeight: 900,
    height: "fit-content",
    whiteSpace: "nowrap",
  },
  fileBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },
  fileBtnSoft: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    opacity: 0.95,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    marginTop: 12,
  },
  infoBox: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: 12,
  },
  infoValue: {
    fontWeight: 900,
    wordBreak: "break-word",
  },

  navGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    marginTop: 12,
  },
  navCard: {
    textAlign: "left" as const,
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
  },
  navCardDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  navTitle: {
    fontWeight: 950,
    fontSize: 16,
  },
  navSub: {
    marginTop: 6,
    opacity: 0.82,
    fontSize: 12,
    lineHeight: 1.4,
  },

  noteBox: {
    marginTop: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: 12,
  },
  warningBox: {
    marginTop: 12,
    borderRadius: 14,
    background: "rgba(255,77,77,0.10)",
    border: "1px solid rgba(255,77,77,0.20)",
    padding: 12,
  },
  noteText: {
    lineHeight: 1.45,
    wordBreak: "break-word",
  },

  small: { opacity: 0.8, fontSize: 12, marginTop: 12, lineHeight: 1.35 },
};