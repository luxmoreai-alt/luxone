import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  CircleDot,
  Clock3,
  Phone,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { apiRequest } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { readDashboardCache, writeDashboardCache } from "../lib/dashboardCache";

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

type ProjectDeskTask = {
  id: number | string;
  project_id?: number | string;
  title?: string;
  owner?: string | null;
  due_date?: string | null;
  status?: string | null;
  priority?: string | null;
};

type ProjectDeskMeeting = {
  id: number | string;
  project_id?: number | string;
  title?: string;
  participants?: string | null;
  meeting_type?: string | null;
  start_datetime?: string | null;
  status?: string | null;
};

type ApiList<T> = T[] | { results?: T[]; data?: T[] };

type HomeCacheState = {
  tasks: Task[];
  meetings: Meeting[];
  leads: Lead[];
  deals: Deal[];
  projectTasks: ProjectDeskTask[];
  projectMeetings: ProjectDeskMeeting[];
};

const HOME_CACHE_KEY = "home-page-cache-v1";
const HOME_CACHE_TTL_MS = 5 * 60 * 1000;

function extractList<T>(res: ApiList<T>): T[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "N/A";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "N/A";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(value?: string | null) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isThisMonth(value?: string | null) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function formatCurrency(amount?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function getLeadName(lead: Lead) {
  if (lead.lead_name) return lead.lead_name;
  const parts = [lead.first_name, lead.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Untitled lead";
}

function getDealName(deal: Deal) {
  return deal.name || deal.deal_name || "Untitled deal";
}

function getMeetingTitle(meeting: Meeting) {
  return meeting.title || meeting.subject || "Untitled meeting";
}

function formatRelativeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const navigate = useNavigate();
  const { canAccess, user } = useAuth();
  const canViewActivities = canAccess("activities");
  const canViewSales = canAccess("sales");
  const canViewProjects = canAccess("projects");
  const canViewTeam = canAccess("team");

  const [initialCache] = useState(() => readDashboardCache<HomeCacheState>(HOME_CACHE_KEY, HOME_CACHE_TTL_MS));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tasks, setTasks] = useState<Task[]>(initialCache?.state.tasks ?? []);
  const [meetings, setMeetings] = useState<Meeting[]>(initialCache?.state.meetings ?? []);
  const [leads, setLeads] = useState<Lead[]>(initialCache?.state.leads ?? []);
  const [deals, setDeals] = useState<Deal[]>(initialCache?.state.deals ?? []);
  const [projectTasks, setProjectTasks] = useState<ProjectDeskTask[]>(initialCache?.state.projectTasks ?? []);
  const [projectMeetings, setProjectMeetings] = useState<ProjectDeskMeeting[]>(initialCache?.state.projectMeetings ?? []);

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

        const [tasksRes, meetingsRes, leadsRes, dealsRes, projectTasksRes, projectMeetingsRes] = await Promise.allSettled([
          canViewActivities ? apiRequest<ApiList<Task>>("/tasks/", { query: { page_size: 20 }, cacheTtlMs: 2 * 60 * 1000 }) : Promise.resolve([] as Task[]),
          canViewActivities ? apiRequest<ApiList<Meeting>>("/meetings/", { query: { page_size: 20 }, cacheTtlMs: 2 * 60 * 1000 }) : Promise.resolve([] as Meeting[]),
          canViewSales ? apiRequest<ApiList<Lead>>("/leads/", { query: { page_size: 20 }, cacheTtlMs: 2 * 60 * 1000 }) : Promise.resolve([] as Lead[]),
          canViewSales ? apiRequest<ApiList<Deal>>("/deals/", { query: { page_size: 20 }, cacheTtlMs: 2 * 60 * 1000 }) : Promise.resolve([] as Deal[]),
          canViewProjects ? apiRequest<ApiList<ProjectDeskTask>>("/projectdesk/tasks/", { query: { page_size: 20 }, cacheTtlMs: 2 * 60 * 1000 }) : Promise.resolve([] as ProjectDeskTask[]),
          canViewProjects ? apiRequest<ApiList<ProjectDeskMeeting>>("/projectdesk/meetings/", { query: { page_size: 20 }, cacheTtlMs: 2 * 60 * 1000 }) : Promise.resolve([] as ProjectDeskMeeting[]),
        ]);

        if (!active) return;

        const nextState: HomeCacheState = {
          tasks: tasksRes.status === "fulfilled" ? extractList(tasksRes.value) : [],
          meetings: meetingsRes.status === "fulfilled" ? extractList(meetingsRes.value) : [],
          leads: leadsRes.status === "fulfilled" ? extractList(leadsRes.value) : [],
          deals: dealsRes.status === "fulfilled" ? extractList(dealsRes.value) : [],
          projectTasks: projectTasksRes.status === "fulfilled" ? extractList(projectTasksRes.value) : [],
          projectMeetings: projectMeetingsRes.status === "fulfilled" ? extractList(projectMeetingsRes.value) : [],
        };

        setTasks(nextState.tasks);
        setMeetings(nextState.meetings);
        setLeads(nextState.leads);
        setDeals(nextState.deals);
        setProjectTasks(nextState.projectTasks);
        setProjectMeetings(nextState.projectMeetings);
        writeDashboardCache(HOME_CACHE_KEY, nextState);
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
  }, [canViewActivities, canViewProjects, canViewSales, initialCache?.state, refreshKey]);

  const dashboard = useMemo(() => {
    const openTasks = tasks.filter((task) => !(task.status || "").toLowerCase().includes("complet"));
    const dueTodayTasks = openTasks.filter((task) => isToday(task.due_date));
    const todaysMeetings = meetings.filter((meeting) => isToday(meeting.start_datetime || meeting.from_datetime));
    const monthLeads = leads.filter((lead) => isThisMonth(lead.created_at));
    const openDeals = deals.filter((deal) => !((deal.stage || "").toLowerCase().includes("closed")));
    const pipelineAmount = openDeals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);
    const monthClosingDeals = [...deals]
      .filter((deal) => isThisMonth(deal.closing_date))
      .sort((left, right) => (parseDate(left.closing_date)?.getTime() ?? 0) - (parseDate(right.closing_date)?.getTime() ?? 0))
      .slice(0, 4);
    const recentLeads = [...leads]
      .sort((left, right) => (parseDate(right.created_at)?.getTime() ?? 0) - (parseDate(left.created_at)?.getTime() ?? 0))
      .slice(0, 5);
    const recentDeals = [...deals]
      .sort((left, right) => (parseDate(right.closing_date)?.getTime() ?? 0) - (parseDate(left.closing_date)?.getTime() ?? 0))
      .slice(0, 4);
    const personalProjectTasks = user?.email
      ? projectTasks.filter((task) => (task.owner || "").toLowerCase().includes(user.email!.toLowerCase()))
      : projectTasks;
    const nextProjectItems = [...personalProjectTasks]
      .sort((left, right) => (parseDate(left.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(right.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 4);

    return {
      openTasks,
      dueTodayTasks,
      todaysMeetings,
      monthLeads,
      openDeals,
      pipelineAmount,
      monthClosingDeals,
      recentLeads,
      recentDeals,
      nextProjectItems,
      projectMeetingCount: projectMeetings.length,
    };
  }, [tasks, meetings, leads, deals, projectTasks, projectMeetings, user?.email]);

  const activityFeed = useMemo(() => {
    const items = [
      ...dashboard.dueTodayTasks.slice(0, 3).map((task) => ({
        id: `task-${task.id}`,
        label: task.subject || "Task due today",
        meta: `${formatDate(task.due_date)} | ${task.status || "Open"}`,
        route: `/tasks/${task.id}`,
      })),
      ...dashboard.todaysMeetings.slice(0, 2).map((meeting) => ({
        id: `meeting-${meeting.id}`,
        label: getMeetingTitle(meeting),
        meta: `${formatDateTime(meeting.start_datetime || meeting.from_datetime)} | ${meeting.account_name || meeting.contact_name || "Meeting"}`,
        route: `/meetings/${meeting.id}`,
      })),
      ...dashboard.recentLeads.slice(0, 3).map((lead) => ({
        id: `lead-${lead.id}`,
        label: getLeadName(lead),
        meta: `${lead.company || "No company"} | ${lead.lead_source || "Lead"}`,
        route: `/leads/${lead.id}`,
      })),
    ];

    return items.slice(0, 6);
  }, [dashboard]);

  const quickActions = [
    canViewSales ? { label: "New Lead", route: "/leads/create" } : null,
    canViewSales ? { label: "New Deal", route: "/deals/create" } : null,
    canViewActivities ? { label: "New Task", route: "/tasks/create" } : null,
    canViewActivities ? { label: "New Meeting", route: "/meetings/create" } : null,
    canViewTeam ? { label: "My Team", route: "/team" } : null,
    canViewProjects ? { label: "Projects", route: "/projects" } : null,
  ].filter(Boolean) as Array<{ label: string; route: string }>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
          <section className="relative overflow-hidden rounded-[36px] border border-[#f1d9a5] bg-[radial-gradient(circle_at_top_left,#fff4c8_0%,#ffe8af_18%,#fffaf1_44%,#f8fbff_100%)] px-6 py-6 shadow-[0_20px_55px_rgba(176,137,47,0.16)]">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-56 bg-[radial-gradient(circle_at_center,rgba(79,110,207,0.12),transparent_65%)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 shadow-sm backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Daily Command Center
                </div>
                <p className="mt-5 text-sm font-medium text-slate-600">{formatRelativeGreeting()}</p>
                <h1 className="mt-1 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                  {user?.name || user?.email || "Welcome back"}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  This space is for today's work: follow-ups, meetings, active pipeline, and the quickest paths back into your CRM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((current) => current + 1)}
                className="relative z-10 inline-flex items-center gap-2 self-start rounded-2xl border border-white/80 bg-white/85 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh Home"}
              </button>
            </div>

            <div className="relative z-10 mt-7 grid gap-3 md:grid-cols-3">
              <CommandStrip
                icon={<Zap className="h-4 w-4 text-amber-600" />}
                label="Due Today"
                value={loading && !dashboard.dueTodayTasks.length ? "..." : String(dashboard.dueTodayTasks.length)}
              />
              <CommandStrip
                icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
                label="Meetings Today"
                value={loading && !dashboard.todaysMeetings.length ? "..." : String(dashboard.todaysMeetings.length)}
              />
              <CommandStrip
                icon={<Target className="h-4 w-4 text-emerald-600" />}
                label="Open Pipeline"
                value={loading && !dashboard.openDeals.length ? "..." : formatCurrency(dashboard.pipelineAmount)}
              />
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[36px] border border-[#1f2f55] bg-[linear-gradient(160deg,#0f172a_0%,#16254a_52%,#1f3566_100%)] px-5 py-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
            <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quick Actions</div>
                <div className="mt-2 text-xl font-semibold">Jump Into Work</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <ArrowRight className="h-5 w-5 text-slate-200" />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.route}
                  type="button"
                  onClick={() => navigate(action.route)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10"
                >
                  <span>{action.label}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {canViewSales ? (
            <HomeStatCard
              title="Leads This Month"
              value={loading && !dashboard.monthLeads.length ? "..." : String(dashboard.monthLeads.length)}
              hint={`${dashboard.recentLeads.length} recent leads`}
              icon={<CircleDot className="h-5 w-5 text-violet-600" />}
              onClick={() => navigate("/leads")}
            />
          ) : null}
          {canViewSales ? (
            <HomeStatCard
              title="Open Deals"
              value={loading && !dashboard.openDeals.length ? "..." : String(dashboard.openDeals.length)}
              hint={formatCurrency(dashboard.pipelineAmount)}
              icon={<BadgeDollarSign className="h-5 w-5 text-blue-600" />}
              onClick={() => navigate("/deals")}
            />
          ) : null}
          {canViewActivities ? (
            <HomeStatCard
              title="Tasks Due Today"
              value={loading && !dashboard.dueTodayTasks.length ? "..." : String(dashboard.dueTodayTasks.length)}
              hint={`${dashboard.openTasks.length} open tasks`}
              icon={<CheckSquare className="h-5 w-5 text-teal-600" />}
              onClick={() => navigate("/tasks")}
            />
          ) : null}
          {canViewActivities ? (
            <HomeStatCard
              title="Meetings Today"
              value={loading && !dashboard.todaysMeetings.length ? "..." : String(dashboard.todaysMeetings.length)}
              hint={`${meetings.length} total meetings`}
              icon={<CalendarDays className="h-5 w-5 text-amber-600" />}
              onClick={() => navigate("/meetings")}
            />
          ) : null}
          {canViewProjects ? (
            <HomeStatCard
              title="Project Queue"
              value={loading && !dashboard.nextProjectItems.length ? "..." : String(dashboard.nextProjectItems.length)}
              hint={`${dashboard.projectMeetingCount} project meetings`}
              icon={<CalendarClock className="h-5 w-5 text-cyan-600" />}
              onClick={() => navigate("/projects")}
            />
          ) : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-5">
            <Panel
              title="Today's Focus"
              subtitle="Operational work that needs attention first."
              actionLabel={canViewActivities ? "Open Activities" : undefined}
              onAction={canViewActivities ? () => navigate("/tasks") : undefined}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <FocusList
                  title="Due Today"
                  icon={<Clock3 className="h-4 w-4 text-teal-600" />}
                  empty="No tasks due today."
                  loading={loading}
                  items={dashboard.dueTodayTasks.slice(0, 4).map((task) => ({
                    id: String(task.id),
                    title: task.subject || "Untitled task",
                    meta: `${formatDate(task.due_date)} | ${task.priority || "No priority"}`,
                    badge: task.status || "Open",
                    onClick: () => navigate(`/tasks/${task.id}`),
                  }))}
                />
                <FocusList
                  title="Meetings Today"
                  icon={<CalendarDays className="h-4 w-4 text-amber-600" />}
                  empty="No meetings scheduled today."
                  loading={loading}
                  items={dashboard.todaysMeetings.slice(0, 4).map((meeting) => ({
                    id: String(meeting.id),
                    title: getMeetingTitle(meeting),
                    meta: `${formatDateTime(meeting.start_datetime || meeting.from_datetime)} | ${meeting.account_name || meeting.contact_name || "Meeting"}`,
                    badge: "Scheduled",
                    onClick: () => navigate(`/meetings/${meeting.id}`),
                  }))}
                />
              </div>
            </Panel>

            {canViewSales ? (
              <Panel title="Sales Snapshot" subtitle="A compact sales board instead of a full analytics view.">
                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Open Pipeline</div>
                    <div className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(dashboard.pipelineAmount)}</div>
                    <div className="mt-2 text-sm text-slate-500">{dashboard.openDeals.length} open deals in progress</div>
                    <div className="mt-5 grid gap-3">
                      <SnapshotRow label="Deals closing this month" value={String(dashboard.monthClosingDeals.length)} />
                      <SnapshotRow label="Leads created this month" value={String(dashboard.monthLeads.length)} />
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <CompactList
                      title="Closing Soon"
                      empty="No deals closing this month."
                      items={dashboard.monthClosingDeals.map((deal) => ({
                        id: `deal-${deal.id}`,
                        title: getDealName(deal),
                        meta: `${formatDate(deal.closing_date)} | ${deal.stage || "Deal"}`,
                        side: formatCurrency(deal.amount),
                        onClick: () => navigate(`/deals/${deal.id}`),
                      }))}
                    />
                    <CompactList
                      title="Recent Leads"
                      empty="No recent leads yet."
                      items={dashboard.recentLeads.map((lead) => ({
                        id: `lead-${lead.id}`,
                        title: getLeadName(lead),
                        meta: `${lead.company || "No company"} | ${lead.lead_source || "Lead"}`,
                        side: formatDate(lead.created_at),
                        onClick: () => navigate(`/leads/${lead.id}`),
                      }))}
                    />
                  </div>
                </div>
              </Panel>
            ) : null}

            {canViewProjects ? (
              <Panel
                title="Project Queue"
                subtitle="The nearest project work assigned to you."
                actionLabel="Open Projects"
                onAction={() => navigate("/projects")}
              >
                <CompactList
                  title="Next Project Tasks"
                  empty="No project tasks assigned right now."
                  items={dashboard.nextProjectItems.map((task) => ({
                    id: `project-task-${task.id}`,
                    title: task.title || "Untitled project task",
                    meta: `${formatDate(task.due_date)} | ${task.status || "Open"}`,
                    side: task.priority || "Normal",
                    onClick: () => navigate(`/projects/${task.project_id}?tab=tasks`),
                  }))}
                />
              </Panel>
            ) : null}
          </div>

          <div className="space-y-5">
            <Panel title="Recent Activity" subtitle="A quick feed of the latest items that may need your follow-up.">
              {activityFeed.length ? (
                <div className="space-y-3">
                  {activityFeed.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.route)}
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">{item.label}</div>
                      <div className="mt-1 text-sm text-slate-500">{item.meta}</div>
                    </button>
                  ))}
                </div>
              ) : loading ? (
                <PlaceholderStack rows={4} />
              ) : (
                <EmptyState message="No recent activity yet." />
              )}
            </Panel>

            {canViewActivities ? (
              <Panel title="Calls Snapshot" subtitle="Calls are still available as a shortcut until call analytics are expanded.">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">Calls Workspace</div>
                      <div className="text-sm text-slate-500">Review, log, and manage your call records.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/calls")}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Open Calls
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function HomeStatCard({
  title,
  value,
  hint,
  icon,
  onClick,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[30px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 text-left shadow-[0_10px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100/80">{icon}</div>
      </div>
      <div className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{hint}</div>
    </button>
  );
}

function CommandStrip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/72 px-4 py-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] shadow-[0_10px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FocusList({
  title,
  icon,
  items,
  empty,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ id: string; title: string; meta: string; badge: string; onClick: () => void }>;
  empty: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fb_100%)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}
        {title}
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.meta}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.badge}</span>
              </div>
            </button>
          ))}
        </div>
      ) : loading ? (
        <PlaceholderStack rows={3} compact />
      ) : (
        <EmptyState message={empty} />
      )}
    </div>
  );
}

function CompactList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ id: string; title: string; meta: string; side: string; onClick: () => void }>;
  empty: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-slate-800">{title}</div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="flex w-full items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
            >
              <div>
                <div className="font-medium text-slate-900">{item.title}</div>
                <div className="mt-1 text-sm text-slate-500">{item.meta}</div>
              </div>
              <div className="whitespace-nowrap text-sm font-medium text-slate-600">{item.side}</div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState message={empty} />
      )}
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-lg font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-slate-400">
      <CircleDot className="mb-2 h-5 w-5 text-slate-300" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function PlaceholderStack({ rows, compact = false }: { rows: number; compact?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={`animate-pulse rounded-2xl border border-slate-200 bg-white ${compact ? "px-4 py-4" : "px-4 py-5"}`}
        >
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
