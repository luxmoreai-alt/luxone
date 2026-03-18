import { getResolvedApiBaseUrl } from "./config";

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined | null>;
};

type StoredAuth = {
  accessToken: string | null;
  refreshToken: string | null;
  tenantDb: string | null;
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }
}

function getStoredAuth(): StoredAuth {
  return {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
    tenantDb: localStorage.getItem("tenantDb"),
  };
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const publicPaths = new Set(["/login", "/otp-login", "/forgot-password"]);
  if (!publicPaths.has(window.location.pathname)) {
    window.location.assign("/login");
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch(buildUrl("/auth/token/refresh"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  const rawText = await response.text();
  let data: unknown = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText;
  }

  if (!response.ok || !data || typeof data !== "object") {
    return null;
  }

  const payload = data as {
    access?: string;
    access_token?: string;
    refresh?: string;
    refresh_token?: string;
  };
  const nextAccess = payload.access || payload.access_token || null;
  const nextRefresh = payload.refresh || payload.refresh_token || null;

  if (nextAccess) {
    localStorage.setItem("accessToken", nextAccess);
  }

  if (nextRefresh) {
    localStorage.setItem("refreshToken", nextRefresh);
  }

  return nextAccess;
}

async function executeRequest(path: string, options: RequestOptions, accessTokenOverride?: string) {
  const { accessToken, tenantDb } = getStoredAuth();
  const headers = new Headers(options.headers || {});
  const effectiveAccessToken = accessTokenOverride ?? accessToken;

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (effectiveAccessToken) {
    headers.set("Authorization", `Bearer ${effectiveAccessToken}`);
  }

  if (tenantDb) {
    headers.set("X-Tenant-DB", tenantDb);
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

  const rawText = await response.text();
  let data: unknown = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText;
  }

  if (!response.ok && response.status === 401) {
    const { refreshToken } = getStoredAuth();
    if (refreshToken) {
      try {
        const nextAccessToken = await refreshAccessToken(refreshToken);
        if (nextAccessToken) {
          response = await executeRequest(path, options, nextAccessToken);
          const retryText = await response.text();
          try {
            data = retryText ? JSON.parse(retryText) : null;
          } catch {
            data = retryText;
          }
        }
      } catch {
        // fall through to logout handling below
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuth();
      redirectToLogin();
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
