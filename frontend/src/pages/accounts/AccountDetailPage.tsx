import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { accountModuleConfig } from "../../components/modules/accounts/accountsMockData";
import { getAccountById, getAccountNotes, getAccountContacts, getAccountDeals } from "../../lib/api/accountsApi";
import type { AccountRecord, ContactRecord, Deal, Note } from "../../lib/shared/crmTypes";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [accountData, notesData, contactsData, dealsData] = await Promise.all([
          getAccountById(id),
          getAccountNotes(id),
          getAccountContacts(id),
          getAccountDeals(id),
        ]);
        setAccount(accountData);
        setNotes(notesData);
        setContacts(contactsData);
        setDeals(dealsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-slate-600">Loading account...</div>;
  if (error || !account) return <div className="p-6 text-sm text-rose-600">{error ?? "Account not found."}</div>;

  return (
    <CRMModuleDetailPage
      config={accountModuleConfig}
      rows={[account]}
      data={{
        notes,
        deals,
        openActivities: [],
        closedActivities: [],
        meetings: [],
        products: [],
        emails: [],
        attachments: [],
        connectedRecords: contacts.map((c) => ({
          id: c.id,
          parentId: id!,
          recordType: "Contact",
          name: c.contactName,
          owner: c.contactOwner,
          status: "Active",
        })),
        cases: [],
        quotes: [],
        salesOrders: [],
        purchaseOrders: [],
        invoices: [],
        timeline: [],
      }}
      onAction={(action) => {
        if (action === "Edit") navigate(`/accounts/${id}/edit`);
      }}
      onNavigate={(type: "deal" | "contact" | "account" | "lead", navId: string) => {
        navigate(`/${type}s/${navId}`);
      }}
    />
  );
}
