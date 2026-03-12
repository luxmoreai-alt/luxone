import { apiRequest } from "../../api/client";
import type { ContactRecord } from "../shared/crmTypes";

type BackendContact = {
  id: number;
  salutation?: string | null;
  first_name: string;
  last_name: string;
  title?: string | null;
  department?: string | null;
  assistant?: string | null;
  assistant_phone?: string | null;
  email?: string | null;
  secondary_email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  other_phone?: string | null;
  home_phone?: string | null;
  owner?: number | null;
  contact_owner?: number | null;
  owner_email?: string | null;
  owner_details?: { email?: string | null } | null;
  account?: number | null;
  account_name?: string | null;
  account_info?: { name?: string | null } | null;
  created_at?: string;
  updated_at?: string;
};

type BackendAccount = {
  id: number;
  name?: string;
  account_name?: string;
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

function normalizeContact(item: BackendContact): ContactRecord {
  const first = item.first_name ?? "";
  const last = item.last_name ?? "";
  return {
    id: String(item.id),
    contactName: `${first} ${last}`.trim(),
    firstName: first,
    lastName: last,
    accountName: item.account_name ?? item.account_info?.name ?? "",
    contactOwner:
      item.owner_email ??
      item.owner_details?.email ??
      (item.contact_owner || item.owner ? `User #${item.contact_owner ?? item.owner}` : ""),
    email: item.email ?? "",
    otherPhone: item.other_phone ?? "",
    phone: item.phone ?? "",
    mobile: item.mobile ?? "",
    fax: "",
    leadSource: "",
    vendorName: "",
    title: item.title ?? "",
    department: item.department ?? "",
    homePhone: item.home_phone ?? "",
    tags: [],
    avatar: `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase(),
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

function toBackendPayload(payload: Partial<CreateContactPayload>, accountId: number | null): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.salutation !== undefined) body.salutation = payload.salutation || null;
  if (payload.firstName !== undefined) body.first_name = payload.firstName;
  if (payload.lastName !== undefined) body.last_name = payload.lastName;
  if (payload.title !== undefined) body.title = payload.title || null;
  if (payload.department !== undefined) body.department = payload.department || null;
  if (payload.email !== undefined) body.email = payload.email || null;
  if (payload.phone !== undefined) body.phone = payload.phone || null;
  if (payload.mobile !== undefined) body.mobile = payload.mobile || null;
  if (payload.otherPhone !== undefined) body.other_phone = payload.otherPhone || null;
  if (payload.assistant !== undefined) body.assistant = payload.assistant || null;
  if (payload.assistantPhone !== undefined) body.assistant_phone = payload.assistantPhone || null;
  if (accountId !== null) body.account = accountId;

  if (payload.contactOwner && /^\d+$/.test(payload.contactOwner.trim())) {
    body.contact_owner = Number(payload.contactOwner.trim());
  }
  return body;
}

export async function getContacts(): Promise<ContactRecord[]> {
  const data = await apiRequest<BackendContact[] | Paginated<BackendContact>>("/contacts");
  return toList(data).map(normalizeContact);
}

export async function getContactById(id: string): Promise<ContactRecord | null> {
  try {
    const data = await apiRequest<BackendContact>(`/contacts/${id}`);
    return normalizeContact(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

export type CreateContactPayload = {
  contactOwner?: string;
  salutation?: string;
  firstName: string;
  lastName: string;
  accountName?: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  otherPhone?: string;
  fax?: string;
  assistant?: string;
  assistantPhone?: string;
  country?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  description?: string;
};

export async function updateContact(
  id: string,
  payload: Partial<CreateContactPayload>
): Promise<ContactRecord> {
  const accountId = await resolveAccountIdByName(payload.accountName);
  const body = toBackendPayload(payload, accountId);
  const data = await apiRequest<BackendContact>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return normalizeContact(data);
}

export async function deleteContact(id: string): Promise<void> {
  await apiRequest(`/contacts/${id}`, { method: "DELETE" });
}

export async function createContact(payload: CreateContactPayload): Promise<ContactRecord> {
  const accountId = await resolveAccountIdByName(payload.accountName);
  const body = toBackendPayload(payload, accountId);
  const data = await apiRequest<BackendContact>("/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeContact(data);
}

