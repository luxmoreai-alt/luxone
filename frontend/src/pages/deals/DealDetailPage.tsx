import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, User, ArrowLeft, DollarSign, Calendar, FileText } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getDealById } from "../../services/dealsApi";
import { formatCurrency, formatDate } from "../../lib/helpers/dealHelpers";
import type { DealRecord } from "../../lib/types/dealTypes";

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<DealRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) { setError("Deal id is missing."); return; }
      try {
        const data = await getDealById(id);
        if (!data) { setError("Deal not found."); return; }
        setDeal(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load deal.");
      }
    };
    void load();
  }, [id]);

  if (error) return <DashboardLayout><div className="p-6 text-rose-600">{error}</div></DashboardLayout>;
  if (!deal) return <DashboardLayout><div className="p-6 text-slate-500">Loading deal...</div></DashboardLayout>;

  const stageColors: Record<string, string> = {
    "Qualification": "bg-slate-100 text-slate-700",
    "Needs Analysis": "bg-blue-100 text-blue-700",
    "Value Proposition": "bg-indigo-100 text-indigo-700",
    "Identify Decision Makers": "bg-purple-100 text-purple-700",
    "Proposal/Price Quote": "bg-amber-100 text-amber-700",
    "Negotiation/Review": "bg-orange-100 text-orange-700",
    "Closed Won": "bg-green-100 text-green-700",
    "Closed Lost": "bg-red-100 text-red-700",
  };
  const stageCls = stageColors[deal.stage] ?? "bg-slate-100 text-slate-700";

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate("/deals")} className="mt-1 rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{deal.dealName}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stageCls}`}>{deal.stage || "—"}</span>
            </div>
            <p className="text-sm text-slate-500">{deal.ownerName || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(deal.amount)}</p>
            <p className="text-xs text-slate-400">Deal Amount</p>
          </div>
        </div>

        {/* Related links */}
        <div className="flex flex-wrap gap-2">
          {deal.accountId && (
            <button
              type="button"
              onClick={() => navigate(`/accounts/${deal.accountId}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <Building2 className="h-4 w-4" />
              {deal.accountName || "View Account"}
            </button>
          )}
          {deal.contactId && (
            <button
              type="button"
              onClick={() => navigate(`/contacts/${deal.contactId}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100"
            >
              <User className="h-4 w-4" />
              {deal.contactName || "View Contact"}
            </button>
          )}
          {deal.leadId && (
            <button
              type="button"
              onClick={() => navigate(`/leads/${deal.leadId}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              <User className="h-4 w-4" />
              Converted from Lead
            </button>
          )}
        </div>

        {/* Details grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Deal Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <DollarSign className="h-4 w-4 text-green-500" />
              Deal Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Deal Name" value={deal.dealName} />
              <DetailField label="Amount" value={formatCurrency(deal.amount)} />
              <DetailField label="Expected Revenue" value={formatCurrency(deal.expectedRevenue ?? 0)} />
              <DetailField label="Probability" value={deal.probability ? `${deal.probability}%` : undefined} />
              <DetailField label="Stage" value={deal.stage} />
              <DetailField label="Type" value={deal.type} />
            </div>
          </div>

          {/* Timeline Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-blue-500" />
              Timeline
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Closing Date" value={formatDate(deal.closingDate)} />
              <DetailField label="Lead Source" value={deal.leadSource} />
              <DetailField label="Campaign Source" value={deal.campaignSource} />
              <DetailField label="Next Step" value={deal.nextStep} />
            </div>
          </div>
        </div>

        {/* Description */}
        {deal.description && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText className="h-4 w-4 text-slate-400" />
              Description
            </h2>
            <p className="text-sm text-slate-600">{deal.description}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
