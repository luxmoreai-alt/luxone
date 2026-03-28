import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, ChevronRight, RefreshCw, Plus, UserCog, ChevronDown,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { readDashboardCache, writeDashboardCache } from "../../lib/dashboardCache";

type TeamMember = {
  id: number;
  email: string;
  role: "admin" | "manager" | "employee";
  is_active: boolean;
  manager: number | null;
  manager_email: string | null;
};

const MANAGER_DASHBOARD_CACHE_KEY = "manager-dashboard-cache-v1";
const MANAGER_DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === "admin" ? "bg-blue-100 text-blue-700"
    : role === "manager" ? "bg-violet-100 text-violet-700"
    : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {role}
    </span>
  );
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [initialCache] = useState(() => readDashboardCache<TeamMember[]>(MANAGER_DASHBOARD_CACHE_KEY, MANAGER_DASHBOARD_CACHE_TTL_MS));
  const [members, setMembers] = useState<TeamMember[]>(initialCache?.state ?? []);
  const [loading, setLoading] = useState(!initialCache?.state);
  const [refreshKey, setRefreshKey] = useState(0);
  const [projectDeskOpen, setProjectDeskOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const shouldFetch = refreshKey > 0 || !initialCache?.state;

    if (!shouldFetch) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    apiRequest<TeamMember[]>("/auth/manage-users/")
      .then((data) => {
        if (!active) return;
        const nextMembers = Array.isArray(data) ? data.filter((u) => u.role === "employee") : [];
        setMembers(nextMembers);
        writeDashboardCache(MANAGER_DASHBOARD_CACHE_KEY, nextMembers);
      })
      .catch(() => { if (active) setMembers([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialCache?.state, refreshKey]);

  const openProjectTaskDesk = async () => {
    setProjectDeskOpen(false);
    try {
      const response = await apiRequest("/projects/");
      const projects = Array.isArray(response)
        ? response
        : ((response as { results?: Array<{ id: string | number }> }).results ?? []);

      if (projects.length > 0) {
        navigate(`/projectdesk/tasks/create?project=${projects[0].id}`);
        return;
      }
    } catch {
      // Fall through to project creation if loading projects fails.
    }

    navigate("/projects/create");
  };

  const openProjectMeetingDesk = async () => {
    setProjectDeskOpen(false);
    try {
      const response = await apiRequest("/projects/");
      const projects = Array.isArray(response)
        ? response
        : ((response as { results?: Array<{ id: string | number }> }).results ?? []);

      if (projects.length > 0) {
        navigate(`/projectdesk/meetings/create?project=${projects[0].id}`);
        return;
      }
    } catch {
      // Fall through to project creation if loading projects fails.
    }

    navigate("/projects/create");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCog size={18} className="text-violet-600" />
            <h1 className="text-xl font-bold text-slate-900">My Team</h1>
          </div>
          <p className="text-sm text-slate-500">
            {members.length} employee{members.length !== 1 ? "s" : ""} reporting to you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setProjectDeskOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              ProjectDesk
              <ChevronDown size={15} className={`transition ${projectDeskOpen ? "rotate-180" : ""}`} />
            </button>
            {projectDeskOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    void openProjectTaskDesk();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Assign Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void openProjectMeetingDesk();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Schedule Meeting
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate("/team/users/create")}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            <Plus size={15} />
            Add Employee
          </button>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stat card */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Users size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{loading ? "..." : members.length}</p>
            <p className="text-xs font-medium text-slate-500">My Employees</p>
          </div>
        </div>
      </div>

      {/* Team list */}
      <h2 className="mb-3 text-sm font-semibold text-slate-600 uppercase tracking-wide">
        Team Members
      </h2>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="space-y-0">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Users size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">No employees assigned to you yet.</p>
          <button
            type="button"
            onClick={() => navigate("/team/users/create")}
            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Add First Employee
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {members.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => navigate(`/team/user/${emp.id}`)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 uppercase">
                    {emp.email[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 truncate max-w-[240px]">
                      {emp.email}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {emp.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RoleBadge role={emp.role} />
                  <ChevronRight size={15} className="text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
