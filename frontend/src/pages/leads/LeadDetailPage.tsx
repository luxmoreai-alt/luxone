import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { leadModuleConfig } from "../../components/modules/leads/leadsMockData";
import { loadLeadLinkedData } from "../../lib/api/linkedRecordsApi";
import {
  getLeadById,
  getLeadNotes,
  getLeadTimeline,
} from "../../lib/api/leadsApi";
import type { LeadRecord, Note, TimelineItem } from "../../lib/shared/crmTypes";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [linkedData, setLinkedData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const leadData = await getLeadById(id);
        if (!leadData) {
          setLead(null);
          setLinkedData(null);
          return;
        }
        setLead(leadData);
        setLoading(false);

        const [notesData, timelineData, related] = await Promise.all([
          getLeadNotes(id).catch(() => []),
          getLeadTimeline(id).catch(() => []),
          loadLeadLinkedData(leadData).catch(() => null),
        ]);
        setNotes(notesData);
        setTimeline(timelineData);
        setLinkedData(related);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lead");
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading lead...</div>;
  }

  if (error || !lead) {
    return (
      <div className="p-6 text-sm text-rose-600">
        {error ?? "Lead not found."}
      </div>
    );
  }

  return (
    <CRMModuleDetailPage
      config={leadModuleConfig}
      rows={[lead]}
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
        quotes: linkedData?.quotes || [],
        salesOrders: linkedData?.salesOrders || [],
        purchaseOrders: linkedData?.purchaseOrders || [],
        invoices: linkedData?.invoices || [],
        timeline: [...timeline, ...(linkedData?.timeline || [])],
      }}
    />
  );
}
