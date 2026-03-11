import { useEffect, useState } from "react";
import CRMModuleListPage from "../crm/CRMModuleListPage";
import { accountModuleConfig, accountsMockList } from "../../components/modules/accounts/accountsMockData";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { fetchAccounts } from "../../api/crm";
import { mapAccount } from "../../lib/shared/crmMappers";
import type { AccountRecord } from "../../lib/shared/crmTypes";

export default function AccountsPage() {
  const [rows, setRows] = useState<AccountRecord[]>(accountsMockList);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const accounts = await fetchAccounts();
        setRows(accounts.map(mapAccount));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load accounts");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <DashboardLayout><div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading accounts...</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div></DashboardLayout>;
  }

  return (
    <CRMModuleListPage
      config={accountModuleConfig}
      rows={rows}
      showNotes={true}
      showActivity={false}
    />
  );
}
