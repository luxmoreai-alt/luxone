const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = RAW_API_BASE_URL
  ? RAW_API_BASE_URL.replace(/\/$/, "")
  : "/api";

export function getResolvedApiBaseUrl() {
  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    return API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${API_BASE_URL}`;
  }

  return `http://127.0.0.1:5173${API_BASE_URL}`;
}
