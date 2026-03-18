import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { apiRequest } from "../../api/client";
import type { CreateProjectPayload, Project } from "./types";

const emptyForm: CreateProjectPayload = {
  project_code: "",
  name: "",
  account_name: "",
  contact_name: "",
  deal_name: "",
  owner: "",
  status: "Planning",
  priority: "Medium",
  start_date: "",
  due_date: "",
  estimated_hours: "",
  description: "",
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProjectPayload>(emptyForm);

  useEffect(() => {
    if (!isEdit) return;
    const fetchProject = async () => {
      try {
        const project = await apiRequest<Project>(`/projects/${id}/`);
        setFormData({
          project_code: project.project_code ?? "",
          name: project.name ?? "",
          account_name: project.account_name ?? "",
          contact_name: project.contact_name ?? "",
          deal_name: project.deal_name ?? "",
          owner: project.owner ?? "",
          status: project.status,
          priority: project.priority,
          start_date: project.start_date ?? "",
          due_date: project.due_date ?? "",
          estimated_hours: project.estimated_hours ?? "",
          description: project.description ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setFetching(false);
      }
    };
    fetchProject();
  }, [id, isEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "estimated_hours"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_code || !formData.name) {
      setError("Project code and project name are required");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      if (isEdit) {
        await apiRequest(`/projects/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
        navigate(`/projects/${id}`);
      } else {
        const response = await apiRequest("/projects/", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        const created = response as { id: string | number };
        navigate(`/projects/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} project`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Loading project...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 px-6 py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-900">
              {isEdit ? "Edit Project" : "Create Project"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isEdit
                ? "Update the project details below."
                : "Add a new project linked to account, contact, and deal."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Project Code">
                <input
                  type="text"
                  name="project_code"
                  value={formData.project_code}
                  onChange={handleChange}
                  placeholder="PRJ-003"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  required
                />
              </FormField>

              <FormField label="Project Name">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter project name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  required
                />
              </FormField>

              <FormField label="Account">
                <input
                  type="text"
                  name="account_name"
                  value={formData.account_name}
                  onChange={handleChange}
                  placeholder="Enter account name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Contact">
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="Enter contact name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Deal">
                <input
                  type="text"
                  name="deal_name"
                  value={formData.deal_name}
                  onChange={handleChange}
                  placeholder="Enter deal name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Owner">
                <input
                  type="text"
                  name="owner"
                  value={formData.owner}
                  onChange={handleChange}
                  placeholder="Enter owner name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Status">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  {["Planning", "Active", "On Hold", "Delayed", "Completed", "Cancelled"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Priority">
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  {["Low", "Medium", "High", "Critical"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Start Date">
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Due Date">
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Estimated Hours">
                <input
                  type="number"
                  name="estimated_hours"
                  value={formData.estimated_hours}
                  onChange={handleChange}
                  placeholder="120"
                  min={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                placeholder="Enter project description"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </FormField>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Saving..." : isEdit ? "Update Project" : "Save Project"}
              </button>
              <button
                type="button"
                onClick={() => navigate(isEdit ? `/projects/${id}` : "/projects")}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
