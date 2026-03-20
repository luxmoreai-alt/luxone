import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CircleDot, CheckSquare, CalendarDays, Loader2,
  ChevronLeft, ChevronRight, User, UserCog, Check, X, Pencil,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

type Lead = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  lead_name?: string;
  company?: string;
  lead_status?: string | null;
  lead_source?: string | null;
  created_at?: string;
};

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
  from_datetime?: string | null;
};

type EmployeeInfo = {
  id: number;
  email: string;
  role: string;
  team: string;
  team_label?: string | null;
  is_active: boolean;
  manager_email: string | null;
  organization_name: string | null;
};

const teamOptions = [
  { value: "general", label: "General" },
  { value: "support", label: "Support" },
  { value: "service", label: "Service" },
  { value: "technical", label: "Technical" },
  { value: "customer_success", label: "Customer Success" },
  { value: "sales", label: "Sales" },
  { value: "operations", label: "Operations" },
];

type ApiList<T> = T[] | { results?: T[]; data?: T[] };

function extractList<T>(res: ApiList<T>): T[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray((res as { results?: T[] }).results)) return (res as { results: T[] }).results;
  if (Array.isArray((res as { data?: T[] }).data)) return (res as { data: T[] }).data;
  return [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB");
}

function getLeadName(lead: Lead) {
  if (lead.lead_name) return lead.lead_name;
  const parts = [lead.first_name, lead.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

const PAGE_SIZE = 8;

function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { paged, page, totalPages, setPage, total: items.length };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();
  const cls =
    s.includes("complet") || s.includes("won") ? "bg-emerald-100 text-emerald-700"
    : s.includes("progress") ? "bg-blue-100 text-blue-700"
    : s.includes("lost") ? "bg-red-100 text-red-700"
    : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status || "—"}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string | null }) {
  const p = (priority || "").toLowerCase();
  const cls =
    p === "highest" || p === "critical" ? "bg-red-100 text-red-700"
    : p === "high" ? "bg-orange-100 text-orange-700"
    : p === "normal" || p === "medium" ? "bg-sky-100 text-sky-700"
    : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {priority || "—"}
    </span>
  );
}

