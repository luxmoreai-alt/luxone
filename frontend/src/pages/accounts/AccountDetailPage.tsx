import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { accountModuleConfig } from "../../components/modules/accounts/accountsMockData";
import { getAccountById, getAccountNotes } from "../../lib/api/accountsApi";
import { loadAccountLinkedData } from "../../lib/api/linkedRecordsApi";
import type { AccountRecord, Note } from "../../lib/shared/crmTypes";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [linkedData, setLinkedData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const accountData = await getAccountById(id);
        if (!accountData) {
          setAccount(null);
          setLinkedData(null);
          return;
        }
        setAccount(accountData);
        setLoading(false);

        const [notesData, related] = await Promise.all([
          getAccountNotes(id).catch(() => []),
          loadAccountLinkedData(accountData).catch(() => null),
        ]);
        setNotes(notesData);
        setLinkedData(related);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load account"
        );
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
        notes,
        deals: linkedData?.deals || [],
        openActivities: linkedData?.openActivities || [],
        closedActivities: linkedData?.closedActivities || [],
        meetings: linkedData?.meetings || [],
        products: linkedData?.products || [],
        emails: linkedData?.emails || [],
        attachments: linkedData?.attachments || [],
        connectedRecords: linkedData?.connectedRecords || [],
        cases: linkedData?.cases || [],
        solutions: linkedData?.solutions || [],
        contacts: linkedData?.contacts || [],
        accounts: linkedData?.accounts || [],
        quotes: linkedData?.quotes || [],
        salesOrders: linkedData?.salesOrders || [],
        purchaseOrders: linkedData?.purchaseOrders || [],
        invoices: linkedData?.invoices || [],
        timeline: linkedData?.timeline || [],
      }}
    />
  );
}
