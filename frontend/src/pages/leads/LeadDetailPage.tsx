import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { leadModuleConfig } from "../../components/modules/leads/leadsMockData";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { fetchDeals, fetchLead, fetchLeadNotes, fetchLeadTimeline } from "../../api/crm";
import { mapDeal, mapLeadDetail, mapLeadNote, mapLeadTimeline } from "../../lib/shared/crmMappers";
import type { Activity, Attachment, Case, ConnectedRecord, Deal, EmailRecord, Invoice, LeadRecord, Meeting, Note, Product, PurchaseOrder, Quote, SalesOrder, TimelineItem } from "../../lib/shared/crmTypes";

type LeadDetailData = {
  row: LeadRecord;
  notes: Note[];
  deals: Deal[];
  timeline: TimelineItem[];
};

export default function LeadDetailPage() {
  const { id = "" } = useParams();
  const [data, setData] = useState<LeadDetailData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [lead, notes, timeline, deals] = await Promise.all([
          fetchLead(id),
          fetchLeadNotes(id),
          fetchLeadTimeline(id),
          fetchDeals(),
        ]);

        setData({
          row: mapLeadDetail(lead),
          notes: notes.map((item) => mapLeadNote(item, String(lead.id))),
          timeline: timeline.map((item) => mapLeadTimeline(item, String(lead.id))),
          deals: deals.filter((item) => item.lead === lead.id).map(mapDeal),
        });
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lead details");
      }
    };

    if (id) {
      void load();
    }
  }, [id]);

  if (error) {
    return <DashboardLayout><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div></DashboardLayout>;
  }

  if (!data) {
    return <DashboardLayout><div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading lead details...</div></DashboardLayout>;
  }

  const emptyActivities: Activity[] = [];
  const emptyAttachments: Attachment[] = [];
  const emptyConnected: ConnectedRecord[] = [];
  const emptyEmails: EmailRecord[] = [];
  const emptyMeetings: Meeting[] = [];
  const emptyProducts: Product[] = [];
  const emptyCases: Case[] = [];
  const emptyQuotes: Quote[] = [];
  const emptySalesOrders: SalesOrder[] = [];
  const emptyPurchaseOrders: PurchaseOrder[] = [];
  const emptyInvoices: Invoice[] = [];

  return (
    <CRMModuleDetailPage
      config={leadModuleConfig}
      rows={[data.row]}
      data={{
        notes: data.notes,
        deals: data.deals,
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
        timeline: data.timeline,
      }}
    />
  );
}
