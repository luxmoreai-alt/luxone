import { useEffect, useState } from "react";
import CRMModuleListPage from "../crm/CRMModuleListPage";
import { dealModuleConfig } from "../../components/modules/deals/dealsConfig";
import { getDeals } from "../../lib/api/dealsApi";
import type { Deal } from "../../lib/shared/crmTypes";

export default function DealsPage() {
  const [rows, setRows] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDeals();
        setRows(data);
      } catch (err) {
        console.error("Failed to load deals:", err);
        const message =
          err instanceof Error ? err.message : "Unable to load deals";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadDeals();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">Loading deals…</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-rose-600">Unable to load deals: {error}</div>
    );
  }

  return (
    <CRMModuleListPage
      config={dealModuleConfig}
      rows={rows}
      showNotes={false}
      showActivity={false}
    />
  );
}
