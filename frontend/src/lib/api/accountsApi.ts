import type { AccountRecord } from "../shared/crmTypes";

const API_BASE = "http://127.0.0.1:8000/api";

type BackendAccount = {
  id: number;
  name: string;
  website?: string | null;
  phone?: string | null;
  industry?: string | null;
  annual_revenue?: string | null;
  employee_count?: number | null;
  owner?: number | null;
  owner_email?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  created_at?: string;
  updated_at?: string;
};

function buildHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  const tenantDb = localStorage.getItem("tenantDb");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantDb ? { "X-Tenant-DB": tenantDb } : {}),
  };
}

function extractResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
}

function normalizeAccount(item: BackendAccount): AccountRecord {
  return {
    id: String(item.id),
    accountName: item.name,
    accountOwner: item.owner_email ?? "",
    accountSite: "",
    parentAccount: "",
    accountNumber: "",
    rating: "",
    phone: item.phone ?? "",
    fax: "",
    website: item.website ?? "",
    tickerSymbol: "",
    ownership: "",
    industry: item.industry ?? "",
    employees: item.employee_count ?? 0,
    annualRevenue: Number(item.annual_revenue ?? 0),
    sicCode: "",
    description: "",
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

export async function getAccounts(): Promise<AccountRecord[]> {
  const res = await fetch(`${API_BASE}/accounts`, { headers: buildHeaders() });
  if (!res.ok) throw new Error((await res.text()) || "Failed to load accounts");
  const data = await res.json();
  return extractResults<BackendAccount>(data).map(normalizeAccount);
}

export async function getAccountById(
  id: string
): Promise<AccountRecord | null> {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    headers: buildHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error((await res.text()) || "Failed to load account");
  return normalizeAccount((await res.json()) as BackendAccount);
}

export type CreateAccountPayload = {
  accountOwner?: string;
  accountName: string;
  accountType?: string;
  phone?: string;
  website?: string;
  industry?: string;
  annualRevenue?: string;
  employees?: string;
  country?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  description?: string;
};

export async function updateAccount(
  id: string,
  payload: Partial<CreateAccountPayload>
): Promise<AccountRecord> {
  const body: Record<string, unknown> = {};

  if (payload.accountName !== undefined) body.name = payload.accountName;
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.website !== undefined) body.website = payload.website;
  if (payload.industry !== undefined) body.industry = payload.industry;
  if (payload.annualRevenue !== undefined) body.annual_revenue = payload.annualRevenue;
  if (payload.employees !== undefined) body.employee_count = Number(payload.employees);
  if (payload.country !== undefined) body.country = payload.country;
  if (payload.street !== undefined) body.street = payload.street;
  if (payload.city !== undefined) body.city = payload.city;
  if (payload.state !== undefined) body.state = payload.state;
  if (payload.zipCode !== undefined) body.zip_code = payload.zipCode;

  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to update account");
  return normalizeAccount((await res.json()) as BackendAccount);
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete account");
}

export async function createAccount(
  payload: CreateAccountPayload
): Promise<AccountRecord> {
  const body: Record<string, unknown> = {
    name: payload.accountName,
  };

  if (payload.phone) body.phone = payload.phone;
  if (payload.website) body.website = payload.website;
  if (payload.industry) body.industry = payload.industry;
  if (payload.annualRevenue) body.annual_revenue = payload.annualRevenue;
  if (payload.employees) body.employee_count = Number(payload.employees);
  if (payload.country) body.country = payload.country;
  if (payload.street) body.street = payload.street;
  if (payload.city) body.city = payload.city;
  if (payload.state) body.state = payload.state;
  if (payload.zipCode) body.zip_code = payload.zipCode;

  const res = await fetch(`${API_BASE}/accounts`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error((await res.text()) || "Failed to create account");
  return normalizeAccount((await res.json()) as BackendAccount);
}
