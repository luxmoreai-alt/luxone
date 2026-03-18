import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, UserCog, ChevronRight,
  RefreshCw, Loader2, Plus, Building2, UserPlus, Check, X,
} from "lucide-react";
import { apiRequest } from "../../api/client";

type OrgUser = {
  id: number;
  email: string;
  role: "admin" | "manager" | "employee";
  is_active: boolean;
  manager: number | null;
  manager_email: string | null;
  organization_name: string | null;
};

type GroupedOrg = {
  managers: OrgUser[];
  unassigned: OrgUser[];
  byManager: Record<number, OrgUser[]>;
};

function groupUsers(users: OrgUser[]): GroupedOrg {
  const managers = users.filter((u) => u.role === "manager");
  const employees = users.filter((u) => u.role === "employee");
  const byManager: Record<number, OrgUser[]> = {};
  const unassigned: OrgUser[] = [];

  for (const emp of employees) {
    if (emp.manager) {
      byManager[emp.manager] = [...(byManager[emp.manager] ?? []), emp];
    } else {
      unassigned.push(emp);
    }
  }
  return { managers, unassigned, byManager };
}

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

function UserRow({ user, onClick }: { user: OrgUser; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase">
          {user.email[0]}
        </div>
        <span className="text-sm text-slate-700 truncate max-w-[200px]">{user.email}</span>
      </div>
      <div className="flex items-center gap-2">
        <RoleBadge role={user.role} />
        <ChevronRight size={14} className="text-slate-400" />
      </div>
    </button>
  );
}

// ── Unassigned row with inline manager picker ─────────────────────────────────

function UnassignedRow({
  user,
  managers,
  onAssigned,
  onViewProfile,
}: {
  user: OrgUser;
  managers: OrgUser[];
  onAssigned: () => void;
  onViewProfile: () => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [selectedManager, setSelectedManager] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAssign = async () => {
    if (!selectedManager) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/auth/manage-users/${user.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ manager: Number(selectedManager) }),
      });
      onAssigned(); // refresh parent
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign.");
      setSaving(false);
    }
  };

  if (assigning) {
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-3 mx-1 my-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase shrink-0">
            {user.email[0]}
          </div>
          <span className="text-sm font-medium text-slate-700 truncate">{user.email}</span>
        </div>

        <label className="mb-1 block text-xs font-semibold text-violet-700">
          Assign to Manager
        </label>
        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          className="w-full rounded-lg border border-violet-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 mb-2"
        >
          <option value="">— Select a manager —</option>
          {managers.map((mgr) => (
            <option key={mgr.id} value={mgr.id}>
              {mgr.email}
            </option>
          ))}
        </select>

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!selectedManager || saving}
            onClick={handleAssign}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {saving ? "Assigning..." : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => { setAssigning(false); setSelectedManager(""); setError(""); }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X size={12} />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-slate-50 group">
      <button
        type="button"
        onClick={onViewProfile}
        className="flex items-center gap-3 text-left flex-1 min-w-0"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase shrink-0">
          {user.email[0]}
        </div>
        <span className="text-sm text-slate-700 truncate">{user.email}</span>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <RoleBadge role={user.role} />
        <button
          type="button"
          onClick={() => setAssigning(true)}
          className="flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 opacity-0 group-hover:opacity-100"
          title="Assign to a manager"
        >
          <UserPlus size={11} />
          Assign
        </button>
        <ChevronRight size={14} className="text-slate-400" />
      </div>
    </div>
  );
}

// ── Manager card ──────────────────────────────────────────────────────────────

function ManagerCard({
  manager,
  employees,
  onUserClick,
}: {
  manager: OrgUser;
  employees: OrgUser[];
  onUserClick: (u: OrgUser) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => onUserClick(manager)}
        className="flex w-full items-center justify-between border-b border-violet-100 bg-violet-50 px-4 py-3 text-left transition hover:bg-violet-100"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-200 text-sm font-bold text-violet-800 uppercase">
            {manager.email[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">
              {manager.email}
            </p>
            <p className="text-xs text-violet-600">{employees.length} employee{employees.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role="manager" />
          <ChevronRight size={14} className="text-slate-400" />
        </div>
      </button>

      {employees.length > 0 ? (
        <div className="divide-y divide-slate-50 px-1 py-1">
          {employees.map((emp) => (
            <UserRow key={emp.id} user={emp} onClick={() => onUserClick(emp)} />
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-xs text-slate-400">No employees assigned yet.</p>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<OrgUser[]>("/auth/manage-users/")
      .then((data) => { if (active) setUsers(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setUsers([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  const { managers, unassigned, byManager } = groupUsers(users);
  const totalEmployees = users.filter((u) => u.role === "employee").length;
  const orgName = users[0]?.organization_name ?? "Your Organization";

  const goToProfile = (u: OrgUser) => navigate(`/team/user/${u.id}`);
  const refresh = () => setRefreshKey((k) => k + 1);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading organization...</span>
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
            <Building2 size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{orgName}</h1>
          </div>
          <p className="text-sm text-slate-500">Admin view — full organization overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/team/users/create")}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus size={15} />
            Add User
          </button>
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50">
            <UserCog size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{managers.length}</p>
            <p className="text-xs font-medium text-slate-500">Managers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Users size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalEmployees}</p>
            <p className="text-xs font-medium text-slate-500">Employees</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <UserCheck size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            <p className="text-xs font-medium text-slate-500">Total Users</p>
          </div>
        </div>
        {unassigned.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <UserPlus size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-800">{unassigned.length}</p>
              <p className="text-xs font-medium text-amber-600">Unassigned</p>
            </div>
          </div>
        )}
      </div>

      {/* Org tree */}
      <h2 className="mb-3 text-sm font-semibold text-slate-600 uppercase tracking-wide">
        Organization Structure
      </h2>

      {managers.length === 0 && unassigned.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Users size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">No users yet. Add managers and employees to get started.</p>
          <button
            type="button"
            onClick={() => navigate("/team/users/create")}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add First User
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {managers.map((mgr) => (
            <ManagerCard
              key={mgr.id}
              manager={mgr}
              employees={byManager[mgr.id] ?? []}
              onUserClick={goToProfile}
            />
          ))}

          {/* Unassigned employees */}
          {unassigned.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">Unassigned Employees</p>
                <p className="text-xs text-amber-600">
                  Hover over an employee and click <strong>Assign</strong> to assign a manager
                </p>
              </div>
              <div className="divide-y divide-slate-50 py-1">
                {unassigned.map((emp) => (
                  <UnassignedRow
                    key={emp.id}
                    user={emp}
                    managers={managers}
                    onAssigned={refresh}
                    onViewProfile={() => goToProfile(emp)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
