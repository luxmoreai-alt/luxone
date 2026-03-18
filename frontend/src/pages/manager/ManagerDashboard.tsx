import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, ChevronRight, RefreshCw, Loader2, Plus, UserCog,
} from "lucide-react";
import { apiRequest } from "../../api/client";

type TeamMember = {
  id: number;
  email: string;
  role: "admin" | "manager" | "employee";
  is_active: boolean;
  manager: number | null;
  manager_email: string | null;
  organization_name: string | null;
};

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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<TeamMember[]>("/auth/manage-users/")
      .then((data) => { if (active) setMembers(Array.isArray(data) ? data.filter((u) => u.role === "employee") : []); })
      .catch(() => { if (active) setMembers([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading team...</span>
        </div>
      </div>
    );
  }

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
            <p className="text-2xl font-bold text-slate-900">{members.length}</p>
            <p className="text-xs font-medium text-slate-500">My Employees</p>
          </div>
        </div>
      </div>

      {/* Team list */}
      <h2 className="mb-3 text-sm font-semibold text-slate-600 uppercase tracking-wide">
        Team Members
      </h2>

      {members.length === 0 ? (
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
