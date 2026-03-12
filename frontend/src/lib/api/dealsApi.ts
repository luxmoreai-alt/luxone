import type { Deal } from "../shared/crmTypes";

type BackendDeal = {
  id: number | string;
  name?: string;
  stage?: string;
  amount?: number | null;
  value?: number | null;
  account?: number | null;
  account_name?: string;
  contact_name?: string;
  lead_name?: string;
  owner_email?: string;
  created_at?: string;
  updated_at?: string;
};

const API_BASE_URL = "http://127.0.0.1:8000/api";
const DEALS_ENDPOINT = `${API_BASE_URL}/deals`;

function buildHeaders(): Record<string, string> {
  const accessToken = localStorage.getItem("accessToken");
  const tenantDb = localStorage.getItem("tenantDb");
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(tenantDb ? { "X-Tenant-DB": tenantDb } : {}),
  };
}

function normalizeDeal(item: BackendDeal): Deal {
  const amount = item.amount ?? item.value ?? 0;
  const stage = item.stage ?? "Qualification";
  const closingDate = item.updated_at ?? item.created_at ?? "";

  return {
    id: String(item.id),
    parentId: item.account ? String(item.account) : "",
    dealName: item.name ?? "Untitled Deal",
    amount: Number(amount ?? 0),
    stage,
    probability: 0,
    closingDate,
    type: item.lead_name ? "Lead" : "Deal",
    accountName: item.account_name ?? "",
    contactName: item.contact_name ?? "",
    leadName: item.lead_name ?? "",
    dealOwner: item.owner_email ?? "",
    ownerEmail: item.owner_email ?? "",
    value: Number(item.value ?? 0),
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

function extractRecords(payload: unknown): BackendDeal[] {
  if (Array.isArray(payload)) {
    return payload as BackendDeal[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as Record<string, unknown>).results)
  ) {
    return (payload as Record<string, BackendDeal[]>).results;
  }

  return [];
}

export async function getDeals(): Promise<Deal[]> {
  const response = await fetch(DEALS_ENDPOINT, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to load deals");
  }

  const data = await response.json();
  const records = extractRecords(data);

  return records.map(normalizeDeal);
}
