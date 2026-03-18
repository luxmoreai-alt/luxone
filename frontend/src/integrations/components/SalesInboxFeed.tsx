import CRMSectionCard from "../../components/crm/CRMSectionCard";
import type { SalesInboxFeedItem } from "../types";
import { formatDateTime } from "../utils";
import IntegrationStatusBadge from "./IntegrationStatusBadge";

type Props = {
  items: SalesInboxFeedItem[];
};

export default function SalesInboxFeed({ items }: Props) {
  return (
    <CRMSectionCard title="SalesInbox Feed">
      {!items.length ? (
        <p className="text-sm text-slate-500">No synced email messages available.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{item.subject}</h3>
                    {!item.is_read ? <IntegrationStatusBadge label="Unread" value="pending" /> : null}
                    {item.has_attachments ? <IntegrationStatusBadge label="Attachment" value="active" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.from_email}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Lead: {item.lead_name || "-"} | Contact: {item.contact_name || "-"} | Deal: {item.deal_name || "-"} | Account: {item.account_name || "-"}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>{formatDateTime(item.received_at)}</div>
                  <div className="mt-1">{item.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CRMSectionCard>
  );
}
