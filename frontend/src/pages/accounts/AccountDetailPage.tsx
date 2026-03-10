import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import {
  accountAttachments,
  accountCases,
  accountClosedActivities,
  accountConnectedRecords,
  accountDeals,
  accountEmails,
  accountInvoices,
  accountModuleConfig,
  accountNotes,
  accountOpenActivities,
  accountProducts,
  accountQuotes,
  accountSalesOrders,
  accountTimeline,
  accountsMockList,
} from "../../components/modules/accounts/accountsMockData";

export default function AccountDetailPage() {
  return (
    <CRMModuleDetailPage
      config={accountModuleConfig}
      rows={accountsMockList}
      data={{
        notes: accountNotes,
        deals: accountDeals,
        openActivities: accountOpenActivities,
        closedActivities: accountClosedActivities,
        meetings: [],
        products: accountProducts,
        emails: accountEmails,
        attachments: accountAttachments,
        connectedRecords: accountConnectedRecords,
        cases: accountCases,
        quotes: accountQuotes,
        salesOrders: accountSalesOrders,
        purchaseOrders: [],
        invoices: accountInvoices,
        timeline: accountTimeline,
      }}
    />
  );
}
