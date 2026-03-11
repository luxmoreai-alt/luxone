import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CRMDetailHeader from "../../components/crm/CRMDetailHeader";
import CRMEmptyState from "../../components/crm/CRMEmptyState";
import CRMInfoGrid from "../../components/crm/CRMInfoGrid";
import CRMRelatedList from "../../components/crm/CRMRelatedList";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import CRMTabs from "../../components/crm/CRMTabs";
import CRMTimeline from "../../components/crm/CRMTimeline";
import DashboardLayout from "../../components/layout/DashboardLayout";
import type {
  Activity,
  Attachment,
  CRMModuleConfig,
  CRMRecord,
  Deal,
  EmailRecord,
  Meeting,
  Note,
  Product,
  TimelineItem,
  ConnectedRecord,
  Case,
  Quote,
  SalesOrder,
  PurchaseOrder,
  Invoice,
} from "../../lib/shared/crmTypes";

type CRMDetailData = {
  notes: Note[];
  deals: Deal[];
  openActivities: Activity[];
  closedActivities: Activity[];
  meetings: Meeting[];
  products: Product[];
  emails: EmailRecord[];
  attachments: Attachment[];
  connectedRecords: ConnectedRecord[];
  cases: Case[];
  quotes: Quote[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  timeline: TimelineItem[];
};

type CRMModuleDetailPageProps<T extends CRMRecord> = {
  config: CRMModuleConfig<T>;
  rows: T[];
  data: CRMDetailData;
};

export default function CRMModuleDetailPage<T extends CRMRecord>({ config, rows, data }: CRMModuleDetailPageProps<T>) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");
  const [activeRelatedItem, setActiveRelatedItem] = useState(config.relatedListItems[0] || "");

  const record = useMemo(
    () => rows.find((row) => row.id === id) ?? rows[0],
    [id, rows]
  );

  const sectionIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    config.relatedListItems.forEach((item) => {
      map[item] = `${item.toLowerCase().replace(/\s+/g, "-")}-section`;
    });
    return map;
  }, [config.relatedListItems]);

  useEffect(() => {
    if (activeTab !== "overview") return;

    const observed = config.relatedListItems
      .map((item) => ({ item, element: document.getElementById(sectionIdMap[item]) }))
      .filter((entry): entry is { item: string; element: HTMLElement } => !!entry.element);

    if (observed.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const found = observed.find((item) => item.element.id === visible[0].target.id);
          if (found) setActiveRelatedItem(found.item);
        }
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0.1, 0.3, 0.6] }
    );

    observed.forEach((entry) => observer.observe(entry.element));
    return () => observer.disconnect();
  }, [activeTab, config.relatedListItems, sectionIdMap]);

  const renderSectionByType = (type: string) => {
    if (type === "attachments") {
      return data.attachments.length ? (
        <div className="space-y-2">{data.attachments.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.fileName} • {item.fileType}</div>)}</div>
      ) : (
        <CRMEmptyState message="No attachments available." />
      );
    }

    if (type === "deals") {
      return data.deals.length ? (
        <div className="space-y-2">{data.deals.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.dealName} • ${item.amount.toLocaleString()} • {item.stage}</div>)}</div>
      ) : (
        <CRMEmptyState message="No deals available." />
      );
    }

    if (type === "activities-open") {
      return data.openActivities.length ? (
        <div className="space-y-2">{data.openActivities.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.type}: {item.subject} • {item.status}</div>)}</div>
      ) : (
        <CRMEmptyState message="No open activities." />
      );
    }

    if (type === "activities-closed") {
      return data.closedActivities.length ? (
        <div className="space-y-2">{data.closedActivities.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.type}: {item.subject} • {item.status}</div>)}</div>
      ) : (
        <CRMEmptyState message="No closed activities." />
      );
    }

    if (type === "meetings") {
      return data.meetings.length ? (
        <div className="space-y-2">{data.meetings.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.title} • {item.status}</div>)}</div>
      ) : (
        <CRMEmptyState message="No invited meetings." />
      );
    }

    if (type === "products") {
      return data.products.length ? (
        <div className="space-y-2">{data.products.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.productName} • Qty {item.quantity}</div>)}</div>
      ) : (
        <CRMEmptyState message="No products available." />
      );
    }

    if (type === "emails") {
      return data.emails.length ? (
        <div className="space-y-2">{data.emails.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.subject} • {item.status}</div>)}</div>
      ) : (
        <CRMEmptyState message="No emails available." />
      );
    }

    if (type === "notes") {
      return data.notes.length ? (
        <div className="space-y-2">{data.notes.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.title}</div>)}</div>
      ) : (
        <CRMEmptyState message="No notes available." />
      );
    }

    if (type === "connected-records") {
      return data.connectedRecords.length ? (
        <div className="space-y-2">{data.connectedRecords.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.recordType}: {item.name}</div>)}</div>
      ) : (
        <CRMEmptyState message="No connected records." />
      );
    }

    if (type === "cases") {
      return data.cases.length ? (
        <div className="space-y-2">{data.cases.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.caseNumber} • {item.subject}</div>)}</div>
      ) : (
        <CRMEmptyState message="No cases available." />
      );
    }

    if (type === "quotes") {
      return data.quotes.length ? (
        <div className="space-y-2">{data.quotes.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.quoteName} • {item.status}</div>)}</div>
      ) : (
        <CRMEmptyState message="No quotes available." />
      );
    }

    if (type === "sales-orders") {
      return data.salesOrders.length ? (
        <div className="space-y-2">{data.salesOrders.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.orderNumber} • {item.status}</div>)}</div>
      ) : (
        <CRMEmptyState message="No sales orders available." />
      );
    }

    if (type === "purchase-orders") {
      return data.purchaseOrders.length ? (
        <div className="space-y-2">{data.purchaseOrders.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.poNumber} • {item.status}</div>)}</div>
      ) : (
        <CRMEmptyState message="No purchase orders available." />
      );
    }

    if (type === "invoices") {
      return data.invoices.length ? (
        <div className="space-y-2">{data.invoices.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">{item.invoiceNumber} • {item.status}</div>)}</div>
      ) : (
        <CRMEmptyState message="No invoices available." />
      );
    }

    return <CRMEmptyState message="No records available." />;
  };

  if (!record) return null;

  const avatarValue = (record as { avatar?: unknown }).avatar;
  const avatar =
    typeof avatarValue === "string" && avatarValue.trim().length > 0
      ? avatarValue
      : String(record[config.nameKey] || "").slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <CRMDetailHeader
          title={String(record[config.nameKey] || "")}
          subtitle={String(record[config.subtitleKey] || "")}
          avatar={avatar}
          actions={config.headerActions}
          onBack={() => navigate(config.baseRoute)}
        />

        <CRMTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <CRMRelatedList
            items={config.relatedListItems}
            activeItem={activeRelatedItem}
            onSelect={(item) => {
              setActiveTab("overview");
              setActiveRelatedItem(item);
              window.setTimeout(() => {
                const targetId = sectionIdMap[item];
                const element = document.getElementById(targetId);
                element?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 0);
            }}
          />

          {activeTab === "timeline" ? (
            <CRMTimeline items={data.timeline.filter((item) => item.parentId === record.id)} />
          ) : (
            <div className="space-y-4">
              <section id="top-summary-block-section" className="scroll-mt-24">
                <CRMSectionCard title="Top Summary Block">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {config.summaryFields.map((field) => (
                      <div key={field.key}>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
                        <p className="mt-1 text-sm text-slate-800">{String(record[field.key] || "-")}</p>
                      </div>
                    ))}
                  </div>
                </CRMSectionCard>
              </section>

              {config.detailSections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <CRMSectionCard title={section.title}>
                    {section.type === "info" && section.fields ? (
                      <CRMInfoGrid record={record} fields={section.fields as never} />
                    ) : (
                      renderSectionByType(section.type)
                    )}
                  </CRMSectionCard>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
