export function isPreviewEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_PREVIEW === "true";
}

export function isPreviewSession() {
  if (typeof window === "undefined") return false;
  if (!isPreviewEnabled()) return false;
  return localStorage.getItem("token") === "demo-preview";
}