function SectionHeader({
  title, total, icon, page, totalPages, onPrev, onNext,
}: {
  title: string; total: number; icon: React.ReactNode;
  page: number; totalPages: number; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{total}</span>
      </div>
      {total > PAGE_SIZE && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <button type="button" onClick={onPrev} disabled={page === 1} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span>{page} / {totalPages}</span>
          <button type="button" onClick={onNext} disabled={page === totalPages} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Manager assignment state
  const [managers, setManagers] = useState<{ id: number; email: string }[]>([]);
  const [editingManager, setEditingManager] = useState(false);
  const [selectedManager, setSelectedManager] = useState("");
  const [savingManager, setSavingManager] = useState(false);
  const [managerError, setManagerError] = useState("");
  const [editingTeam, setEditingTeam] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const [empRes, leadsRes, tasksRes, meetingsRes] = await Promise.allSettled([
          apiRequest<EmployeeInfo>(`/auth/manage-users/${id}/`),
          apiRequest<ApiList<Lead>>("/leads/", { query: { owner_id: id } }),
          apiRequest<ApiList<Task>>("/tasks/", { query: { user_id: id } }),
          apiRequest<ApiList<Meeting>>("/meetings/", { query: { owner_id: id } }),
        ]);
        if (!active) return;
        if (empRes.status === "fulfilled") setEmployee(empRes.value);
        if (leadsRes.status === "fulfilled") setLeads(extractList(leadsRes.value));
        if (tasksRes.status === "fulfilled") setTasks(extractList(tasksRes.value));
        if (meetingsRes.status === "fulfilled") setMeetings(extractList(meetingsRes.value));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchAll();
    return () => { active = false; };
  }, [id]);

  // Fetch managers for admin reassignment
  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<{ id: number; email: string; role: string }[]>("/auth/manage-users/")
      .then((data) => {
        setManagers((Array.isArray(data) ? data : []).filter((u) => u.role === "manager"));
      })
      .catch(() => {});
  }, [isAdmin]);

  const handleAssignManager = async () => {
    if (!selectedManager || !id) return;
    setSavingManager(true);
    setManagerError("");
    try {
      const updated = await apiRequest<EmployeeInfo>(`/auth/manage-users/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ manager: Number(selectedManager) }),
      });
      setEmployee(updated);
      setEditingManager(false);
      setSelectedManager("");
    } catch (err) {
      setManagerError(err instanceof Error ? err.message : "Failed to assign.");
    } finally {
      setSavingManager(false);
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedTeam || !id) return;
    setSavingTeam(true);
    setTeamError("");
    try {
      const updated = await apiRequest<EmployeeInfo>(`/auth/manage-users/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ team: selectedTeam }),
      });
      setEmployee(updated);
      setEditingTeam(false);
      setSelectedTeam("");
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to update team.");
    } finally {
      setSavingTeam(false);
    }
  };

  const leadPag = usePagination(leads);
  const taskPag = usePagination(tasks);
  const meetPag = usePagination(meetings);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
        <User size={36} />
        <p className="text-sm">Employee not found.</p>
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      {/* Back + Profile header */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700 uppercase shrink-0">
          {employee.email[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{employee.email}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="capitalize rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">
              {employee.role}
            </span>
            <span className="rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 font-semibold">
              {employee.team_label || employee.team || "General"}
            </span>
            {employee.organization_name && <span>{employee.organization_name}</span>}
            <span className={employee.is_active ? "text-emerald-600" : "text-red-500"}>
              {employee.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Manager info + reassign (admin only) */}
          {isAdmin && (
            <div className="mt-3">
              {!editingManager ? (
                <div className="flex items-center gap-2">
                  <UserCog size={13} className="text-slate-400" />
                  <span className="text-xs text-slate-500">
                    Manager:{" "}
                    <span className="font-medium text-slate-700">
                      {employee.manager_email ?? "Unassigned"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingManager(true);
                      setManagerError("");
                    }}
                    className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-violet-100 hover:text-violet-700 transition"
                  >
                    <Pencil size={10} />
                    Change
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <select
                    value={selectedManager}
                    onChange={(e) => setSelectedManager(e.target.value)}
                    className="rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">— Select manager —</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>{mgr.email}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedManager || savingManager}
                    onClick={handleAssignManager}
                    className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
                  >
                    {savingManager ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    {savingManager ? "Saving..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingManager(false); setSelectedManager(""); setManagerError(""); }}
                    className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <X size={11} />
                    Cancel
                  </button>
                  {managerError && <p className="w-full text-xs text-red-500">{managerError}</p>}
                </div>
              )}
            </div>
          )}

          {isAdmin && (
            <div className="mt-3">
              {!editingTeam ? (
                <div className="flex items-center gap-2">
                  <UserCog size={13} className="text-slate-400" />
                  <span className="text-xs text-slate-500">
                    Team:{" "}
                    <span className="font-medium text-slate-700">
                      {employee.team_label ?? employee.team ?? "General"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeam(true);
                      setSelectedTeam(employee.team || "general");
                      setTeamError("");
                    }}
                    className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-sky-100 hover:text-sky-700 transition"
                  >
                    <Pencil size={10} />
                    Change
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    {teamOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedTeam || savingTeam}
                    onClick={handleAssignTeam}
                    className="flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition"
                  >
                    {savingTeam ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    {savingTeam ? "Saving..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingTeam(false); setSelectedTeam(""); setTeamError(""); }}
                    className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <X size={11} />
                    Cancel
                  </button>
                  {teamError && <p className="w-full text-xs text-red-500">{teamError}</p>}
                </div>
              )}
            </div>
          )}

          {/* Non-admin: just show manager */}
          {!isAdmin && employee.manager_email && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <UserCog size={13} className="text-slate-400" />
              <span>Manager: <span className="font-medium text-slate-700">{employee.manager_email}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Stat summary */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <CircleDot size={16} className="text-violet-500" />
          <div>
            <p className="text-lg font-bold text-slate-900">{leads.length}</p>
            <p className="text-xs text-slate-500">Leads</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <CheckSquare size={16} className="text-teal-500" />
          <div>
            <p className="text-lg font-bold text-slate-900">{tasks.length}</p>
            <p className="text-xs text-slate-500">Tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <CalendarDays size={16} className="text-amber-500" />
          <div>
            <p className="text-lg font-bold text-slate-900">{meetings.length}</p>
            <p className="text-xs text-slate-500">Meetings</p>
          </div>
        </div>
      </div>

      {/* Data tables */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Leads */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            title="Leads"
            total={leadPag.total}
            icon={<CircleDot size={14} className="text-violet-500" />}
            page={leadPag.page}
            totalPages={leadPag.totalPages}
            onPrev={() => leadPag.setPage((p) => Math.max(1, p - 1))}
            onNext={() => leadPag.setPage((p) => Math.min(leadPag.totalPages, p + 1))}
          />
          {leadPag.total === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No leads found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Company</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leadPag.paged.map((lead) => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-blue-600 hover:underline">{getLeadName(lead)}</td>
                    <td className="px-3 py-3 text-slate-600 text-xs">{lead.company || "—"}</td>
                    <td className="px-3 py-3"><StatusBadge status={lead.lead_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            title="Tasks"
            total={taskPag.total}
            icon={<CheckSquare size={14} className="text-teal-500" />}
            page={taskPag.page}
            totalPages={taskPag.totalPages}
            onPrev={() => taskPag.setPage((p) => Math.max(1, p - 1))}
            onNext={() => taskPag.setPage((p) => Math.min(taskPag.totalPages, p + 1))}
          />
          {taskPag.total === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No tasks found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                  <th className="px-5 py-2.5">Subject</th>
                  <th className="px-3 py-2.5">Due</th>
                  <th className="px-3 py-2.5">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {taskPag.paged.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-blue-600 hover:underline line-clamp-1">{task.subject || "—"}</td>
                    <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{formatDate(task.due_date)}</td>
                    <td className="px-3 py-3"><PriorityBadge priority={task.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Meetings */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:col-span-2">
          <SectionHeader
            title="Meetings"
            total={meetPag.total}
            icon={<CalendarDays size={14} className="text-amber-500" />}
            page={meetPag.page}
            totalPages={meetPag.totalPages}
            onPrev={() => meetPag.setPage((p) => Math.max(1, p - 1))}
            onNext={() => meetPag.setPage((p) => Math.min(meetPag.totalPages, p + 1))}
          />
          {meetPag.total === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No meetings found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                  <th className="px-5 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {meetPag.paged.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => navigate(`/meetings/${m.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-blue-600 hover:underline">{m.title || m.subject || "—"}</td>
                    <td className="px-3 py-3 text-slate-600 text-xs">{formatDate(m.start_datetime || m.from_datetime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
