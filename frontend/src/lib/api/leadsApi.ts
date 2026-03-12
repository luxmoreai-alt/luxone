import type { LeadRecord, Note, TimelineItem } from "../shared/crmTypes";

const API_BASE = "http://127.0.0.1:8000/api";

type BackendLeadList = {
  id: number;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone?: string | null;
  lead_source?: string | null;
  owner?: number | null;
  owner_email?: string | null;
  created_at?: string;
};

type BackendLeadDetail = {
  id: number;
  first_name: string;
  last_name: string;
  company: string;
  title?: string | null;
  email: string;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  lead_source?: string | null;
  lead_status?: string | null;
  industry?: string | null;
  annual_revenue?: string | null;
  employee_count?: number | null;
  rating?: string | null;
  owner?: number | null;
  owner_email?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  skype_id?: string | null;
  secondary_email?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

type BackendNote = {
  id: number;
  note: string;
  created_by?: string | null;
  created_at?: string;
};

type BackendActivity = {
  id: number;
  action: string;
  description?: string | null;
  user?: string | null;
  timestamp?: string;
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

function normalizeLeadList(item: BackendLeadList): LeadRecord {
  return {
    id: String(item.id),
    leadName: `${item.first_name} ${item.last_name}`.trim(),
    firstName: item.first_name,
    lastName: item.last_name,
    company: item.company,
    title: "",
    email: item.email,
    secondaryEmail: "",
    phone: item.phone ?? "",
    mobile: "",
    leadSource: item.lead_source ?? "",
    leadOwner: item.owner_email ?? "",
    leadStatus: "",
    industry: "",
    annualRevenue: 0,
    website: "",
    noOfEmployees: 0,
    rating: "",
    fax: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    description: "",
    createdBy: "",
    createdAt: item.created_at ?? "",
    updatedBy: "",
    updatedAt: item.created_at ?? "",
  };
}

function normalizeLeadDetail(item: BackendLeadDetail): LeadRecord {
  return {
    id: String(item.id),
    leadName: `${item.first_name} ${item.last_name}`.trim(),
    firstName: item.first_name,
    lastName: item.last_name,
    company: item.company,
    title: item.title ?? "",
    email: item.email,
    secondaryEmail: item.secondary_email ?? "",
    phone: item.phone ?? "",
    mobile: item.mobile ?? "",
    leadSource: item.lead_source ?? "",
    leadOwner: item.owner_email ?? "",
    leadStatus: item.lead_status ?? "",
    industry: item.industry ?? "",
    annualRevenue: Number(item.annual_revenue ?? 0),
    website: item.website ?? "",
    noOfEmployees: item.employee_count ?? 0,
    rating: item.rating ?? "",
    fax: "",
    address: item.street ?? "",
    city: item.city ?? "",
    state: item.state ?? "",
    zipCode: item.zip_code ?? "",
    country: item.country ?? "",
    description: item.description ?? "",
    createdBy: "",
    createdAt: item.created_at ?? "",
    updatedBy: "",
    updatedAt: item.updated_at ?? "",
  };
}

export async function getLeads(): Promise<LeadRecord[]> {
  const res = await fetch(`${API_BASE}/leads`, { headers: buildHeaders() });
  if (!res.ok) throw new Error((await res.text()) || "Failed to load leads");
  const data = await res.json();
  return extractResults<BackendLeadList>(data).map(normalizeLeadList);
}

export async function getLeadById(id: string): Promise<LeadRecord | null> {
  const res = await fetch(`${API_BASE}/leads/${id}`, {
    headers: buildHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error((await res.text()) || "Failed to load lead");
  return normalizeLeadDetail((await res.json()) as BackendLeadDetail);
}

export type CreateLeadPayload = {
  leadOwner?: string;
  salutation?: string;
  firstName: string;
  lastName: string;
  company: string;
  title?: string;
  email: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  website?: string;
  leadSource?: string;
  leadStatus?: string;
  industry?: string;
  noOfEmployees?: string;
  annualRevenue?: string;
  rating?: string;
  secondaryEmail?: string;
  skypeId?: string;
  twitter?: string;
  country?: string;
  flatNo?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: string;
  longitude?: string;
  description?: string;
};

export async function createLead(
  payload: CreateLeadPayload
): Promise<LeadRecord> {
  const body: Record<string, unknown> = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    company: payload.company,
    email: payload.email,
  };

  if (payload.title) body.title = payload.title;
  if (payload.phone) body.phone = payload.phone;
  if (payload.mobile) body.mobile = payload.mobile;
  if (payload.website) body.website = payload.website;
  if (payload.leadSource) body.lead_source = payload.leadSource;
  if (payload.leadStatus) body.lead_status = payload.leadStatus;
  if (payload.industry) body.industry = payload.industry;
  if (payload.annualRevenue) body.annual_revenue = payload.annualRevenue;
  if (payload.noOfEmployees)
    body.employee_count = Number(payload.noOfEmployees);
  if (payload.rating) body.rating = payload.rating;
  if (payload.secondaryEmail) body.secondary_email = payload.secondaryEmail;
  if (payload.skypeId) body.skype_id = payload.skypeId;
  if (payload.country) body.country = payload.country;
  if (payload.city) body.city = payload.city;
  if (payload.state) body.state = payload.state;
  if (payload.zipCode) body.zip_code = payload.zipCode;
  if (payload.description) body.description = payload.description;

  const streetParts = [payload.flatNo, payload.street].filter(Boolean);
  if (streetParts.length > 0) body.street = streetParts.join(", ");

  const res = await fetch(`${API_BASE}/leads`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to create lead");
  return normalizeLeadDetail((await res.json()) as BackendLeadDetail);
}

export async function updateLead(
  id: string,
  payload: Partial<CreateLeadPayload>
): Promise<LeadRecord> {
  const body: Record<string, unknown> = {};

  if (payload.firstName !== undefined) body.first_name = payload.firstName;
  if (payload.lastName !== undefined) body.last_name = payload.lastName;
  if (payload.company !== undefined) body.company = payload.company;
  if (payload.email !== undefined) body.email = payload.email;
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.mobile !== undefined) body.mobile = payload.mobile;
  if (payload.website !== undefined) body.website = payload.website;
  if (payload.leadSource !== undefined) body.lead_source = payload.leadSource;
  if (payload.leadStatus !== undefined) body.lead_status = payload.leadStatus;
  if (payload.industry !== undefined) body.industry = payload.industry;
  if (payload.annualRevenue !== undefined) body.annual_revenue = payload.annualRevenue;
  if (payload.noOfEmployees !== undefined) body.employee_count = Number(payload.noOfEmployees);
  if (payload.rating !== undefined) body.rating = payload.rating;
  if (payload.secondaryEmail !== undefined) body.secondary_email = payload.secondaryEmail;
  if (payload.skypeId !== undefined) body.skype_id = payload.skypeId;
  if (payload.country !== undefined) body.country = payload.country;
  if (payload.city !== undefined) body.city = payload.city;
  if (payload.state !== undefined) body.state = payload.state;
  if (payload.zipCode !== undefined) body.zip_code = payload.zipCode;
  if (payload.description !== undefined) body.description = payload.description;

  const streetParts = [payload.flatNo, payload.street].filter(Boolean);
  if (streetParts.length > 0) body.street = streetParts.join(", ");

  const res = await fetch(`${API_BASE}/leads/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to update lead");
  return normalizeLeadDetail((await res.json()) as BackendLeadDetail);
}

export type ConvertLeadPayload = {
  create_deal?: boolean;
  deal_name?: string;
  deal_value?: number;
};

export type ConvertLeadResult = {
  message: string;
  account_id: number;
  contact_id: number;
  deal_id: number | null;
};

export async function convertLead(
  id: string,
  payload: ConvertLeadPayload
): Promise<ConvertLeadResult> {
  const res = await fetch(`${API_BASE}/leads/${id}/convert`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to convert lead");
  return (await res.json()) as ConvertLeadResult;
}

export async function addLeadNote(id: string, note: string): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${id}/notes`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to save note");
}

export async function sendEmail(payload: {
  to: string;
  subject: string;
  body: string;
  from_email?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/send-email`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to send email");
}

export async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete lead");
}

export async function getLeadNotes(id: string): Promise<Note[]> {
  const res = await fetch(`${API_BASE}/leads/${id}/notes`, {
    headers: buildHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const items: BackendNote[] = Array.isArray(data) ? data : [];
  return items.map((item) => ({
    id: String(item.id),
    parentId: id,
    title: item.note.slice(0, 60),
    content: item.note,
    createdAt: item.created_at ?? "",
    createdBy: item.created_by ?? "",
  }));
}

export async function getLeadTimeline(id: string): Promise<TimelineItem[]> {
  const res = await fetch(`${API_BASE}/leads/${id}/timeline`, {
    headers: buildHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const items: BackendActivity[] = Array.isArray(data) ? data : [];
  return items.map((item) => ({
    id: String(item.id),
    parentId: id,
    type: "Update" as const,
    title: item.action,
    detail: item.description ?? "",
    at: item.timestamp ?? "",
    by: item.user ?? "",
  }));
}

export async function createLeadTask(
  id: string,
  payload: { subject: string; description?: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${id}/create-task`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      subject: payload.subject,
      description: payload.description ?? "",
    }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to create task");
}

export async function logLeadCall(
  id: string,
  payload: { call_summary: string; call_outcome?: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${id}/log-call`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      call_summary: payload.call_summary,
      call_outcome: payload.call_outcome ?? "",
    }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to log call");
}

export async function scheduleLeadMeeting(
  id: string,
  payload: { meeting_subject: string; agenda?: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${id}/schedule-meeting`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      meeting_subject: payload.meeting_subject,
      agenda: payload.agenda ?? "",
    }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to schedule meeting");
}

export async function sendLeadEmail(
  id: string,
  payload: { subject: string; body: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${id}/send-email`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      subject: payload.subject,
      body: payload.body,
    }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to send email");
}
