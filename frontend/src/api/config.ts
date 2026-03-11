const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = RAW_API_BASE_URL
  ? RAW_API_BASE_URL.replace(/\/$/, "")
  : "/api";

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
