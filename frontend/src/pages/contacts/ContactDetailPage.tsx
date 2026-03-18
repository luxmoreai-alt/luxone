import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, ExternalLink, User } from "lucide-react";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { contactModuleConfig } from "../../components/modules/contacts/contactsMockData";
import { getContactById, getContactNotes, getContactDeals } from "../../lib/api/contactsApi";
import type { ContactRecord, Deal, Note } from "../../lib/shared/crmTypes";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
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
          getContactNotes(id),
          getContactDeals(id),
        ]);
        setContact(contactData);
        setNotes(notesData);
        setDeals(dealsData);
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
          deals,
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
        onAction={(action) => {
          if (action === "Edit") navigate(`/contacts/${id}/edit`);
        }}
        onNavigate={(type: "deal" | "contact" | "account" | "lead", navId: string) => {
          navigate(`/${type}s/${navId}`);
        }}
      />
    </>
  );
}
