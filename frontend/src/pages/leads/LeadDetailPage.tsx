import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CRMModuleDetailPage from "../crm/CRMModuleDetailPage";
import { leadModuleConfig } from "../../components/modules/leads/leadsMockData";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [leadData, notesData, timelineData] = await Promise.all([
          getLeadById(id),
          getLeadNotes(id),
          getLeadTimeline(id),
        ]);
        setLead(leadData);
        setNotes(notesData);
        setTimeline(timelineData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lead");
      } finally {
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
        timeline,
      }}
    />
  );
}
