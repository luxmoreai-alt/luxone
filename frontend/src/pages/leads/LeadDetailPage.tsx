import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import {
  leadAttachments,
  leadConnectedRecords,
  leadDeals,
  leadEmails,
  leadMeetings,
  leadModuleConfig,
  leadNotes,
  leadOpenActivities,
  leadClosedActivities,
  leadProducts,
  leadsMockList,
  leadTimeline,
} from "../../components/modules/leads/leadsMockData";

export default function LeadDetailPage() {
  return (
    <CRMModuleDetailPage
      config={leadModuleConfig}
      rows={leadsMockList}
      data={{
        notes: leadNotes,
        deals: leadDeals,
        openActivities: leadOpenActivities,
        closedActivities: leadClosedActivities,
        meetings: leadMeetings,
        products: leadProducts,
        emails: leadEmails,
        attachments: leadAttachments,
        connectedRecords: leadConnectedRecords,
        cases: [],
        quotes: [],
        salesOrders: [],
        purchaseOrders: [],
        invoices: [],
        timeline: leadTimeline,
      }}
    />
  );
}
