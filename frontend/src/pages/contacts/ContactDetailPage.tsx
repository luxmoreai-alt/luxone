import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { contactModuleConfig } from "../../components/modules/contacts/contactsMockData";
import { getContactById } from "../../lib/api/contactsApi";
import type { ContactRecord } from "../../lib/shared/crmTypes";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getContactById(id);
        setContact(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load contact"
        );
      } finally {
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
