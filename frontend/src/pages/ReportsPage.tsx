import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarCheck2,
  CircleDot,
  ClipboardList,
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
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbf8_100%)] px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">{icon}</div>
      </div>
      <div className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
    </div>
  );
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
      className="grid w-full grid-cols-[1.1fr_1.4fr_0.8fr_32px] items-center gap-4 border-t border-slate-100 px-4 py-4 text-left transition hover:bg-emerald-50/40"
    >
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-500">{description}</div>
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <ArrowRight className="h-4 w-4 text-slate-400" />
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
  const [refreshKey, setRefreshKey] = useState(0);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[34px] border border-[#d4dfcf] bg-[linear-gradient(135deg,#f7fcf6_0%,#edf8ef_48%,#ffffff_100%)] px-6 py-5 shadow-[0_18px_42px_rgba(42,110,66,0.09)]">
          <div className="pointer-events-none absolute -right-8 top-0 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-sm">
                <TableProperties className="h-3.5 w-3.5" />
                Reports Library
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Reports</h1>
              <p className="mt-2 text-sm text-slate-500">Open report-ready module views, review record volumes, and jump into list-based reporting quickly.</p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh Reports"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {canViewSales ? (
            <SnapshotCard
              title="Lead Records"
              value={loading && !counts.leads ? "..." : String(counts.leads)}
              subtitle="Visible lead rows"
              icon={<CircleDot className="h-5 w-5 text-violet-600" />}
            />
          ) : null}
          {canViewSales ? (
            <SnapshotCard
              title="Deal Records"
              value={loading && !counts.deals ? "..." : String(counts.deals)}
              subtitle="Pipeline and won deals"
              icon={<BadgeDollarSign className="h-5 w-5 text-blue-600" />}
            />
          ) : null}
          {canViewActivities ? (
            <SnapshotCard
              title="Task Records"
              value={loading && !counts.tasks ? "..." : String(counts.tasks)}
              subtitle="Activity reporting base"
              icon={<CalendarCheck2 className="h-5 w-5 text-emerald-600" />}
            />
          ) : null}
          {canViewInventory ? (
            <SnapshotCard
              title="Invoice Records"
              value={loading && !counts.invoices ? "..." : String(counts.invoices)}
              subtitle="Billing-side report inputs"
              icon={<Package className="h-5 w-5 text-amber-600" />}
            />
          ) : null}
          {canViewSupport ? (
            <SnapshotCard
              title="Case Records"
              value={loading && !counts.cases ? "..." : String(counts.cases)}
              subtitle="Support workload visibility"
              icon={<ShieldCheck className="h-5 w-5 text-cyan-600" />}
            />
          ) : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-5">
            {reportGroups.map((group) => (
              <section key={group.title} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">{group.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{group.subtitle}</p>
                </div>
                <div className="grid grid-cols-[1.1fr_1.4fr_0.8fr_32px] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
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
            <section className="rounded-[30px] border border-[#1d3d32] bg-[linear-gradient(160deg,#10221d_0%,#17362d_52%,#1d4b3d_100%)] px-5 py-5 text-white shadow-[0_20px_44px_rgba(16,34,29,0.22)]">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Collections</div>
              <div className="mt-2 text-xl font-semibold">Pinned Workspaces</div>
              <div className="mt-1 text-sm text-slate-400">Jump to the areas your team will most often use for reporting and exports.</div>
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
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-slate-100">{collection.icon}</span>
                          <span>{collection.label}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </button>
                    );
                  })}
              </div>
            </section>

            <CRMSectionCard title="Suggested Flow" subtitle="Use reports differently from analytics so both pages stay useful.">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  Start here when you want list-driven reporting, module filters, or an export-style workflow.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  Use Analytics when you need trends, targets, performance, and chart-based summaries.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  Open the matching module from these report directories, apply filters there, and review the records you need.
                </div>
              </div>
            </CRMSectionCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
