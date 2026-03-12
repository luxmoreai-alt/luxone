import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { accountModuleConfig } from "../../components/modules/accounts/accountsMockData";
import { getAccountById } from "../../lib/api/accountsApi";
import type { AccountRecord } from "../../lib/shared/crmTypes";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAccountById(id);
        setAccount(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load account"
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">Loading account...</div>
    );
  }

  if (error || !account) {
    return (
      <div className="p-6 text-sm text-rose-600">
        {error ?? "Account not found."}
      </div>
    );
  }

  return (
    <CRMModuleDetailPage
      config={accountModuleConfig}
      rows={[account]}
      data={{
        notes: [],
        deals: [],
        openActivities: [],
        closedActivities: [],
        meetings: [],
        products: [],
        emails: [],
        attachments: [],
        connectedRecords: [],
        cases: [],
        quotes: [],
        salesOrders: [],
        purchaseOrders: [],
        invoices: [],
        timeline: [],
      }}
    />
  );
}
