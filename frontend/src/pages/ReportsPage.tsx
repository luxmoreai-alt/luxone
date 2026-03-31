import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarCheck2,
  CalendarRange,
  CircleDot,
  ClipboardList,
  Download,
  FileBarChart2,
  FileSpreadsheet,
  Package,
  RefreshCw,
  ShieldCheck,
  TableProperties,
  Users,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import CRMSectionCard from "../components/crm/CRMSectionCard";
import { apiRequest } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { readDashboardCache, writeDashboardCache } from "../lib/dashboardCache";

type ApiList<T> =
  | T[]
  | {
      count?: number;
      results?: T[];
      data?: T[];
    };

type SnapshotCounts = {
  leads: number;
  deals: number;
  tasks: number;
  invoices: number;
  cases: number;
};

type ReportTile = {
  title: string;
  description: string;
  route: string;
  label: string;
};

type ExportPreset = "1" | "5" | "10" | "custom";

function extractCount<T>(value: ApiList<T>): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value.count === "number") return value.count;
  if (Array.isArray(value.results)) return value.results.length;
  if (Array.isArray(value.data)) return value.data.length;
  return 0;
}

const REPORTS_CACHE_KEY = "reports-page-cache-v1";
const REPORTS_CACHE_TTL_MS = 10 * 60 * 1000;

