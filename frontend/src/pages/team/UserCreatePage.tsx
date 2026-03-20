import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Mail, UserPlus } from "lucide-react";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

type UserRole =
  | "admin"
  | "sub_admin"
  | "hr"
  | "manager"
  | "team_lead"
  | "business_development"
  | "software_development"
  | "support_team"
  | "employee";

type UserDepartment = "sales" | "business_development" | "software_development" | "support" | "";

const ROLE_OPTIONS: { value: UserRole; label: string; allowedFor: ("admin" | "sub_admin" | "manager" | "team_lead")[] }[] = [
  { value: "hr",        label: "HR",         allowedFor: ["admin", "sub_admin"] },
  { value: "manager",   label: "Manager",    allowedFor: ["admin", "sub_admin"] },
  { value: "team_lead", label: "Team Lead",  allowedFor: ["admin", "sub_admin", "manager"] },
  { value: "employee",  label: "Employee",   allowedFor: ["admin", "sub_admin", "manager", "team_lead"] },
];

const DEPARTMENT_OPTIONS: { value: UserDepartment; label: string }[] = [
  { value: "sales",                 label: "Sales" },
  { value: "business_development",  label: "Business Development" },
  { value: "software_development",  label: "Software Development" },
  { value: "support",               label: "Support" },
];

type Manager = { id: number; email: string; name?: string; department?: string };

type FormState = {
  name: string;
  email: string;
  role: UserRole;
  department: UserDepartment;
  manager_id: string;
};

type CreatedUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  role_display?: string;
  email_sent?: boolean;
  temp_password?: string;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function UserCreatePage() {
  const navigate = useNavigate();
  const { role: creatorRole, isAdmin, isManager } = useAuth();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    role: "employee",
    department: "",
    manager_id: "",
  });
  const [managers, setManagers] = useState<Manager[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedUser | null>(null);

  // Available roles based on the creator's own role
  const availableRoles = ROLE_OPTIONS.filter((r) =>
    r.allowedFor.includes(creatorRole as "admin" | "sub_admin" | "manager" | "team_lead")
  );

  const showManagerDropdown =
    isAdmin && (form.role === "employee" || form.role === "team_lead" ||
      form.role === "business_development" || form.role === "software_development" ||
      form.role === "support_team");

  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<{ id: number; email: string; name?: string; role: string; department?: string }[]>("/auth/manage-users/")
      .then((data) => {
        const mgrs = (Array.isArray(data) ? data : []).filter(
          (u) => u.role === "manager" || u.role === "team_lead"
        );
        setManagers(mgrs);
      })
      .catch(() => setManagers([]));
  }, [isAdmin]);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: isAdmin ? form.role : "employee",
        department: form.department || "",
      };
      if (isAdmin && form.manager_id) {
        payload.manager = Number(form.manager_id);
      }
      const result = await apiRequest<CreatedUser>("/auth/manage-users/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-green-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">User Created</h2>
            <p className="text-sm text-slate-500 mb-6">
              <span className="font-medium text-slate-700">{created.name || created.email}</span> has been added as{" "}
              <span className="font-medium text-slate-700">{created.role_display || created.role}</span>.
            </p>

            {created.email_sent ? (
              <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-left">
                <div className="flex items-start gap-2">
                  <Mail size={16} className="mt-0.5 text-blue-600 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-0.5">Credentials sent by email</p>
                    <p className="text-blue-600">
                      A welcome email with the auto-generated password and login link has been sent to{" "}
                      <span className="font-medium">{created.email}</span>. The user must change
                      their password on first login.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                <div className="flex items-start gap-2">
                  <Mail size={16} className="mt-0.5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm text-amber-800 w-full">
                    <p className="font-medium mb-1">Email delivery failed — share credentials manually</p>
                    <p className="text-amber-700 mb-2 text-xs">
                      The email could not be sent. Please share these credentials with the user directly.
                    </p>
                    <div className="rounded-md bg-white border border-amber-200 px-3 py-2 space-y-1">
                      <p className="text-xs"><span className="font-medium text-slate-600">Email:</span> {created.email}</p>
                      {created.temp_password && (
                        <p className="text-xs"><span className="font-medium text-slate-600">Password:</span>{" "}
                          <span className="font-mono font-bold text-slate-900">{created.temp_password}</span>
                        </p>
                      )}
                      <p className="text-xs text-amber-600 mt-1">The user must change this password on first login.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setCreated(null);
                  setForm({ name: "", email: "", role: "employee", department: "", manager_id: "" });
                }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Create Another
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Create form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2">
          <UserPlus size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">
            {isAdmin ? "Create New User" : "Add Employee"}
          </h1>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Arjun Kumar"
              className={inputCls}
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className={inputCls}
            />
          </div>

          {/* Role — only admin/sub_admin/manager can pick */}
          {(isAdmin || isManager) && availableRoles.length > 0 && (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as UserRole,
                    manager_id: "",
                  }))
                }
                className={inputCls}
              >
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Department
            </label>
            <select
              value={form.department}
              onChange={(e) =>
                setForm((f) => ({ ...f, department: e.target.value as UserDepartment }))
              }
              className={inputCls}
            >
              <option value="">— None —</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Manager assignment */}
          {showManagerDropdown && (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Assign to Manager / Team Lead
              </label>
              {managers.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  No managers found. Create a manager or team lead first, or leave unassigned.
                </p>
              ) : (
                <select
                  value={form.manager_id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedMgr = managers.find((m) => String(m.id) === selectedId);
                    setForm((f) => ({
                      ...f,
                      manager_id: selectedId,
                      department: (selectedMgr?.department as UserDepartment) || f.department,
                    }));
                  }}
                  className={inputCls}
                >
                  <option value="">— Unassigned —</option>
                  {managers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name || mgr.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Info notice */}
          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
            A secure password will be auto-generated and sent to the user's email along with the login link.
            The user must change their password on first login.
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {saving ? "Creating..." : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
