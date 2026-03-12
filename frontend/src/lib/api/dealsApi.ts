import { apiRequest } from "../../api/client";
import type { Deal as DealRecord } from "../shared/crmTypes";

type BackendDeal = {
  id: number | string;
  name?: string;
  deal_name?: string;
  stage?: string;
  amount?: number | null;
  value?: number | null;
  expected_revenue?: number | null;
  probability?: number | null;
  closing_date?: string | null;
  account?: number | null;
  account_name?: string | null;
  contact?: number | null;
  contact_name?: string | null;
  lead?: number | null;
  lead_name?: string | null;
  owner?: number | null;
  owner_email?: string | null;
  created_at?: string;
  updated_at?: string;
};

type BackendAccount = {
  id: number;
  name?: string;
  account_name?: string;
};

type BackendContact = {
  id: number;
  first_name?: string;
  last_name?: string;
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

function normalizeDeal(item: BackendDeal): DealRecord {
  const amount = item.amount ?? item.value ?? item.expected_revenue ?? 0;
  const stage = item.stage ?? "Qualification";
  const closingDate = item.closing_date ?? item.updated_at ?? item.created_at ?? "";
  const dealName = item.name ?? item.deal_name ?? "Untitled Deal";
  const value = item.value ?? item.expected_revenue ?? item.amount ?? 0;

  return {
    id: String(item.id),
    parentId: item.lead ? String(item.lead) : item.contact ? String(item.contact) : String(item.account ?? ""),
    dealName,
    amount: Number(amount ?? 0),
    stage,
    probability: Number(item.probability ?? 0),
    closingDate,
    type: item.account_name || "",
    accountName: item.account_name ?? "",
    contactName: item.contact_name ?? "",
    leadName: item.lead_name ?? "",
    dealOwner: item.owner_email ?? "",
    ownerEmail: item.owner_email ?? "",
    value: Number(value ?? 0),
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

async function resolveAccountIdByName(accountName?: string): Promise<number | null> {
  const name = (accountName ?? "").trim();
  if (!name) return null;
  if (/^\d+$/.test(name)) return Number(name);
  const data = await apiRequest<BackendAccount[] | Paginated<BackendAccount>>("/accounts", {
    query: { search: name, page_size: 50 },
  });
  const accounts = toList(data);
  const exact = accounts.find((a) => (a.account_name ?? a.name ?? "").toLowerCase() === name.toLowerCase());
  if (exact) return exact.id;
  return accounts[0]?.id ?? null;
}

async function resolveContactIdByName(contactName?: string): Promise<number | null> {
  const raw = (contactName ?? "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);

  const data = await apiRequest<BackendContact[] | Paginated<BackendContact>>("/contacts", {
    query: { search: raw, page_size: 50 },
  });
  const contacts = toList(data);
  const exact = contacts.find((c) => `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim().toLowerCase() === raw.toLowerCase());
  if (exact) return exact.id;
  return contacts[0]?.id ?? null;
}

export type CreateDealPayload = {
  dealOwner?: string;
  dealName: string;
  accountName: string;
  contactName?: string;
  amount?: string;
  closingDate?: string;
  stage?: string;
  probability?: string;
  type?: string;
  leadSource?: string;
  nextStep?: string;
  description?: string;
  expectedRevenue?: string;
  campaignSource?: string;
  forecastCategory?: string;
};

function toBackendPayload(
  payload: Partial<CreateDealPayload>,
  accountId: number,
  contactId: number | null
): Record<string, unknown> {
  const normalizeDate = (value?: string): string | null => {
    const raw = (value ?? "").trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }
    return raw;
  };

  const body: Record<string, unknown> = {
    account: accountId,
  };

  if (contactId) body.contact = contactId;
  if (payload.dealName !== undefined) body.deal_name = payload.dealName;
  if (payload.amount !== undefined) body.amount = payload.amount || null;
  if (payload.expectedRevenue !== undefined) body.expected_revenue = payload.expectedRevenue || null;
  if (payload.closingDate !== undefined) body.closing_date = normalizeDate(payload.closingDate);
  if (payload.stage !== undefined) body.stage = payload.stage || null;
  if (payload.probability !== undefined) {
    body.probability = payload.probability ? Number(payload.probability) : null;
  }
  if (payload.type !== undefined) body.type = payload.type || null;
  if (payload.leadSource !== undefined) body.lead_source = payload.leadSource || null;
  if (payload.nextStep !== undefined) body.next_step = payload.nextStep || null;
  if (payload.description !== undefined) body.description = payload.description || null;
  if (payload.campaignSource !== undefined) body.campaign_source = payload.campaignSource || null;
  if (payload.forecastCategory !== undefined) body.forecast_category = payload.forecastCategory || null;

  if (payload.dealOwner && /^\d+$/.test(payload.dealOwner.trim())) {
    body.deal_owner = Number(payload.dealOwner.trim());
  }
  return body;
}

export async function getDeals(): Promise<DealRecord[]> {
  const data = await apiRequest<BackendDeal[] | Paginated<BackendDeal>>("/deals");
  return toList(data).map(normalizeDeal);
}

export async function createDeal(payload: CreateDealPayload): Promise<DealRecord> {
  const accountId = await resolveAccountIdByName(payload.accountName);
  if (!accountId) {
    throw new Error("Account not found. Please provide a valid Account Name.");
  }
  const contactId = await resolveContactIdByName(payload.contactName);
  const body = toBackendPayload(payload, accountId, contactId);
  const data = await apiRequest<BackendDeal>("/deals", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeDeal(data);
}

export async function updateDeal(id: string, payload: Partial<CreateDealPayload>): Promise<DealRecord> {
  const accountId = payload.accountName ? await resolveAccountIdByName(payload.accountName) : null;
  const contactId = payload.contactName ? await resolveContactIdByName(payload.contactName) : null;
  const body = toBackendPayload(payload, accountId ?? 0, contactId);
  if (!accountId) {
    delete body.account;
  }
  const data = await apiRequest<BackendDeal>(`/deals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return normalizeDeal(data);
}

export async function deleteDeal(id: string): Promise<void> {
  await apiRequest(`/deals/${id}`, { method: "DELETE" });
}
