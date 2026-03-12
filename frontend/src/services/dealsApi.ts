// Deals API layer
import type { DealRecord } from "../lib/types/dealTypes";

const USE_MOCK_DEALS = true;
const API_BASE = "http://127.0.0.1:8000/api";

import { dealsMockList } from "../lib/mock/dealsMockData";

export async function getDeals(): Promise<DealRecord[]> {
  if (USE_MOCK_DEALS) return Promise.resolve(dealsMockList);
  const res = await fetch(`${API_BASE}/deals`, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Failed to load deals");
  return await res.json();
}

export async function getDealById(id: string): Promise<DealRecord | null> {
  if (USE_MOCK_DEALS) return Promise.resolve(dealsMockList.find(d => d.id === id) || null);
  const res = await fetch(`${API_BASE}/deals/${id}`, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) return null;
  return await res.json();
}

export async function createDeal(data: Partial<DealRecord>): Promise<DealRecord> {
  if (USE_MOCK_DEALS) {
    const newDeal = { ...data, id: `deal-${Date.now()}` } as DealRecord;
    dealsMockList.push(newDeal);
    return Promise.resolve(newDeal);
  }
  const res = await fetch(`${API_BASE}/deals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create deal");
  return await res.json();
}

export async function updateDeal(id: string, data: Partial<DealRecord>): Promise<DealRecord> {
  if (USE_MOCK_DEALS) {
    const idx = dealsMockList.findIndex(d => d.id === id);
    if (idx >= 0) dealsMockList[idx] = { ...dealsMockList[idx], ...data };
    return Promise.resolve(dealsMockList[idx]);
  }
  const res = await fetch(`${API_BASE}/deals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update deal");
  return await res.json();
}

export async function deleteDeal(id: string): Promise<void> {
  if (USE_MOCK_DEALS) {
    const idx = dealsMockList.findIndex(d => d.id === id);
    if (idx >= 0) dealsMockList.splice(idx, 1);
    return Promise.resolve();
  }
  const res = await fetch(`${API_BASE}/deals/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to delete deal");
}

export async function convertLeadToDeal(leadId: string, payload: any): Promise<DealRecord> {
  if (USE_MOCK_DEALS) {
    const newDeal = { ...payload.deal, id: `deal-${Date.now()}`, sourceModule: "lead-conversion", leadId } as DealRecord;
    dealsMockList.push(newDeal);
    return Promise.resolve(newDeal);
  }
  const res = await fetch(`${API_BASE}/leads/${leadId}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to convert lead");
  return await res.json();
}
