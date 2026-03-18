import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  Phone,
  CircleDot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckSquare,
  Clock,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { apiRequest } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import AdminDashboard from "./admin/AdminDashboard";
import ManagerDashboard from "./manager/ManagerDashboard";

// ── Types ─────────────────────────────────────────────────────────────────────

type Task = {
  id: number | string;
  subject?: string;
  due_date?: string | null;
  status?: string | null;
  priority?: string | null;
};

type Meeting = {
  id: number | string;
  title?: string;
  subject?: string;
  start_datetime?: string | null;
  end_datetime?: string | null;
  from_datetime?: string | null;
  to_datetime?: string | null;
  related_to?: string | null;
  account_name?: string | null;
  contact_name?: string | null;
};

type Lead = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  lead_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  lead_status?: string | null;
  lead_source?: string | null;
  created_at?: string;
};

type Deal = {
  id: number | string;
  name?: string;
  deal_name?: string;
  amount?: number | null;
  stage?: string | null;
  closing_date?: string | null;
};

type ApiList<T> = T[] | { results?: T[]; data?: T[] };

function extractList<T>(res: ApiList<T>): T[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isToday(value?: string | null) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function formatCurrency(amount?: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function getLeadName(lead: Lead) {
  if (lead.lead_name) return lead.lead_name;
  const parts = [lead.first_name, lead.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function getDealName(deal: Deal) {
  return deal.name || deal.deal_name || "—";
}

function getMeetingTitle(m: Meeting) {
  return m.title || m.subject || "—";
}

const PAGE_SIZE = 5;

function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { paged, page, totalPages, setPage, total: items.length };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 min-w-[150px] items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:shadow-md"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </button>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  title: string;
  children: React.ReactNode;
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {total > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{start} - {end}</span>
            <button type="button" onClick={onPrev} disabled={page === 1} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30">
              <ChevronLeft size={15} />
            </button>
            <button type="button" onClick={onNext} disabled={page === totalPages} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30">
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority?: string | null }) {
  const p = (priority || "").toLowerCase();
  const cls =
    p === "highest" || p === "critical" ? "bg-red-100 text-red-700"
    : p === "high" ? "bg-orange-100 text-orange-700"
    : p === "normal" || p === "medium" ? "bg-sky-100 text-sky-700"
    : p === "low" ? "bg-slate-100 text-slate-600"
    : p === "lowest" ? "bg-slate-50 text-slate-400"
    : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {priority || "—"}
    </span>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();
  const cls =
    s.includes("complet") || s.includes("won") ? "bg-emerald-100 text-emerald-700"
    : s.includes("progress") ? "bg-blue-100 text-blue-700"
    : s.includes("wait") ? "bg-amber-100 text-amber-700"
    : s.includes("lost") ? "bg-red-100 text-red-700"
    : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status || "—"}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();

  // Render role-specific dashboards for admin and manager
  if (isAdmin) {
    return (
      <DashboardLayout>
        <AdminDashboard />
      </DashboardLayout>
    );
  }

  if (isManager) {
    return (
      <DashboardLayout>
        <ManagerDashboard />
      </DashboardLayout>
    );
  }
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const [tasksRes, meetingsRes, leadsRes, dealsRes] = await Promise.allSettled([
          apiRequest<ApiList<Task>>("/tasks/"),
          apiRequest<ApiList<Meeting>>("/meetings/"),
          apiRequest<ApiList<Lead>>("/leads/"),
          apiRequest<ApiList<Deal>>("/deals/"),
        ]);

        if (!active) return;

        if (tasksRes.status === "fulfilled") setTasks(extractList(tasksRes.value));
        if (meetingsRes.status === "fulfilled") setMeetings(extractList(meetingsRes.value));
        if (leadsRes.status === "fulfilled") setLeads(extractList(leadsRes.value));
        if (dealsRes.status === "fulfilled") setDeals(extractList(dealsRes.value));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchAll();
    return () => { active = false; };
  }, [refreshKey]);

  // Today filters
  const todayTasks = tasks.filter((t) => {
    const s = (t.status || "").toLowerCase();
    return !s.includes("complet");
  });

  const dueTodayTasks = tasks.filter((t) => {
    const s = (t.status || "").toLowerCase();
    return isToday(t.due_date) && !s.includes("complet");
  });

  const todayMeetings = meetings.filter((m) =>
    isToday(m.start_datetime || m.from_datetime)
  ).concat(
    // fallback: show all meetings if none are today
    meetings.filter((m) => !isToday(m.start_datetime || m.from_datetime)).slice(0, 0)
  );

  const displayMeetings = todayMeetings.length > 0 ? todayMeetings : meetings;

  const todayLeads = leads.filter((l) => isToday(l.created_at));
  const displayLeads = todayLeads.length > 0 ? todayLeads : leads;

  const thisMonthDeals = deals.filter((d) => {
    if (!d.closing_date) return false;
    const cd = new Date(d.closing_date);
    const now = new Date();
    return cd.getFullYear() === now.getFullYear() && cd.getMonth() === now.getMonth();
  });
  const displayDeals = thisMonthDeals.length > 0 ? thisMonthDeals : deals;

  // Pagination
  const todayTaskPag = usePagination(dueTodayTasks);
  const taskPag = usePagination(todayTasks);
  const meetPag = usePagination(displayMeetings);
  const leadPag = usePagination(displayLeads);
  const dealPag = usePagination(displayDeals);

  // Stats
  const openDeals = deals.filter((d) => {
    const s = (d.stage || "").toLowerCase();
    return !s.includes("closed");
  }).length;

  const callsToday = 0; // placeholder — add calls API if needed

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading dashboard...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 px-6 py-6">

        {/* Welcome header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Home</h1>
            <p className="text-sm text-slate-500 mt-0.5">Welcome back — here's your day at a glance.</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-6 flex flex-wrap gap-3">
          <StatCard
            label="My Open Deals"
            value={openDeals}
            icon={<BadgeDollarSign size={18} className="text-blue-600" />}
            color="bg-blue-50"
            onClick={() => navigate("/deals")}
          />
          <StatCard
            label="My Calls Today"
            value={callsToday}
            icon={<Phone size={18} className="text-emerald-600" />}
            color="bg-emerald-50"
            onClick={() => navigate("/calls")}
          />
          <StatCard
            label="My Leads"
            value={leads.length}
            icon={<CircleDot size={18} className="text-violet-600" />}
            color="bg-violet-50"
            onClick={() => navigate("/leads")}
          />
          <StatCard
            label="Meetings"
            value={meetings.length}
            icon={<CalendarDays size={18} className="text-amber-600" />}
            color="bg-amber-50"
            onClick={() => navigate("/meetings")}
          />
          <StatCard
            label="Tasks Due Today"
            value={dueTodayTasks.length}
            icon={<CheckSquare size={18} className="text-teal-600" />}
            color="bg-teal-50"
            onClick={() => navigate("/tasks")}
          />
        </div>

        {/* Today's Tasks — full width */}
        <div className="mb-5 rounded-xl border border-teal-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-teal-100 bg-teal-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-teal-600" />
              <h2 className="text-sm font-semibold text-teal-800">Today's Tasks</h2>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">
                {dueTodayTasks.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {todayTaskPag.total > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>{(todayTaskPag.page - 1) * PAGE_SIZE + 1} - {Math.min(todayTaskPag.page * PAGE_SIZE, todayTaskPag.total)}</span>
                  <button type="button" onClick={() => todayTaskPag.setPage((p) => Math.max(1, p - 1))} disabled={todayTaskPag.page === 1} className="rounded p-0.5 hover:bg-teal-100 disabled:opacity-30">
                    <ChevronLeft size={15} />
                  </button>
                  <button type="button" onClick={() => todayTaskPag.setPage((p) => Math.min(todayTaskPag.totalPages, p + 1))} disabled={todayTaskPag.page === todayTaskPag.totalPages} className="rounded p-0.5 hover:bg-teal-100 disabled:opacity-30">
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate("/tasks")}
                className="rounded-md border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50"
              >
                View All
              </button>
            </div>
          </div>

          {dueTodayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <CheckSquare size={28} className="mb-2 text-teal-200" />
              <p className="text-sm">No tasks due today. Enjoy your day!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                  <th className="px-5 py-2.5">Subject</th>
                  <th className="px-3 py-2.5">Due Date</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {todayTaskPag.paged.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer transition hover:bg-teal-50/40"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-teal-700 hover:underline line-clamp-1">
                      {task.subject || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{formatDate(task.due_date)}</td>
                    <td className="px-3 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-3 py-3"><PriorityBadge priority={task.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Two-column grid */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* My Open Tasks */}
          <Section
            title="My Open Tasks"
            page={taskPag.page}
            totalPages={taskPag.totalPages}
            total={taskPag.total}
            onPrev={() => taskPag.setPage((p) => Math.max(1, p - 1))}
            onNext={() => taskPag.setPage((p) => Math.min(taskPag.totalPages, p + 1))}
          >
            {taskPag.total === 0 ? (
              <EmptyState message="No open tasks." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                    <th className="px-5 py-2.5">Subject</th>
                    <th className="px-3 py-2.5">Due Date</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {taskPag.paged.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                      <td className="px-5 py-3 font-medium text-blue-600 hover:underline line-clamp-1">
                        {task.subject || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{formatDate(task.due_date)}</td>
                      <td className="px-3 py-3"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-3"><PriorityBadge priority={task.priority} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* My Meetings */}
          <Section
            title={todayMeetings.length > 0 ? "My Meetings Today" : "My Meetings"}
            page={meetPag.page}
            totalPages={meetPag.totalPages}
            total={meetPag.total}
            onPrev={() => meetPag.setPage((p) => Math.max(1, p - 1))}
            onNext={() => meetPag.setPage((p) => Math.min(meetPag.totalPages, p + 1))}
          >
            {meetPag.total === 0 ? (
              <EmptyState message="No meetings scheduled." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                    <th className="px-5 py-2.5">Title</th>
                    <th className="px-3 py-2.5">From</th>
                    <th className="px-3 py-2.5">To</th>
                    <th className="px-3 py-2.5">Related To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {meetPag.paged.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/meetings/${m.id}`)}>
                      <td className="px-5 py-3 font-medium text-blue-600 hover:underline line-clamp-1">{getMeetingTitle(m)}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">{formatDateTime(m.start_datetime || m.from_datetime)}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">{formatDateTime(m.end_datetime || m.to_datetime)}</td>
                      <td className="px-3 py-3 text-slate-600 text-xs">{m.account_name || m.contact_name || m.related_to || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Today's Leads */}
          <Section
            title={todayLeads.length > 0 ? "Today's Leads" : "My Leads"}
            page={leadPag.page}
            totalPages={leadPag.totalPages}
            total={leadPag.total}
            onPrev={() => leadPag.setPage((p) => Math.max(1, p - 1))}
            onNext={() => leadPag.setPage((p) => Math.min(leadPag.totalPages, p + 1))}
          >
            {leadPag.total === 0 ? (
              <EmptyState message="No leads found." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                    <th className="px-5 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Company</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leadPag.paged.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td className="px-5 py-3 font-medium text-blue-600 hover:underline">{getLeadName(lead)}</td>
                      <td className="px-3 py-3 text-slate-600">{lead.company || "—"}</td>
                      <td className="px-3 py-3"><StatusBadge status={lead.lead_status} /></td>
                      <td className="px-3 py-3 text-slate-500 text-xs">{lead.lead_source || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* My Deals Closing This Month */}
          <Section
            title={thisMonthDeals.length > 0 ? "My Deals Closing This Month" : "My Deals"}
            page={dealPag.page}
            totalPages={dealPag.totalPages}
            total={dealPag.total}
            onPrev={() => dealPag.setPage((p) => Math.max(1, p - 1))}
            onNext={() => dealPag.setPage((p) => Math.min(dealPag.totalPages, p + 1))}
          >
            {dealPag.total === 0 ? (
              <EmptyState message="No deals found." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                    <th className="px-5 py-2.5">Deal Name</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5">Stage</th>
                    <th className="px-3 py-2.5">Closing Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dealPag.paged.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/deals/${deal.id}`)}>
                      <td className="px-5 py-3 font-medium text-blue-600 hover:underline">{getDealName(deal)}</td>
                      <td className="px-3 py-3 text-slate-700 font-medium">{formatCurrency(deal.amount)}</td>
                      <td className="px-3 py-3"><StatusBadge status={deal.stage} /></td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{formatDate(deal.closing_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
        <CircleDot size={22} className="text-slate-300" />
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
