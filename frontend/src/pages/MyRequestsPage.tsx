import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, ClipboardList, Clock3, RefreshCw } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { apiRequest } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { readDashboardCache, writeDashboardCache } from "../lib/dashboardCache";
import { listAppointments } from "../servicesModule/api";
import { getSupportList } from "../support/api";
import type { AppointmentRecord } from "../servicesModule/types";
import type { CaseListItem } from "../support/types";

type Task = {
  id: number | string;
  subject?: string | null;
  due_date?: string | null;
  status?: string | null;
  priority?: string | null;
  owner?: { name?: string; email?: string } | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Meeting = {
  id: number | string;
  title?: string | null;
  subject?: string | null;
  status?: string | null;
  start_date?: string | null;
  start_datetime?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  organizer?: { name?: string; email?: string } | null;
};

type ApiList<T> = T[] | { results?: T[]; data?: T[] };

type MyRequestsCache = {
  tasks: Task[];
  meetings: Meeting[];
  cases: CaseListItem[];
  appointments: AppointmentRecord[];
};

type MyRequestItem = {
  id: string;
  module: "Task" | "Meeting" | "Case" | "Appointment";
  title: string;
  status: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
  dueAt?: string;
  href: string;
  meta: string;
};

const MY_REQUESTS_CACHE_KEY = "my-requests-cache-v1";
const MY_REQUESTS_CACHE_TTL_MS = 5 * 60 * 1000;

function extractList<T>(payload: ApiList<T>): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function toDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value?: string | null) {
  const parsed = toDate(value);
  if (!parsed) return "N/A";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  const parsed = toDate(value);
  if (!parsed) return "N/A";
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getTaskOwner(task: Task) {
  if (!task.owner) return "";
  if (typeof task.owner === "string") return task.owner;
  return task.owner.email || task.owner.name || "";
}

function matchCurrentUser(candidate: string, userEmail: string, userName: string) {
  const value = normalize(candidate);
  if (!value) return false;
  return value === userEmail || value === userName || value.includes(userEmail) || value.includes(userName);
}

function isOpenStatus(status: string) {
  const value = normalize(status);
  return ["open", "new", "requested", "scheduled", "in progress", "pending", "on hold"].some((item) => value.includes(item));
}

function isClosedStatus(status: string) {
  const value = normalize(status);
  return ["closed", "completed", "resolved", "done", "cancelled", "canceled"].some((item) => value.includes(item));
}

export default function MyRequestsPage() {
  const { user, canAccess } = useAuth();
  const [initialCache] = useState(() => readDashboardCache<MyRequestsCache>(MY_REQUESTS_CACHE_KEY, MY_REQUESTS_CACHE_TTL_MS));
  const [loading, setLoading] = useState(!initialCache?.state);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(initialCache?.savedAt ?? null);
  const [cacheState, setCacheState] = useState<MyRequestsCache>(
    initialCache?.state ?? { tasks: [], meetings: [], cases: [], appointments: [] }
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
        setError(null);
        setLoading(!initialCache?.state && refreshKey === 0);
        setRefreshing(refreshKey > 0);

        const [tasksResult, meetingsResult, casesResult, appointmentsResult] = await Promise.allSettled([
          canAccess("activities") ? apiRequest<ApiList<Task>>("/tasks/", { query: { page_size: 50 } }) : Promise.resolve([] as Task[]),
          canAccess("activities") ? apiRequest<ApiList<Meeting>>("/meetings/", { query: { page_size: 50 } }) : Promise.resolve([] as Meeting[]),
          canAccess("support") ? getSupportList("cases") : Promise.resolve([] as CaseListItem[]),
          canAccess("services") ? listAppointments({ page_size: 50 }) : Promise.resolve([] as AppointmentRecord[]),
        ]);

        if (!active) return;

        const nextState: MyRequestsCache = {
          tasks: tasksResult.status === "fulfilled" ? extractList(tasksResult.value) : [],
          meetings: meetingsResult.status === "fulfilled" ? extractList(meetingsResult.value) : [],
          cases: casesResult.status === "fulfilled" ? (casesResult.value as CaseListItem[]) : [],
          appointments: appointmentsResult.status === "fulfilled" ? appointmentsResult.value : [],
        };

        setCacheState(nextState);
        writeDashboardCache(MY_REQUESTS_CACHE_KEY, nextState);
        setLastUpdated(Date.now());
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load your requests.");
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
  }, [canAccess, refreshKey, initialCache?.state]);

  const requestItems = useMemo(() => {
    const userEmail = normalize(user?.email);
    const userName = normalize(user?.name);

    const taskItems = cacheState.tasks
      .filter((task) => matchCurrentUser(getTaskOwner(task), userEmail, userName))
      .map<MyRequestItem>((task) => ({
        id: `task-${task.id}`,
        module: "Task",
        title: task.subject?.trim() || "Untitled task",
        status: task.status || "Open",
        priority: task.priority || undefined,
        createdAt: task.created_at || undefined,
        updatedAt: task.updated_at || undefined,
        dueAt: task.due_date || undefined,
        href: `/tasks/${task.id}`,
        meta: `Due ${formatDate(task.due_date)}`,
      }));

    const meetingItems = cacheState.meetings
      .filter((meeting) =>
        matchCurrentUser(meeting.organizer?.email || meeting.organizer?.name || "", userEmail, userName)
      )
      .map<MyRequestItem>((meeting) => ({
        id: `meeting-${meeting.id}`,
        module: "Meeting",
        title: meeting.title?.trim() || meeting.subject?.trim() || "Untitled meeting",
        status: meeting.status || "Scheduled",
        createdAt: meeting.created_at || undefined,
        updatedAt: meeting.updated_at || undefined,
        dueAt: meeting.start_datetime || meeting.start_date || undefined,
        href: `/meetings/${meeting.id}`,
        meta: `Scheduled ${formatDateTime(meeting.start_datetime || meeting.start_date)}`,
      }));

    const caseItems = cacheState.cases
      .filter((item) => matchCurrentUser(item.owner, userEmail, userName))
      .map<MyRequestItem>((item) => ({
        id: `case-${item.id}`,
        module: "Case",
        title: item.subject || item.caseNumber || "Untitled case",
        status: item.status || "Open",
        priority: item.priority || undefined,
        createdAt: item.createdAt || undefined,
        updatedAt: item.updatedAt || undefined,
        href: `/support/cases/${item.id}`,
        meta: item.caseNumber ? `Case ${item.caseNumber}` : "Support case",
      }));

    const appointmentItems = cacheState.appointments
      .filter((item) => matchCurrentUser(item.assignedMemberEmail || "", userEmail, userName))
      .map<MyRequestItem>((item) => ({
        id: `appointment-${item.id}`,
        module: "Appointment",
        title: item.serviceName || item.appointmentNumber || "Service appointment",
        status: item.status || "Scheduled",
        createdAt: item.createdAt || undefined,
        updatedAt: item.updatedAt || undefined,
        dueAt: item.appointmentDate || undefined,
        href: `/services/appointments/${item.id}`,
        meta: item.appointmentForDisplay ? `For ${item.appointmentForDisplay}` : "Service request",
      }));

    return [...taskItems, ...meetingItems, ...caseItems, ...appointmentItems].sort((left, right) => {
      const leftDate = toDate(left.updatedAt || left.createdAt || left.dueAt)?.getTime() || 0;
      const rightDate = toDate(right.updatedAt || right.createdAt || right.dueAt)?.getTime() || 0;
      return rightDate - leftDate;
    });
  }, [cacheState, user?.email, user?.name]);

  const summary = useMemo(() => {
    const open = requestItems.filter((item) => isOpenStatus(item.status) && !isClosedStatus(item.status));
    const closed = requestItems.filter((item) => isClosedStatus(item.status));
    const pending = requestItems.filter((item) => normalize(item.status).includes("pending"));
    const dueToday = requestItems.filter((item) => {
      const date = toDate(item.dueAt);
      if (!date) return false;
      const now = new Date();
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    });

    return { open, closed, pending, dueToday };
  }, [requestItems]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[34px] border border-[#d6d9f6] bg-[linear-gradient(135deg,#faf8ff_0%,#f1efff_46%,#ffffff_100%)] shadow-[0_18px_42px_rgba(101,87,180,0.10)]">
          <div className="pointer-events-none absolute -right-6 top-0 h-40 w-40 rounded-full bg-violet-300/25 blur-3xl" />
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">Personal History</div>
              <h1 className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-slate-950">My Requests</h1>
              <p className="mt-1 text-sm text-slate-500">Only your own tasks, meetings, support cases, and service requests appear here.</p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={<ClipboardList className="h-5 w-5" />} label="Total Requests" value={requestItems.length} />
            <SummaryCard icon={<Clock3 className="h-5 w-5" />} label="Open Requests" value={summary.open.length} />
            <SummaryCard icon={<CalendarDays className="h-5 w-5" />} label="Due Today" value={summary.dueToday.length} />
            <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Closed" value={summary.closed.length} />
          </div>
        </div>

        {loading && requestItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">Loading your requests...</div>
        ) : requestItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No personal requests found</h2>
            <p className="mt-2 text-sm text-slate-500">This page only lists records assigned to you or owned by your account.</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
              {lastUpdated ? `Updated ${formatDateTime(new Date(lastUpdated).toISOString())}` : "Not updated yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
            <RequestSection title="Open Requests" subtitle="Active items that still need your attention." items={summary.open} />
            <RequestSection title="Pending Approval" subtitle="Items waiting on confirmation or next action." items={summary.pending} />
            <RequestSection title="Closed History" subtitle="Your recently completed or closed requests." items={summary.closed.slice(0, 8)} compact />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/72 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function RequestSection({
  title,
  subtitle,
  items,
  compact = false,
}: {
  title: string;
  subtitle: string;
  items: MyRequestItem[];
  compact?: boolean;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfaff_100%)] shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="p-4">
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="block rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fafbff_0%,#f5f4ff_100%)] px-4 py-3 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{item.module}</div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.meta}</div>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <div className={`mt-3 grid gap-2 text-xs text-slate-500 ${compact ? "grid-cols-1" : "md:grid-cols-3"}`}>
                  <span>Created: {formatDate(item.createdAt)}</span>
                  <span>Updated: {formatDate(item.updatedAt)}</span>
                  <span>{item.priority ? `Priority: ${item.priority}` : item.dueAt ? `Due: ${formatDate(item.dueAt)}` : "No extra details"}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No records in this section yet.</div>
        )}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const value = normalize(status);
  const colorClass = isClosedStatus(value)
    ? "bg-emerald-50 text-emerald-700"
    : value.includes("pending")
      ? "bg-amber-50 text-amber-700"
      : "bg-blue-50 text-blue-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>{status || "Open"}</span>;
}