function SnapshotCard({
  title,
  value,
  subtitle,
  icon,
  className = "",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-[#cfddee] px-5 py-5 text-white shadow-[0_16px_34px_rgba(36,58,94,0.12)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[#dbe8f8]">{title}</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#f8fbff]">{icon}</div>
      </div>
      <div className="mt-5 text-4xl font-semibold tracking-tight text-[#f8fbff]">{value}</div>
      <div className="mt-2 text-sm text-[#dbe8f8]">{subtitle}</div>
    </div>
  );
}

function WorkspaceIcon({
  icon,
  tone = "royal",
}: {
  icon: React.ReactNode;
  tone?: "royal" | "sky" | "violet";
}) {
  const toneClass =
    tone === "royal"
      ? "bg-[#e8f0fb] text-[#2d466f]"
      : tone === "sky"
        ? "bg-[#edf7f6] text-[#138f87]"
        : "bg-[#eff4fa] text-[#5f7393]";

  return <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</span>;
}

function DirectoryRow({
  title,
  description,
  label,
  onClick,
}: {
  title: string;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[1.1fr_1.4fr_0.8fr_32px] items-center gap-4 border-t border-[#e4ebf3] px-4 py-4 text-left transition hover:bg-[#f5f8fc]"
    >
      <div className="text-sm font-semibold text-[#12294d]">{title}</div>
      <div className="text-sm text-[#6f84a3]">{description}</div>
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#138f87]">{label}</div>
      <ArrowRight className="h-4 w-4 text-[#8ea1bb]" />
    </button>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { canAccess } = useAuth();
  const canViewSales = canAccess("sales");
  const canViewActivities = canAccess("activities");
  const canViewInventory = canAccess("inventory");
  const canViewSupport = canAccess("support");

  const [initialCache] = useState(() => readDashboardCache<SnapshotCounts>(REPORTS_CACHE_KEY, REPORTS_CACHE_TTL_MS));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportPreset, setExportPreset] = useState<ExportPreset>("1");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [counts, setCounts] = useState<SnapshotCounts>(
    initialCache?.state ?? {
      leads: 0,
      deals: 0,
      tasks: 0,
      invoices: 0,
      cases: 0,
    }
  );

  useEffect(() => {
    let active = true;
    const shouldFetch = refreshKey > 0 || !initialCache?.state;

    if (!shouldFetch) {
      setLoading(false);
      setRefreshing(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      try {
        setLoading(refreshKey === 0 && !initialCache?.state);
        setRefreshing(refreshKey > 0);

        const [leadsRes, dealsRes, tasksRes, invoicesRes, casesRes] = await Promise.allSettled([
          canViewSales ? apiRequest<ApiList<unknown>>("/leads/", { query: { page_size: 1 }, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
          canViewSales ? apiRequest<ApiList<unknown>>("/deals/", { query: { page_size: 1 }, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
          canViewActivities ? apiRequest<ApiList<unknown>>("/tasks/", { query: { page_size: 1 }, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
          canViewInventory ? apiRequest<ApiList<unknown>>("/invoices/", { query: { page_size: 1 }, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
          canViewSupport ? apiRequest<ApiList<unknown>>("/support/cases/", { query: { page_size: 1 }, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
        ]);

        if (!active) return;

        const nextCounts = {
          leads: leadsRes.status === "fulfilled" ? extractCount(leadsRes.value) : 0,
          deals: dealsRes.status === "fulfilled" ? extractCount(dealsRes.value) : 0,
          tasks: tasksRes.status === "fulfilled" ? extractCount(tasksRes.value) : 0,
          invoices: invoicesRes.status === "fulfilled" ? extractCount(invoicesRes.value) : 0,
          cases: casesRes.status === "fulfilled" ? extractCount(casesRes.value) : 0,
        };

        setCounts(nextCounts);
        writeDashboardCache(REPORTS_CACHE_KEY, nextCounts);
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [canViewActivities, canViewInventory, canViewSales, canViewSupport, initialCache?.state, refreshKey]);

  const reportGroups = useMemo(
    () =>
      [
        canViewSales
          ? {
              title: "Sales Reports",
              subtitle: "Lead, pipeline, and revenue-focused reporting views.",
              reports: [
                {
                  title: "Leads Overview",
                  description: "Review the latest lead volume, source mix, and conversion-ready records.",
                  route: "/leads",
                  label: "Open Leads",
                },
                {
                  title: "Deals Pipeline",
                  description: "Track active deals, closing pressure, and pipeline movement from one view.",
                  route: "/deals",
                  label: "Open Deals",
                },
                {
                  title: "Accounts and Contacts",
                  description: "Audit customer coverage before drilling into account-level or contact-level lists.",
                  route: "/accounts",
                  label: "Open Accounts",
                },
              ] as ReportTile[],
            }
          : null,
        canViewActivities
          ? {
              title: "Activity Reports",
              subtitle: "Operational visibility across follow-ups, meetings, and action items.",
              reports: [
                {
                  title: "Task Completion",
                  description: "See due work, open items, and pending follow-ups for the team.",
                  route: "/tasks",
                  label: "Open Tasks",
                },
                {
                  title: "Meetings Schedule",
                  description: "Review meeting load, upcoming schedules, and daily coordination flow.",
                  route: "/meetings",
                  label: "Open Meetings",
                },
              ] as ReportTile[],
            }
          : null,
        canViewInventory
          ? {
              title: "Inventory Reports",
              subtitle: "Commercial documents and billing-side reporting blocks.",
              reports: [
                {
                  title: "Invoices Register",
                  description: "Track invoiced volume, document status, and billing records in one place.",
                  route: "/invoices",
                  label: "Open Invoices",
                },
                {
                  title: "Sales Orders Flow",
                  description: "Review sales order movement before it reaches invoicing and fulfillment.",
                  route: "/sales-orders",
                  label: "Open Sales Orders",
                },
              ] as ReportTile[],
            }
          : null,
        canViewSupport
          ? {
              title: "Support Reports",
              subtitle: "Case tracking and service issue visibility.",
              reports: [
                {
                  title: "Cases Overview",
                  description: "Monitor support demand, open issues, and case handling progress.",
                  route: "/support/cases",
                  label: "Open Cases",
                },
              ] as ReportTile[],
            }
          : null,
      ].filter(Boolean) as Array<{ title: string; subtitle: string; reports: ReportTile[] }>,
    [canViewActivities, canViewInventory, canViewSales, canViewSupport]
  );

  const resolveExportDateRange = () => {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);

    if (exportPreset === "custom") {
      const resolvedStartDate = customStartDate || customEndDate;
      const resolvedEndDate = customEndDate || customStartDate;

      return {
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
      };
    }

    const days = Number(exportPreset);
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end,
    };
  };

  const { startDate, endDate } = resolveExportDateRange();
  const isDateRangeInvalid = exportPreset === "custom" && (!startDate || !endDate || startDate > endDate);

  const handleExportReports = async () => {
    if (isDateRangeInvalid) {
      window.alert("Choose a valid custom date range before exporting.");
      return;
    }

    try {
      setExporting(true);
      const XLSX = await import("xlsx");
      const exportedAt = new Date();

      const summaryRows = [
        { Metric: "Start Date", Value: startDate || "All Dates" },
        { Metric: "End Date", Value: endDate || "All Dates" },
        { Metric: "Lead Records", Value: counts.leads },
        { Metric: "Deal Records", Value: counts.deals },
        { Metric: "Task Records", Value: counts.tasks },
        { Metric: "Invoice Records", Value: counts.invoices },
        { Metric: "Case Records", Value: counts.cases },
        { Metric: "Exported At", Value: exportedAt.toLocaleString() },
      ];

      const reportRows = reportGroups.flatMap((group) =>
        group.reports.map((report) => ({
          Category: group.title,
          Report: report.title,
          Description: report.description,
          Action: report.label,
          Route: report.route,
        }))
      );

      const workbook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      const directorySheet = XLSX.utils.json_to_sheet(reportRows);

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, directorySheet, "Report Directory");
      XLSX.writeFile(workbook, `reports-export-${exportedAt.toISOString().slice(0, 10)}.xlsx`);
      setShowExportOptions(false);
    } catch {
      window.alert("Failed to export reports to Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-[linear-gradient(180deg,#f4f7fb_0%,#eef4f9_100%)] p-1">
        <div className="relative overflow-hidden rounded-[34px] border border-[#d5e0ec] bg-[linear-gradient(135deg,#fdfefe_0%,#f3f7fb_52%,#ffffff_100%)] px-6 py-5 shadow-[0_18px_42px_rgba(36,58,94,0.10)]">
          <div className="pointer-events-none absolute -right-8 top-0 h-44 w-44 rounded-full bg-[#dbe9f7] blur-3xl" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e1ed] bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2d466f] shadow-sm">
                <TableProperties className="h-3.5 w-3.5 text-[#2d466f]" />
                Reports Library
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#12294d]">Reports</h1>
              <p className="mt-2 text-sm text-[#5f7393]">Open report-ready module views, review record volumes, and jump into list-based reporting quickly.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <button
                type="button"
                onClick={() => setShowExportOptions(true)}
                disabled={exporting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#2d466f] bg-[#2d466f] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#24395a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
                {exporting ? "Exporting..." : "Export Excel"}
              </button>
              <button
                type="button"
                onClick={() => setRefreshKey((current) => current + 1)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#d5e0ec] bg-white px-4 py-2.5 text-sm font-medium text-[#2d466f] shadow-sm transition hover:bg-[#f3f7fb]"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh Reports"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {canViewSales ? (
            <SnapshotCard
              title="Lead Records"
              value={loading && !counts.leads ? "..." : String(counts.leads)}
              subtitle="Visible lead rows"
              icon={<CircleDot className="h-5 w-5 text-[#f8fbff]" />}
              className="bg-[linear-gradient(145deg,#304a74_0%,#3d5a87_58%,#203554_100%)]"
            />
          ) : null}
          {canViewSales ? (
            <SnapshotCard
              title="Deal Records"
              value={loading && !counts.deals ? "..." : String(counts.deals)}
              subtitle="Pipeline and won deals"
              icon={<BadgeDollarSign className="h-5 w-5 text-[#f8fbff]" />}
              className="bg-[linear-gradient(155deg,#3b5f92_0%,#4b74ab_42%,#294a77_100%)]"
            />
          ) : null}
          {canViewActivities ? (
            <SnapshotCard
              title="Task Records"
              value={loading && !counts.tasks ? "..." : String(counts.tasks)}
              subtitle="Activity reporting base"
              icon={<CalendarCheck2 className="h-5 w-5 text-[#f8fbff]" />}
              className="bg-[linear-gradient(140deg,#4f6b90_0%,#375174_55%,#6d88ab_100%)]"
            />
          ) : null}
          {canViewInventory ? (
            <SnapshotCard
              title="Invoice Records"
              value={loading && !counts.invoices ? "..." : String(counts.invoices)}
              subtitle="Billing-side report inputs"
              icon={<Package className="h-5 w-5 text-[#f8fbff]" />}
              className="bg-[linear-gradient(150deg,#2d466f_0%,#3d5a87_48%,#6f87a6_100%)]"
            />
          ) : null}
          {canViewSupport ? (
            <SnapshotCard
              title="Case Records"
              value={loading && !counts.cases ? "..." : String(counts.cases)}
              subtitle="Support workload visibility"
              icon={<ShieldCheck className="h-5 w-5 text-[#f8fbff]" />}
              className="bg-[linear-gradient(145deg,#3d5a87_0%,#2d466f_38%,#1f314d_100%)]"
            />
          ) : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-5">
            {reportGroups.map((group) => (
              <section key={group.title} className="overflow-hidden rounded-[30px] border border-[#d5e0ec] bg-white shadow-[0_10px_32px_rgba(36,58,94,0.08)]">
                <div className="border-b border-[#dbe4ef] bg-[#2d466f] px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-white">{group.title}</h2>
                      <p className="mt-1 text-sm text-[#dbe8f8]">{group.subtitle}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[1.1fr_1.4fr_0.8fr_32px] gap-4 bg-[#f2f6fb] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f6484]">
                  <div>Report</div>
                  <div>Description</div>
                  <div>Open</div>
                  <div />
                </div>
                <div>
                  {group.reports.map((report) => (
                    <DirectoryRow
                      key={report.title}
                      title={report.title}
                      description={report.description}
                      label={report.label}
                      onClick={() => navigate(report.route)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="space-y-5">
            <section className="rounded-[30px] border border-[#d5e0ec] bg-[linear-gradient(160deg,#2d466f_0%,#24395a_72%,#18263d_100%)] px-5 py-5 text-white shadow-[0_20px_44px_rgba(36,58,94,0.20)]">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#dbe8f8]">Collections</div>
              <div className="mt-2 text-xl font-semibold">Pinned Workspaces</div>
              <div className="mt-1 text-sm text-[#dbe8f8]">Jump to the areas your team will most often use for reporting and exports.</div>
              <div className="mt-5 space-y-3">
                {[
                  canViewSales ? { label: "Sales Workspace", route: "/leads", icon: <FileBarChart2 className="h-4 w-4" /> } : null,
                  canViewActivities ? { label: "Activity Workspace", route: "/tasks", icon: <ClipboardList className="h-4 w-4" /> } : null,
                  canViewInventory ? { label: "Billing Workspace", route: "/invoices", icon: <FileSpreadsheet className="h-4 w-4" /> } : null,
                  canViewSupport ? { label: "Support Workspace", route: "/support/cases", icon: <ShieldCheck className="h-4 w-4" /> } : null,
                  { label: "Analytics Dashboard", route: "/analytics", icon: <Users className="h-4 w-4" /> },
                ]
                  .filter(Boolean)
                  .map((item) => {
                    const collection = item as { label: string; route: string; icon: React.ReactNode };
                    return (
                      <button
                        key={collection.label}
                        type="button"
                        onClick={() => navigate(collection.route)}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:bg-white/10"
                      >
                        <span className="flex items-center gap-3">
                          <WorkspaceIcon
                            tone={collection.label === "Billing Workspace" ? "sky" : "violet"}
                            icon={collection.icon}
                          />
                          <span>{collection.label}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-[#c9d8ea]" />
                      </button>
                    );
                  })}
              </div>
            </section>

            <CRMSectionCard title="Suggested Flow" subtitle="Use reports differently from analytics so both pages stay useful.">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <div className="rounded-2xl border border-[#d5e0ec] bg-[#f2f6fb] px-4 py-3 text-[#2d466f]">
                  Start here when you want list-driven reporting, module filters, or an export-style workflow.
                </div>
                <div className="rounded-2xl border border-[#d5e0ec] bg-[#f2f6fb] px-4 py-3 text-[#2d466f]">
                  Use Analytics when you need trends, targets, performance, and chart-based summaries.
                </div>
                <div className="rounded-2xl border border-[#d5e0ec] bg-[#f2f6fb] px-4 py-3 text-[#2d466f]">
                  Open the matching module from these report directories, apply filters there, and review the records you need.
                </div>
              </div>
            </CRMSectionCard>
          </div>
        </div>
      </div>

      {showExportOptions ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-3xl rounded-[28px] border border-[#d5e0ec] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fc_100%)] p-6 shadow-[0_24px_70px_rgba(36,58,94,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#12294d]">Export Reports</h2>
                <p className="mt-1 text-sm text-[#5f7393]">Choose a preset range or switch to a custom date range before exporting.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportOptions(false)}
                className="rounded-full border border-[#d5e0ec] px-3 py-1 text-sm text-[#5f7393] transition hover:bg-[#f3f7fb]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                { label: "Today", value: "1" as ExportPreset, tone: "royal" as const },
                { label: "5 Days", value: "5" as ExportPreset, tone: "sky" as const },
                { label: "10 Days", value: "10" as ExportPreset, tone: "royal" as const },
                { label: "Custom", value: "custom" as ExportPreset, tone: "violet" as const },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setExportPreset(preset.value)}
                  className={`flex min-h-[78px] w-full items-center rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                    exportPreset === preset.value
                      ? "border-[#2d466f] bg-[#e8f0fb] text-[#2d466f]"
                      : "border-[#d5e0ec] bg-white text-[#5f7393] hover:bg-[#f8fbfd]"
                  }`}
                >
                  <span className="inline-flex w-full items-center gap-3">
                    <WorkspaceIcon
                      tone={preset.tone}
                      icon={
                        preset.value === "custom" ? (
                          <CalendarRange className="h-4 w-4" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4" />
                        )
                      }
                    />
                    <span className="flex min-w-0 flex-1 flex-col justify-center">
                      <span className="leading-5">{preset.label}</span>
                      <span className="text-xs font-normal text-[#6f84a3]">
                        {preset.value === "custom" ? "Pick your own dates" : "Quick preset range"}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {exportPreset === "custom" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#2d466f]">
                  <span className="mb-1 block">Start Date</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="w-full rounded-2xl border border-[#d5e0ec] bg-white px-4 py-2.5 text-sm text-[#12294d] outline-none transition focus:border-[#2d466f]"
                  />
                </label>
                <label className="text-sm font-medium text-[#138f87]">
                  <span className="mb-1 block">End Date</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="w-full rounded-2xl border border-[#cdebe7] bg-white px-4 py-2.5 text-sm text-[#12294d] outline-none transition focus:border-[#138f87]"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-[#d5e0ec] bg-[#f2f6fb] px-4 py-3 text-sm text-[#2d466f]">
                Export range: <span className="font-medium text-[#12294d]">{startDate}</span> to{" "}
                <span className="font-medium text-[#12294d]">{endDate}</span>
              </div>
            )}

            {isDateRangeInvalid ? (
              <p className="mt-3 text-sm text-rose-600">Choose at least one date, and make sure the end date is not before the start date.</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExportOptions(false)}
                className="rounded-2xl border border-[#d5e0ec] px-4 py-2.5 text-sm font-medium text-[#5f7393] transition hover:bg-[#f3f7fb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportReports}
                disabled={exporting || isDateRangeInvalid}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2d466f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#24395a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
                {exporting ? "Exporting..." : "Export Now"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
