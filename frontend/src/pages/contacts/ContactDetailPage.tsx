import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { contactModuleConfig } from "../../components/modules/contacts/contactsMockData";
import { getContactById, getContactNotes } from "../../lib/api/contactsApi";
import { loadContactLinkedData } from "../../lib/api/linkedRecordsApi";
import type { ContactRecord, Note } from "../../lib/shared/crmTypes";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactRecord | null>(null);
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
        const contactData = await getContactById(id);
        if (!contactData) {
          setContact(null);
          setLinkedData(null);
          return;
        }
        setContact(contactData);
        setLoading(false);

        const [notesData, related] = await Promise.all([
          getContactNotes(id).catch(() => []),
          loadContactLinkedData(id).catch(() => null),
        ]);
        setNotes(notesData);
        setLinkedData(related);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load contact"
        );
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">Loading contact...</div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-6 text-sm text-rose-600">
        {error ?? "Contact not found."}
      </div>
    );
  }

  return (
    <CRMModuleDetailPage
      config={contactModuleConfig}
      rows={[contact]}
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
        accounts: linkedData?.accounts || (contact.accountName ? [{ id: "", name: contact.accountName }] : []),
        quotes: linkedData?.quotes || [],
        salesOrders: linkedData?.salesOrders || [],
        purchaseOrders: linkedData?.purchaseOrders || [],
        invoices: linkedData?.invoices || [],
        timeline: linkedData?.timeline || [],
      }}
    />
  );
}
