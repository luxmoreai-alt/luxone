import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { accountModuleConfig } from "../../components/modules/accounts/accountsMockData";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { fetchAccount, fetchContacts, fetchDeals } from "../../api/crm";
import { mapAccount, mapContact, mapDeal } from "../../lib/shared/crmMappers";
import type { AccountRecord, Activity, Attachment, Case, ConnectedRecord, Deal, EmailRecord, Invoice, Meeting, Note, Product, PurchaseOrder, Quote, SalesOrder, TimelineItem } from "../../lib/shared/crmTypes";

export default function AccountDetailPage() {
  const { id = "" } = useParams();
  const [record, setRecord] = useState<AccountRecord | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [connectedRecords, setConnectedRecords] = useState<ConnectedRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [account, allDeals, allContacts] = await Promise.all([
          fetchAccount(id),
          fetchDeals(),
          fetchContacts(),
        ]);

        setRecord(mapAccount(account));
        setDeals(allDeals.filter((item) => item.account === account.id).map(mapDeal));
        setConnectedRecords(
          allContacts
            .filter((item) => item.account === account.id)
            .map((item) => {
              const contact = mapContact(item);
              return {
                id: contact.id,
                parentId: String(account.id),
                recordType: "Contact",
                name: contact.contactName,
                owner: contact.contactOwner,
                status: "Active",
              };
            })
        );
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account details");
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
    return <DashboardLayout><div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading account details...</div></DashboardLayout>;
  }

  const emptyNotes: Note[] = [];
  const emptyActivities: Activity[] = [];
  const emptyMeetings: Meeting[] = [];
  const emptyProducts: Product[] = [];
  const emptyEmails: EmailRecord[] = [];
  const emptyAttachments: Attachment[] = [];
  const emptyCases: Case[] = [];
  const emptyQuotes: Quote[] = [];
  const emptySalesOrders: SalesOrder[] = [];
  const emptyPurchaseOrders: PurchaseOrder[] = [];
  const emptyInvoices: Invoice[] = [];
  const emptyTimeline: TimelineItem[] = [];

  return (
    <CRMModuleDetailPage
      config={accountModuleConfig}
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
        connectedRecords,
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
