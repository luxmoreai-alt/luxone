import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDealById } from "../../services/dealsApi";
import type { DealRecord } from "../../lib/types/dealTypes";
import { formatCurrency, formatDate } from "../../lib/helpers/dealHelpers";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<DealRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDeal = async () => {
      if (!id) {
        setError("Deal id is missing.");
        return;
      }

      try {
        const data = await getDealById(id);
        if (!data) {
          setError("Deal not found.");
          return;
        }
        setDeal(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load deal.");
      }
    };

    void loadDeal();
  }, [id]);

  if (error) {
    return <div className="p-6 text-rose-600">{error}</div>;
  }

  if (!deal) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">{deal.dealName}</h2>
      <div className="grid gap-2">
        <div>Account Name: {deal.accountName}</div>
        <div>Contact Name: {deal.contactName}</div>
        <div>Owner: {deal.ownerName}</div>
        <div>Amount: {formatCurrency(deal.amount)}</div>
        <div>Stage: {deal.stage}</div>
        <div>Probability: {deal.probability}%</div>
        <div>Expected Revenue: {formatCurrency(deal.expectedRevenue || 0)}</div>
        <div>Closing Date: {formatDate(deal.closingDate)}</div>
        <div>Type: {deal.type}</div>
        <div>Lead Source: {deal.leadSource}</div>
        <div>Campaign Source: {deal.campaignSource}</div>
        <div>Next Step: {deal.nextStep}</div>
        <div>Description: {deal.description}</div>
      </div>
    </div>
  );
}
