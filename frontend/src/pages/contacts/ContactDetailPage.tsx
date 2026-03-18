import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, ExternalLink, User } from "lucide-react";
import { contactModuleConfig } from "../../components/modules/contacts/contactsMockData";
import { getContactById, getContactDeals, getContactNotes } from "../../lib/api/contactsApi";
import { loadContactLinkedData } from "../../lib/api/linkedRecordsApi";
import type { ContactRecord, Deal, Note } from "../../lib/shared/crmTypes";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [linkedData, setLinkedData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [contactData, notesData, dealsData] = await Promise.all([
          getContactById(id),
          getContactNotes(id).catch(() => []),
          getContactDeals(id).catch(() => []),
        ]);

        if (!contactData) {
          setContact(null);
          setLinkedData(null);
          return;
        }

        setContact(contactData);
        setNotes(notesData);
        setDeals(dealsData);

        const related = await loadContactLinkedData(id).catch(() => null);
        setLinkedData({
          ...related,
          deals: related?.deals?.length ? related.deals : dealsData,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contact");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-slate-600">Loading contact...</div>;
  if (error || !contact) return <div className="p-6 text-sm text-rose-600">{error ?? "Contact not found."}</div>;

  return (
    <>
      {(contact.accountId || contact.createdFromLeadId) && (
        <div className="mx-4 mt-4 flex flex-wrap gap-2">
          {contact.accountId && (
            <button
              type="button"
              onClick={() => navigate(`/accounts/${contact.accountId}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <Building2 className="h-4 w-4" />
              Account: {contact.accountName || "View Account"}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </button>
          )}
          {contact.createdFromLeadId && (
            <button
              type="button"
              onClick={() => navigate(`/leads/${contact.createdFromLeadId}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              <User className="h-4 w-4" />
              Converted from Lead: {contact.createdFromLeadName || "View Lead"}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </button>
          )}
        </div>
      )}

      <CRMModuleDetailPage
        config={contactModuleConfig}
        rows={[contact]}
        data={{
          notes,
          deals: linkedData?.deals || deals,
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
          accounts:
            linkedData?.accounts ||
            (contact.accountName ? [{ id: contact.accountId || "", name: contact.accountName }] : []),
          quotes: linkedData?.quotes || [],
          salesOrders: linkedData?.salesOrders || [],
          purchaseOrders: linkedData?.purchaseOrders || [],
          invoices: linkedData?.invoices || [],
          timeline: linkedData?.timeline || [],
        }}
        onAction={(action) => {
          if (action === "Edit") navigate(`/contacts/${id}/edit`);
        }}
        onNavigate={(type, navId) => {
          navigate(`/${type}s/${navId}`);
        }}
      />
    </>
  );
}
