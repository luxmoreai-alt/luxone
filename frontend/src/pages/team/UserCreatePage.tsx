import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

type Manager = { id: number; email: string };

type FormState = {
  email: string;
  password: string;
  role: "manager" | "employee";
  manager_id: string; // "" = unassigned
};

export default function UserCreatePage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    role: "employee",
    manager_id: "",
  });
  const [managers, setManagers] = useState<Manager[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch managers list (only admin needs to pick a manager)
  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<{ id: number; email: string; role: string }[]>("/auth/manage-users/")
      .then((data) => {
        const mgrs = (Array.isArray(data) ? data : []).filter((u) => u.role === "manager");
        setManagers(mgrs);
      })
      .catch(() => setManagers([]));
  }, [isAdmin]);

  const showManagerDropdown = isAdmin && form.role === "employee";

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: form.email.trim(),
        password: form.password,
        role: isAdmin ? form.role : "employee",
      };
      if (isAdmin && form.manager_id) {
        payload.manager = Number(form.manager_id);
      }
      await apiRequest("/auth/manage-users/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

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
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Email */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Role — only admin can pick */}
          {isAdmin && (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as FormState["role"],
                    manager_id: "", // reset manager when role changes
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          )}

          {/* Manager assignment — admin creating an employee */}
          {showManagerDropdown && (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Assign to Manager
              </label>
              {managers.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  No managers found. Create a manager first, or leave unassigned.
                </p>
              ) : (
                <select
                  value={form.manager_id}
                  onChange={(e) => setForm((f) => ({ ...f, manager_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">— Unassigned —</option>
                  {managers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {!isAdmin && (
            <p className="mb-4 rounded-lg bg-violet-50 px-3 py-2.5 text-xs text-violet-700">
              This employee will be assigned to you as their manager.
            </p>
          )}

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
