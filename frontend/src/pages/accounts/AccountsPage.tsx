import { useEffect, useState } from "react";
import CRMModuleListPage from "../crm/CRMModuleListPage";
import { accountModuleConfig } from "../../components/modules/accounts/accountsMockData";
import { deleteAccount, getAccounts } from "../../lib/api/accountsApi";
import type { AccountRecord } from "../../lib/shared/crmTypes";

export default function AccountsPage() {
  const [rows, setRows] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAccounts();
        setRows(data);
      } catch (err) {
        console.error("Failed to load accounts:", err);
        setError(err instanceof Error ? err.message : "Unable to load accounts");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading accounts...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-rose-600">Unable to load accounts: {error}</div>;
  }

  const handleDeleteRow = async (id: string) => {
    await deleteAccount(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <CRMModuleListPage
      config={accountModuleConfig}
      rows={rows}
      showNotes={true}
      showActivity={false}
      onDeleteRow={handleDeleteRow}
    />
  );
}
