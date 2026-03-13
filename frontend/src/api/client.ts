import { getResolvedApiBaseUrl } from "./config";

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
      if (!nestedMessages.length) {
        return [];
      }

      if (key === "non_field_errors" || key === "detail" || key === "message" || key === "error") {
        return nestedMessages;
      }

      return nestedMessages.map((message) => `${key}: ${message}`);
    });
  }

  return [];
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = getResolvedApiBaseUrl();
  const url = new URL(`${base}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function clearStoredAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("tenantDb");
  localStorage.removeItem("loggedInUser");
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
    if (response.status === 401) {
      clearStoredAuth();
    }

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
    throw new Error(message);
  }

  return data as T;
}

export function getApiBaseUrl() {
  return getResolvedApiBaseUrl();
}
