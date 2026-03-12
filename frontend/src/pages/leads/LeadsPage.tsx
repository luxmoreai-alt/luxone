import { useEffect, useState } from "react";
import CRMModuleListPage from "../crm/CRMModuleListPage";
import { leadModuleConfig } from "../../components/modules/leads/leadsMockData";
import { deleteLead, getLeads } from "../../lib/api/leadsApi";
import type { LeadRecord } from "../../lib/shared/crmTypes";

export default function LeadsPage() {
  const [rows, setRows] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLoading(true);
        const data = await getLeads();
        setRows(data);
      } catch (error) {
        console.error("Failed to load leads:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadLeads();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Loading leads...
      </div>
    );
  }

  const handleDeleteRow = async (id: string) => {
    await deleteLead(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <CRMModuleListPage
      config={leadModuleConfig}
      rows={rows}
      showNotes={true}
      showActivity={true}
      onDeleteRow={handleDeleteRow}
    />
  );
}