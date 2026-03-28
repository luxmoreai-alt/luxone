import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Building2, CircleDollarSign, Funnel, RefreshCw, Users } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import CRMSectionCard from "../components/crm/CRMSectionCard";
import { getAccounts } from "../lib/api/accountsApi";
import { getContacts } from "../lib/api/contactsApi";
import { getDeals } from "../lib/api/dealsApi";
import { getLeads } from "../lib/api/leadsApi";
import { getInventoryList } from "../inventory/api";
import { useAuth } from "../hooks/useAuth";
import type { AccountRecord, ContactRecord, Deal, LeadRecord } from "../lib/shared/crmTypes";
import { readDashboardCache, writeDashboardCache } from "../lib/dashboardCache";

type AnalyticsState = {
  leads: LeadRecord[];
  deals: Deal[];
  accounts: AccountRecord[];
  contacts: ContactRecord[];
  invoices: Array<{ id: string; owner: string; grandTotal: number; invoiceDate: string; dueDate: string; status: string }>;
};

type InvoiceAnalyticsRow = {
  id: string;
  owner?: string;
  grandTotal?: number;
  invoiceDate?: string;
  dueDate?: string;
  status?: string;
  createdAt?: string;
};

const PIE_COLORS = ["#76d68a", "#6daac9", "#4f6ecf", "#ef5130", "#ffbd36", "#c069c5", "#1bc5c3", "#a7b2c8"];
const ANALYTICS_CACHE_KEY = "analytics-page-cache-v2";
const ANALYTICS_CACHE_TTL_MS = 10 * 60 * 1000;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyCompact(value: number) {
  if (Math.abs(value) < 100000) {
    return formatCurrency(value);
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function monthLabel(date = new Date()) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameMonth(value?: string, base = new Date()) {
  const parsed = parseDate(value);
  if (!parsed) return false;
  return parsed.getFullYear() === base.getFullYear() && parsed.getMonth() === base.getMonth();
}

function isOpenDeal(stage?: string) {
  const normalized = (stage || "").trim().toLowerCase();
  return normalized !== "closed won" && normalized !== "closed lost" && normalized !== "closed lost to competition";
}

function isWonDeal(stage?: string) {
  return (stage || "").trim().toLowerCase() === "closed won";
}

function getMonthlySeries(length: number) {
  const now = new Date();
  return Array.from({ length }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (length - index - 1), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      date,
    };
  });
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function metricDelta(current: number, previous: number) {
  if (previous <= 0 && current > 0) return 100;
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatLastUpdated(value: number | null) {
  if (!value) return "Not updated yet";
  const seconds = Math.max(1, Math.round((Date.now() - value) / 1000));
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `Updated ${hours}h ago`;
}

function MetricCard({
  title,
  value,
  delta,
  note,
  icon,
}: {
  title: string;
  value: string;
  delta?: number;
  note: string;
  icon: React.ReactNode;
}) {
  const positive = (delta ?? 0) >= 0;

  return (
    <div className="min-w-0 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</div>
          <div className="mt-4 min-w-0">
            <div className="break-words text-[clamp(2rem,2.3vw,2.8rem)] font-semibold leading-[1.05] tracking-tight text-slate-900">
              {value}
            </div>
            {delta !== undefined ? (
              <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                <ArrowUpRight className={`h-4 w-4 ${positive ? "" : "rotate-90"}`} />
                {Math.abs(delta)}%
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
      <div className="mt-5 break-words text-sm text-slate-500">{note}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, formatter }: { active?: boolean; payload?: any[]; formatter?: (value: number) => string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-3">
          <span className="text-slate-500">{entry.name}</span>
          <span className="font-semibold text-slate-900">{formatter ? formatter(Number(entry.value)) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { canAccess } = useAuth();
  const [initialCache] = useState(() => readDashboardCache<AnalyticsState>(ANALYTICS_CACHE_KEY, ANALYTICS_CACHE_TTL_MS));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(initialCache?.savedAt ?? null);
  const [state, setState] = useState<AnalyticsState>(
    initialCache?.state || {
      leads: [],
      deals: [],
      accounts: [],
      contacts: [],
      invoices: [],
    }
  );

  useEffect(() => {
    let active = true;
    const hasCachedState = Boolean(initialCache?.state);
    const manualRefresh = refreshKey > 0;
    const shouldFetch = manualRefresh || !hasCachedState;

    if (!shouldFetch) {
      setLoading(false);
      setRefreshing(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      try {
        setLoading(!hasCachedState);
        setRefreshing(manualRefresh);
        setError(null);

        const [leadsResult, dealsResult, accountsResult, contactsResult, invoicesResult] = await Promise.allSettled([
          canAccess("sales") ? getLeads({ pageSize: 100, maxPages: 2, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
          canAccess("sales") ? getDeals({ pageSize: 100, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
          canAccess("sales") ? getAccounts({ pageSize: 100, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
          canAccess("sales") ? getContacts({ pageSize: 100, maxPages: 2, cacheTtlMs: 5 * 60 * 1000 }) : Promise.resolve([]),
          getInventoryList("invoices", { pageSize: 100, cacheTtlMs: 5 * 60 * 1000 }),
        ]);

        if (!active) return;

        const nextState = {
          leads: leadsResult.status === "fulfilled" ? leadsResult.value : [],
          deals: dealsResult.status === "fulfilled" ? dealsResult.value : [],
          accounts: accountsResult.status === "fulfilled" ? accountsResult.value : [],
          contacts: contactsResult.status === "fulfilled" ? contactsResult.value : [],
          invoices:
            invoicesResult.status === "fulfilled"
              ? (invoicesResult.value as InvoiceAnalyticsRow[]).map((row) => ({
                  id: row.id,
                  owner: row.owner || "Unassigned",
                  grandTotal: Number(row.grandTotal || 0),
                  invoiceDate: row.invoiceDate || row.createdAt || "",
                  dueDate: row.dueDate || "",
                  status: row.status || "",
                }))
              : [],
        };

        setState(nextState);
        writeDashboardCache(ANALYTICS_CACHE_KEY, nextState);
        setLastUpdatedAt(Date.now());
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load analytics.");
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
  }, [canAccess, refreshKey]);

  const analytics = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const leadsThisMonth = state.leads.filter((item) => isSameMonth(item.createdAt, now));
    const leadsPreviousMonth = state.leads.filter((item) => isSameMonth(item.createdAt, previousMonth));
    const accountsThisMonth = state.accounts.filter((item) => isSameMonth(item.createdAt, now));
    const accountsPreviousMonth = state.accounts.filter((item) => isSameMonth(item.createdAt, previousMonth));

    const dealsCreatedThisMonth = state.deals.filter((item) => isSameMonth(item.createdAt || item.closingDate, now));
    const dealsCreatedPreviousMonth = state.deals.filter((item) => isSameMonth(item.createdAt || item.closingDate, previousMonth));
    const pipelineDeals = state.deals.filter((item) => isOpenDeal(item.stage));
    const wonDealsThisMonth = state.deals.filter((item) => isWonDeal(item.stage) && isSameMonth(item.closingDate, now));
    const openAmount = pipelineDeals.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const wonRevenue = wonDealsThisMonth.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const invoicesThisMonth = state.invoices.filter((item) => isSameMonth(item.invoiceDate, now));
    const invoicesPreviousMonth = state.invoices.filter((item) => isSameMonth(item.invoiceDate, previousMonth));
    const invoiceRevenue = invoicesThisMonth.reduce((sum, item) => sum + item.grandTotal, 0);
    const previousInvoiceRevenue = invoicesPreviousMonth.reduce((sum, item) => sum + item.grandTotal, 0);

    const leadSources = Object.entries(
      state.leads.reduce<Record<string, number>>((acc, item) => {
        const key = item.leadSource?.trim() || "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);

    const ownerRows = Object.values(
      state.deals.reduce<Record<string, { owner: string; revenue: number; won: number; open: number }>>((acc, item) => {
        const key = item.dealOwner?.trim() || "Unassigned";
        if (!acc[key]) {
          acc[key] = { owner: key, revenue: 0, won: 0, open: 0 };
        }
        if (isWonDeal(item.stage)) {
          acc[key].revenue += Number(item.amount || 0);
          acc[key].won += 1;
        } else if (isOpenDeal(item.stage)) {
          acc[key].open += 1;
        }
        return acc;
      }, {})
    )
      .sort((left, right) => right.revenue - left.revenue || right.won - left.won)
      .slice(0, 5);

    const monthSeries = getMonthlySeries(3).map((entry) => {
      const monthLeads = state.leads.filter((item) => isSameMonth(item.createdAt, entry.date)).length;
      const monthDeals = state.deals.filter((item) => isSameMonth(item.createdAt || item.closingDate, entry.date)).length;
      const monthWon = state.deals
        .filter((item) => isWonDeal(item.stage) && isSameMonth(item.closingDate, entry.date))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return {
        month: entry.label,
        leads: monthLeads,
        deals: monthDeals,
        revenue: monthWon,
      };
    });

    const currentLeadTarget = Math.max(10, Math.ceil(leadsThisMonth.length / 10) * 10 || 10);
    const currentRevenueTarget = Math.max(invoiceRevenue, wonRevenue, 100000);
    const revenueGoal = Math.ceil(currentRevenueTarget / 100000) * 100000;

    const leadGaugeData = [{ name: "Leads", value: Math.min(100, Math.round((leadsThisMonth.length / currentLeadTarget) * 100)) }];
    const revenueGaugeData = [{ name: "Revenue", value: Math.min(100, Math.round((invoiceRevenue / revenueGoal) * 100)) }];
    const ownerRowsWithRevenue = ownerRows.filter((item) => item.revenue > 0 || item.won > 0);

    return {
      leadsThisMonth: leadsThisMonth.length,
      leadsPreviousMonth: leadsPreviousMonth.length,
      accountsThisMonth: accountsThisMonth.length,
      accountsPreviousMonth: accountsPreviousMonth.length,
      contactsThisMonth: state.contacts.filter((item) => isSameMonth(item.createdAt, now)).length,
      dealsCreatedThisMonth: dealsCreatedThisMonth.length,
      dealsCreatedPreviousMonth: dealsCreatedPreviousMonth.length,
      wonDealsThisMonth: wonDealsThisMonth.length,
      pipelineDeals: pipelineDeals.length,
      invoiceRevenue,
      previousInvoiceRevenue,
      wonRevenue,
      openAmount,
      leadSources,
      ownerRows: ownerRowsWithRevenue,
      monthSeries,
      leadGaugeData,
      revenueGaugeData,
      currentLeadTarget,
      revenueGoal,
    };
  }, [state]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[34px] border border-[#c9d7f2] bg-[linear-gradient(135deg,#f7fbff_0%,#eef4ff_44%,#ffffff_100%)] shadow-[0_18px_42px_rgba(79,110,207,0.10)]">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#4f6ecf]/10 blur-3xl" />
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">Executive Dashboard</div>
              <h1 className="mt-2 text-[2.15rem] font-semibold tracking-[-0.04em] text-slate-950">Analytics</h1>
              <p className="mt-1 text-sm text-slate-500">Performance, targets, and pipeline trends from your CRM.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">All Modules</div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">{monthLabel()}</div>
              <button
                type="button"
                onClick={() => setRefreshKey((current) => current + 1)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Updated</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{formatLastUpdated(lastUpdatedAt).replace("Updated ", "")}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Revenue Goal</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrencyCompact(analytics.revenueGoal)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Won This Month</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{loading && !analytics.wonRevenue ? "..." : formatCurrencyCompact(analytics.wonRevenue)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Lead Target</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{analytics.currentLeadTarget}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <MetricCard
            title="Leads This Month"
            value={loading && !analytics.leadsThisMonth ? "..." : String(analytics.leadsThisMonth)}
            delta={metricDelta(analytics.leadsThisMonth, analytics.leadsPreviousMonth)}
            note={`Last month: ${analytics.leadsPreviousMonth}`}
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Revenue This Month"
            value={loading && !analytics.invoiceRevenue ? "..." : formatCurrencyCompact(analytics.invoiceRevenue)}
            delta={metricDelta(analytics.invoiceRevenue, analytics.previousInvoiceRevenue)}
            note={`Last month: ${formatCurrency(analytics.previousInvoiceRevenue)}`}
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
          <MetricCard
            title="Deals In Pipeline"
            value={loading && !analytics.pipelineDeals ? "..." : String(analytics.pipelineDeals)}
            note={`${formatCurrency(analytics.openAmount)} open amount`}
            icon={<Funnel className="h-5 w-5" />}
          />
          <MetricCard
            title="Accounts This Month"
            value={loading && !analytics.accountsThisMonth ? "..." : String(analytics.accountsThisMonth)}
            delta={metricDelta(analytics.accountsThisMonth, analytics.accountsPreviousMonth)}
            note={`Last month: ${analytics.accountsPreviousMonth}`}
            icon={<Building2 className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
          <CRMSectionCard title="Lead Generation Target" subtitle={`Live progress for ${monthLabel()}`}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-[240px]">
                {loading && !analytics.leadsThisMonth ? (
                  <AnalyticsPlaceholder />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="65%"
                      outerRadius="100%"
                      startAngle={180}
                      endAngle={0}
                      barSize={20}
                      data={analytics.leadGaugeData}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={20} fill="#4f6ecf" background={{ fill: "#e5ebf7" }} />
                      <text x="50%" y="62%" textAnchor="middle" className="fill-slate-900 text-[28px] font-semibold">
                        {analytics.leadsThisMonth}
                      </text>
                      <text x="50%" y="75%" textAnchor="middle" className="fill-slate-500 text-[12px]">
                        Remaining {Math.max(analytics.currentLeadTarget - analytics.leadsThisMonth, 0)}
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="space-y-4 rounded-3xl bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current Month Scorecard</div>
                <ScoreRow label="Leads Created" value={loading && !analytics.leadsThisMonth ? "..." : analytics.leadsThisMonth} />
                <ScoreRow label="Contacts Added" value={loading && !analytics.contactsThisMonth ? "..." : analytics.contactsThisMonth} />
                <ScoreRow label="Deals Created" value={loading && !analytics.dealsCreatedThisMonth ? "..." : analytics.dealsCreatedThisMonth} />
                <ScoreRow label="Deals Won" value={loading && !analytics.wonDealsThisMonth ? "..." : analytics.wonDealsThisMonth} />
                <ScoreRow label="Revenue Won" value={loading && !analytics.wonRevenue ? "..." : formatCurrency(analytics.wonRevenue)} />
                <ScoreRow label="Open Amount" value={loading && !analytics.openAmount ? "..." : formatCurrency(analytics.openAmount)} />
              </div>
            </div>
          </CRMSectionCard>

          <CRMSectionCard title="Revenue Target" subtitle="Won revenue and invoiced revenue against a dynamic monthly goal">
            <div className="h-[240px]">
              {loading && !analytics.invoiceRevenue && !analytics.wonRevenue ? (
                <AnalyticsPlaceholder />
              ) : analytics.invoiceRevenue > 0 || analytics.wonRevenue > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Achieved", amount: analytics.invoiceRevenue },
                      { name: "Won", amount: analytics.wonRevenue },
                      { name: "Goal", amount: analytics.revenueGoal },
                    ]}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={70} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                    <Bar dataKey="amount" radius={[0, 16, 16, 0]}>
                      {["#9ebcf2", "#4f6ecf", "#dfe6f2"].map((color) => (
                        <Cell key={color} fill={color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl bg-slate-50 px-6 text-center text-sm text-slate-500">
                  Revenue bars will become more meaningful once this month records some won or invoiced value.
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Target</span>
              <span className="font-semibold text-slate-900">{formatCurrency(analytics.revenueGoal)}</span>
            </div>
          </CRMSectionCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
          <CRMSectionCard title="Last 3 Months Performance" subtitle="Momentum across leads, deals, and won revenue">
            <div className="mb-3 flex flex-wrap gap-2 px-4 pt-4">
              <LegendPill label="Leads" color="#4f6ecf" />
              <LegendPill label="Deals" color="#9ebcf2" />
              <LegendPill label="Won Revenue" color="#76d68a" />
            </div>
            <div className="h-[360px]">
              {loading && !analytics.monthSeries.some((item) => item.leads || item.deals || item.revenue) ? (
                <AnalyticsPlaceholder />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={compactNumber} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip formatter={(value) => value > 999 ? formatCurrency(value) : String(value)} />} />
                    <Bar yAxisId="left" dataKey="leads" fill="#4f6ecf" radius={[10, 10, 0, 0]} name="Leads" />
                    <Bar yAxisId="left" dataKey="deals" fill="#9ebcf2" radius={[10, 10, 0, 0]} name="Deals" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#76d68a" radius={[10, 10, 0, 0]} name="Won Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CRMSectionCard>

          <CRMSectionCard title="Leads By Source" subtitle="Distribution of incoming lead channels">
            <div className="h-[360px]">
              {loading && !analytics.leadSources.length ? (
                <AnalyticsPlaceholder />
              ) : analytics.leadSources.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.leadSources}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ name, value, percent }) => `${name} ${value} (${Math.round((percent || 0) * 100)}%)`}
                    >
                      {analytics.leadSources.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No lead source data yet.</div>
              )}
            </div>
          </CRMSectionCard>

          <CRMSectionCard title="Prolific Sales Owners" subtitle="Top performers by won value">
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="grid grid-cols-[1.4fr_1fr_0.8fr] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                <div>Owner</div>
                <div>Won Value</div>
                <div>Deals Won</div>
              </div>
              {analytics.ownerRows.length ? (
                analytics.ownerRows.map((row, rowIndex) => (
                  <div key={row.owner} className="grid grid-cols-[1.4fr_1fr_0.8fr] items-center border-t border-slate-100 px-4 py-4 text-sm">
                    <div className="font-medium text-slate-800">{rowIndex + 1}. {row.owner}</div>
                    <div className="font-semibold text-slate-900">{formatCurrency(row.revenue)}</div>
                    <div className="text-slate-500">{row.won}</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-sm text-slate-500">No sales owners have closed won revenue this month yet.</div>
              )}
            </div>
          </CRMSectionCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <CRMSectionCard title="Pipeline Health" subtitle="Open versus won value from your live deals">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Open Pipeline</div>
                <div className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(analytics.openAmount)}</div>
                <div className="mt-2 text-sm text-slate-500">{analytics.pipelineDeals} active deals still in motion</div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Won Revenue</div>
                <div className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(analytics.wonRevenue)}</div>
                <div className="mt-2 text-sm text-slate-500">{analytics.wonDealsThisMonth} deals marked closed won this month</div>
              </div>
            </div>
          </CRMSectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

function AnalyticsPlaceholder() {
  return (
    <div className="flex h-full items-end gap-3 rounded-3xl bg-slate-50 px-6 py-6">
      <div className="h-24 w-12 animate-pulse rounded-t-2xl bg-slate-200" />
      <div className="h-36 w-12 animate-pulse rounded-t-2xl bg-slate-200" />
      <div className="h-28 w-12 animate-pulse rounded-t-2xl bg-slate-200" />
      <div className="h-44 w-12 animate-pulse rounded-t-2xl bg-slate-200" />
      <div className="h-20 w-12 animate-pulse rounded-t-2xl bg-slate-200" />
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[1.1fr_0.9fr] items-center gap-3 border-b border-slate-200/70 pb-3 last:border-b-0 last:pb-0">
      <div className="text-sm font-medium uppercase leading-tight tracking-[0.08em] text-slate-600">{label}</div>
      <div className="text-right text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function LegendPill({ label, color }: { label: string; color: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}
