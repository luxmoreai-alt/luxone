import type { ContactRecord } from "../shared/crmTypes";

const API_BASE = "http://127.0.0.1:8000/api";

type BackendContact = {
  id: number;
  first_name: string;
  last_name: string;
  title?: string | null;
  email?: string | null;
  secondary_email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  owner?: number | null;
  owner_email?: string | null;
  account?: number | null;
  account_name?: string | null;
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

function normalizeContact(item: BackendContact): ContactRecord {
  const first = item.first_name ?? "";
  const last = item.last_name ?? "";
  return {
    id: String(item.id),
    contactName: `${first} ${last}`.trim(),
    firstName: first,
    lastName: last,
    accountName: item.account_name ?? "",
    contactOwner: item.owner_email ?? "",
    email: item.email ?? "",
    otherPhone: "",
    phone: item.phone ?? "",
    mobile: item.mobile ?? "",
    fax: "",
    leadSource: "",
    vendorName: "",
    title: item.title ?? "",
    department: "",
    homePhone: "",
    tags: [],
    avatar: `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase(),
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

export async function getContacts(): Promise<ContactRecord[]> {
  const res = await fetch(`${API_BASE}/contacts`, { headers: buildHeaders() });
  if (!res.ok) throw new Error((await res.text()) || "Failed to load contacts");
  const data = await res.json();
  return extractResults<BackendContact>(data).map(normalizeContact);
}

export async function getContactById(
  id: string
): Promise<ContactRecord | null> {
  const res = await fetch(`${API_BASE}/contacts/${id}`, {
    headers: buildHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error((await res.text()) || "Failed to load contact");
  return normalizeContact((await res.json()) as BackendContact);
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
  const body: Record<string, unknown> = {};

  if (payload.firstName !== undefined) body.first_name = payload.firstName;
  if (payload.lastName !== undefined) body.last_name = payload.lastName;
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.email !== undefined) body.email = payload.email;
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.mobile !== undefined) body.mobile = payload.mobile;
  if (payload.department !== undefined) body.department = payload.department;
  if (payload.country !== undefined) body.country = payload.country;
  if (payload.street !== undefined) body.street = payload.street;
  if (payload.city !== undefined) body.city = payload.city;
  if (payload.state !== undefined) body.state = payload.state;
  if (payload.zipCode !== undefined) body.zip_code = payload.zipCode;

  const res = await fetch(`${API_BASE}/contacts/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to update contact");
  return normalizeContact((await res.json()) as BackendContact);
}

export async function deleteContact(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/contacts/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete contact");
}

export async function createContact(
  payload: CreateContactPayload
): Promise<ContactRecord> {
  const body: Record<string, unknown> = {
    first_name: payload.firstName,
    last_name: payload.lastName,
  };

  if (payload.title) body.title = payload.title;
  if (payload.email) body.email = payload.email;
  if (payload.phone) body.phone = payload.phone;
  if (payload.mobile) body.mobile = payload.mobile;

  const res = await fetch(`${API_BASE}/contacts`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error((await res.text()) || "Failed to create contact");
  return normalizeContact((await res.json()) as BackendContact);
}
