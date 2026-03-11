import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import {
  contactAttachments,
  contactCases,
  contactClosedActivities,
  contactConnectedRecords,
  contactDeals,
  contactEmails,
  contactMeetings,
  contactModuleConfig,
  contactNotes,
  contactOpenActivities,
  contactProducts,
  contactsMockList,
  contactPurchaseOrders,
  contactQuotes,
  contactSalesOrders,
  contactTimeline,
} from "../../components/modules/contacts/contactsMockData";

export default function ContactDetailPage() {
  return (
    <CRMModuleDetailPage
      config={contactModuleConfig}
      rows={contactsMockList}
      data={{
        notes: contactNotes,
        deals: contactDeals,
        openActivities: contactOpenActivities,
        closedActivities: contactClosedActivities,
        meetings: contactMeetings,
        products: contactProducts,
        emails: contactEmails,
        attachments: contactAttachments,
        connectedRecords: contactConnectedRecords,
        cases: contactCases,
        quotes: contactQuotes,
        salesOrders: contactSalesOrders,
        purchaseOrders: contactPurchaseOrders,
        invoices: [],
        timeline: contactTimeline,
      }}
    />
  );
}
