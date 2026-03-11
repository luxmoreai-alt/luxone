import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { contactModuleConfig } from "../../components/modules/contacts/contactsMockData";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { fetchContact, fetchDeals } from "../../api/crm";
import { mapContact, mapDeal } from "../../lib/shared/crmMappers";
import type { Activity, Attachment, Case, ConnectedRecord, ContactRecord, Deal, EmailRecord, Invoice, Meeting, Note, Product, PurchaseOrder, Quote, SalesOrder, TimelineItem } from "../../lib/shared/crmTypes";

export default function ContactDetailPage() {
  const { id = "" } = useParams();
  const [record, setRecord] = useState<ContactRecord | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [contact, allDeals] = await Promise.all([fetchContact(id), fetchDeals()]);
        setRecord(mapContact(contact));
        setDeals(allDeals.filter((item) => item.contact === contact.id).map(mapDeal));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contact details");
      }
    };

    if (id) {
      void load();
    }
  }, [id]);

  if (error) {
    return <DashboardLayout><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div></DashboardLayout>;
  }

  if (!record) {
    return <DashboardLayout><div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading contact details...</div></DashboardLayout>;
  }

  const emptyNotes: Note[] = [];
  const emptyActivities: Activity[] = [];
  const emptyMeetings: Meeting[] = [];
  const emptyProducts: Product[] = [];
  const emptyEmails: EmailRecord[] = [];
  const emptyAttachments: Attachment[] = [];
  const emptyConnected: ConnectedRecord[] = [];
  const emptyCases: Case[] = [];
  const emptyQuotes: Quote[] = [];
  const emptySalesOrders: SalesOrder[] = [];
  const emptyPurchaseOrders: PurchaseOrder[] = [];
  const emptyInvoices: Invoice[] = [];
  const emptyTimeline: TimelineItem[] = [];

  return (
    <CRMModuleDetailPage
      config={contactModuleConfig}
      rows={[record]}
      data={{
        notes: emptyNotes,
        deals,
        openActivities: emptyActivities,
        closedActivities: emptyActivities,
        meetings: emptyMeetings,
        products: emptyProducts,
        emails: emptyEmails,
        attachments: emptyAttachments,
        connectedRecords: emptyConnected,
        cases: emptyCases,
        quotes: emptyQuotes,
        salesOrders: emptySalesOrders,
        purchaseOrders: emptyPurchaseOrders,
        invoices: emptyInvoices,
        timeline: emptyTimeline,
      }}
    />
  );
}
