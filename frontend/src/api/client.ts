import { getResolvedApiBaseUrl } from "./config";
import { getAccessToken, getTenantDb, refreshAccessToken, clearAuthSession } from "../lib/api/authApi";

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined | null>;
};

function flattenErrorPayload(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenErrorPayload);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) => {
      const nestedMessages = flattenErrorPayload(nestedValue);
      if (!nestedMessages.length) return [];
      if (key === "non_field_errors" || key === "detail" || key === "message" || key === "error") {
        return nestedMessages;
      }
      return nestedMessages.map((message) => `${key}: ${message}`);
    });
  }

  return [];
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const normalizedPathWithPrefix = path.startsWith("/") ? path : `/${path}`;
  const [pathname, search = ""] = normalizedPathWithPrefix.split("?", 2);
  const normalizedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const base = getResolvedApiBaseUrl();
  const url = new URL(`${base}${normalizedPath}${search ? `?${search}` : ""}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export function clearStoredAuth() {
  clearAuthSession();
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function executeRequest(path: string, options: RequestOptions) {
  const tenantDb = getTenantDb();
  const accessToken = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (tenantDb) {
    headers.set("X-Tenant-DB", tenantDb);
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(buildUrl(path, options.query), {
    ...options,
    headers,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await executeRequest(path, options);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? `Network error: ${error.message}. Check that the backend server is running and the frontend API base URL is correct.`
        : "Network error. Check that the backend server is running and reachable.";
    throw new Error(message);
  }

  // On 401: try to refresh the access token once, then retry
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      try {
        response = await executeRequest(path, options);
      } catch {
        clearStoredAuth();
        redirectToLogin();
        throw new Error("Session expired. Please log in again.");
      }
    } else {
      clearStoredAuth();
      redirectToLogin();
      throw new Error("Session expired. Please log in again.");
    }
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
    const flattenedMessages = flattenErrorPayload(data);
    const message =
      errorPayload?.detail ||
      errorPayload?.message ||
      errorPayload?.error ||
      flattenedMessages.join(" | ") ||
      fallbackStatusMessage ||
      "Request failed";
    const error = new Error(message) as Error & { payload?: unknown; status?: number };
    error.payload = data;
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export function getApiBaseUrl() {
  return getResolvedApiBaseUrl();
}
