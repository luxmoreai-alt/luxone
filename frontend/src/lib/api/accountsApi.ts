import { apiRequest } from "../../api/client";
import type { AccountRecord } from "../shared/crmTypes";

type BackendAccount = {
  id: number;
  name?: string;
  account_name?: string;
  website?: string | null;
  phone?: string | null;
  industry?: string | null;
  annual_revenue?: string | null;
  employee_count?: number | null;
  employees?: number | null;
  owner?: number | null;
  owner_email?: string | null;
  account_owner?: number | null;
  billing_address?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function toList<T>(payload: T[] | Paginated<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results;
}

function asNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAccount(item: BackendAccount): AccountRecord {
  const accountName = item.account_name ?? item.name ?? "";
  const employees = item.employees ?? item.employee_count ?? 0;
  return {
    id: String(item.id),
    accountName,
    accountOwner:
      item.owner_email ??
      (item.account_owner || item.owner ? `User #${item.account_owner ?? item.owner}` : ""),
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
    employees,
    annualRevenue: asNumber(item.annual_revenue),
    sicCode: "",
    description: item.description ?? "",
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

function toBillingAddress(payload: Partial<CreateAccountPayload>): string | undefined {
  const parts = [payload.street, payload.city, payload.state, payload.country, payload.zipCode]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (!parts.length) return undefined;
  return parts.join(", ");
}

function toBackendPayload(payload: Partial<CreateAccountPayload>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.accountName !== undefined) body.account_name = payload.accountName;
  if (payload.accountType !== undefined) {
    const allowed = new Set([
      "Analyst",
      "Competitor",
      "Customer",
      "Integrator",
      "Investor",
      "Partner",
      "Press",
      "Prospect",
      "Reseller",
      "Other",
    ]);
    const raw = (payload.accountType || "").trim();
    body.account_type = !raw ? null : allowed.has(raw) ? raw : "Other";
  }
  if (payload.phone !== undefined) body.phone = payload.phone || null;
  if (payload.website !== undefined) body.website = payload.website || null;
  if (payload.industry !== undefined) body.industry = payload.industry || null;
  if (payload.annualRevenue !== undefined) body.annual_revenue = payload.annualRevenue || null;
  if (payload.employees !== undefined) {
    body.employees = payload.employees ? Number(payload.employees) : null;
  }
  if (payload.description !== undefined) body.description = payload.description || null;

  const billingAddress = toBillingAddress(payload);
  if (billingAddress !== undefined) body.billing_address = billingAddress;

  if (payload.accountOwner && /^\d+$/.test(payload.accountOwner.trim())) {
    body.account_owner = Number(payload.accountOwner.trim());
  }
  return body;
}

export async function getAccounts(): Promise<AccountRecord[]> {
  const data = await apiRequest<BackendAccount[] | Paginated<BackendAccount>>("/accounts");
  return toList(data).map(normalizeAccount);
}

export async function getAccountById(id: string): Promise<AccountRecord | null> {
  try {
    const data = await apiRequest<BackendAccount>(`/accounts/${id}`);
    return normalizeAccount(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
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
  const body = toBackendPayload(payload);
  const data = await apiRequest<BackendAccount>(`/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return normalizeAccount(data);
}

export async function deleteAccount(id: string): Promise<void> {
  await apiRequest(`/accounts/${id}`, { method: "DELETE" });
}

export async function createAccount(payload: CreateAccountPayload): Promise<AccountRecord> {
  const body = toBackendPayload(payload);
  const data = await apiRequest<BackendAccount>("/accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeAccount(data);
}
