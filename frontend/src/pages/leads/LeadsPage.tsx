import { useEffect, useState } from "react";
import CRMModuleListPage from "../crm/CRMModuleListPage";
import { leadModuleConfig, leadsMockList } from "../../components/modules/leads/leadsMockData";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { fetchLeads } from "../../api/crm";
import { mapLeadListItem } from "../../lib/shared/crmMappers";
import type { LeadRecord } from "../../lib/shared/crmTypes";

export default function LeadsPage() {
  const [rows, setRows] = useState<LeadRecord[]>(leadsMockList);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const leads = await fetchLeads();
        setRows(leads.map(mapLeadListItem));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leads");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <DashboardLayout><div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading leads...</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div></DashboardLayout>;
  }

  return (
    <CRMModuleListPage
      config={leadModuleConfig}
      rows={rows}
      showNotes={true}
      showActivity={true}
    />
  );
}
