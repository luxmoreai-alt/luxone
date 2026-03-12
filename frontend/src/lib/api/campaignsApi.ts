import { apiRequest } from "../../api/client";

type BackendCampaign = {
  id: number;
  campaign_name: string;
  type?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  expected_revenue?: string | null;
  budgeted_cost?: string | null;
  actual_cost?: string | null;
  expected_response?: number | null;
  numbers_sent?: number | null;
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

export type CreateCampaignPayload = {
  campaignOwner?: string;
  campaignName: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  expectedRevenue?: string;
  budgetedCost?: string;
  actualCost?: string;
  expectedResponse?: string;
  numbersSent?: string;
  description?: string;
};

function toBackendPayload(payload: CreateCampaignPayload): Record<string, unknown> {
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
    campaign_name: payload.campaignName,
  };
  if (payload.type !== undefined) body.type = payload.type || null;
  if (payload.status !== undefined) body.status = payload.status || null;
  if (payload.startDate !== undefined) body.start_date = normalizeDate(payload.startDate);
  if (payload.endDate !== undefined) body.end_date = normalizeDate(payload.endDate);
  if (payload.expectedRevenue !== undefined) body.expected_revenue = payload.expectedRevenue || null;
  if (payload.budgetedCost !== undefined) body.budgeted_cost = payload.budgetedCost || null;
  if (payload.actualCost !== undefined) body.actual_cost = payload.actualCost || null;
  if (payload.expectedResponse !== undefined) {
    body.expected_response = payload.expectedResponse ? Number(payload.expectedResponse) : null;
  }
  if (payload.numbersSent !== undefined) {
    body.numbers_sent = payload.numbersSent ? Number(payload.numbersSent) : null;
  }
  if (payload.description !== undefined) body.description = payload.description || null;
  if (payload.campaignOwner && /^\d+$/.test(payload.campaignOwner.trim())) {
    body.campaign_owner = Number(payload.campaignOwner.trim());
  }
  return body;
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<BackendCampaign> {
  const data = await apiRequest<BackendCampaign>("/campaigns", {
    method: "POST",
    body: JSON.stringify(toBackendPayload(payload)),
  });
  return data;
}

export async function getCampaigns(): Promise<BackendCampaign[]> {
  const data = await apiRequest<BackendCampaign[] | Paginated<BackendCampaign>>("/campaigns");
  return toList(data);
}
