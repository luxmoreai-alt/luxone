import { API_BASE_URL } from "./config";

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base =
    API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")
      ? API_BASE_URL
      : typeof window !== "undefined"
        ? `${window.location.origin}${API_BASE_URL}`
        : `http://127.0.0.1:5173${API_BASE_URL}`;
  const url = new URL(`${base}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = localStorage.getItem("accessToken");
  const tenantDb = localStorage.getItem("tenantDb");
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (tenantDb) {
    headers.set("X-Tenant-DB", tenantDb);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, options.query), {
      ...options,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? `Network error: ${error.message}. Check that the backend server is running and the frontend API base URL is correct.`
        : "Network error. Check that the backend server is running and reachable.";
    throw new Error(message);
  }

  const rawText = await response.text();
  let data: unknown = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText;
  }

  if (!response.ok) {
    const errorPayload =
      typeof data === "object" && data !== null
        ? (data as { detail?: string; message?: string; error?: string })
        : null;
    const fallbackStatusMessage = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
    const message =
      errorPayload?.detail ||
      errorPayload?.message ||
      errorPayload?.error ||
      fallbackStatusMessage ||
      "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
