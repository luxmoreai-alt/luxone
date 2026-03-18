import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { apiRequest } from "../../api/client";
import type { Project, ProjectTask, ProjectPriority, ProjectTaskStatus } from "./types";
import { ProjectPriorityBadge, ProjectStatusBadge } from "./ProjectStatusBadge";
import { CalendarDays, Clock3, FileText, FolderKanban, Users, AlertTriangle, ArrowLeft, Pencil, Plus, Trash2, Check, X, Eye } from "lucide-react";

type TabKey = "overview" | "tasks" | "phases" | "issues" | "team" | "files" | "notes" | "timelogs";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiRequest(`/projects/${id}/`);
      setProject(response as Project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) void fetchProject();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const completedTasks = useMemo(
    () => project?.tasks?.filter((t) => t.status === "Completed").length ?? 0,
    [project]
  );

  const openIssues = useMemo(
    () => project?.issues?.filter((i) => i.status === "Open").length ?? 0,
    [project]
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
          <div className="text-sm text-slate-500">Loading project...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-900">
              {error || "Project not found"}
            </h2>
            <Link to="/projects" className="mt-3 inline-block text-blue-600 hover:text-blue-700">
              Back to Projects
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 px-6 py-6">
        <div className="mb-4">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {project.project_code || "—"}
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">{project.name}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {project.description || "No description available."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              <ProjectPriorityBadge priority={project.priority} />
              <Link
                to={`/projects/${project.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Account" value={project.account_name} />
            <InfoCard label="Contact" value={project.contact_name} />
            <InfoCard label="Deal" value={project.deal_name} />
            <InfoCard label="Owner" value={project.owner} />
            <InfoCard label="Start Date" value={project.start_date ?? ""} icon={<CalendarDays className="h-4 w-4" />} />
            <InfoCard label="Due Date" value={project.due_date ?? ""} icon={<CalendarDays className="h-4 w-4" />} />
            <InfoCard label="Estimated Hours" value={`${project.estimated_hours ?? 0}h`} icon={<Clock3 className="h-4 w-4" />} />
            <InfoCard label="Logged Hours" value={`${project.logged_hours ?? 0}h`} icon={<Clock3 className="h-4 w-4" />} />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Project Progress</span>
              <span className="text-slate-500">{project.progress ?? 0}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-blue-600"
                style={{ width: `${project.progress ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>Overview</TabButton>
            <TabButton active={activeTab === "tasks"} onClick={() => setActiveTab("tasks")}>Tasks</TabButton>
            <TabButton active={activeTab === "phases"} onClick={() => setActiveTab("phases")}>Phases</TabButton>
            <TabButton active={activeTab === "issues"} onClick={() => setActiveTab("issues")}>Issues</TabButton>
            <TabButton active={activeTab === "team"} onClick={() => setActiveTab("team")}>Team</TabButton>
            <TabButton active={activeTab === "files"} onClick={() => setActiveTab("files")}>Files</TabButton>
            <TabButton active={activeTab === "notes"} onClick={() => setActiveTab("notes")}>Notes</TabButton>
            <TabButton active={activeTab === "timelogs"} onClick={() => setActiveTab("timelogs")}>Time Logs</TabButton>
          </div>

          {activeTab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <OverviewCard
                title="Tasks Summary"
                icon={<FolderKanban className="h-5 w-5 text-blue-600" />}
                items={[
                  `Total Tasks: ${project.tasks?.length ?? 0}`,
                  `Completed: ${completedTasks}`,
                  `Pending: ${(project.tasks?.length ?? 0) - completedTasks}`,
                ]}
              />
              <OverviewCard
                title="Issues Summary"
                icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
                items={[
                  `Total Issues: ${project.issues?.length ?? 0}`,
                  `Open: ${openIssues}`,
                  `Resolved/Closed: ${(project.issues?.length ?? 0) - openIssues}`,
                ]}
              />
              <OverviewCard
                title="Team Summary"
                icon={<Users className="h-5 w-5 text-emerald-600" />}
                items={[
                  `Members: ${project.members?.length ?? 0}`,
                  `Owner: ${project.owner || "—"}`,
                  `Account: ${project.account_name || "—"}`,
                ]}
              />
              <OverviewCard
                title="Files & Notes"
                icon={<FileText className="h-5 w-5 text-sky-600" />}
                items={[
                  `Files: ${project.files?.length ?? 0}`,
                  `Notes: ${project.notes?.length ?? 0}`,
                  `Time Logs: ${project.time_logs?.length ?? 0}`,
                ]}
              />
            </div>
          )}

          {activeTab === "tasks" && (
            <EditableTasksTable projectId={id!} tasks={project.tasks || []} onRefresh={fetchProject} />
          )}

          {activeTab === "phases" && (
            <SimpleTable
              headers={["Phase", "Status", "Due Date"]}
              rows={(project.phases || []).map((phase) => [phase.name, phase.status, phase.due_date])}
            />
          )}

          {activeTab === "issues" && (
            <SimpleTable
              headers={["Issue", "Severity", "Owner", "Status", "Due Date"]}
              rows={(project.issues || []).map((issue) => [
                issue.title,
                issue.severity,
                issue.owner,
                issue.status,
                issue.due_date,
              ])}
            />
          )}

          {activeTab === "team" && (
            <SimpleTable
              headers={["Name", "Role", "Email"]}
              rows={(project.members || []).map((member) => [member.name, member.role, member.email])}
            />
          )}

          {activeTab === "files" && (
            <div className="space-y-3">
              {(project.files || []).length === 0 ? (
                <EmptyState />
              ) : (
                project.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{file.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {file.type} • {file.uploaded_by} • {file.uploaded_at}
                      </p>
                    </div>
                    {file.file_url && (
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Open
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              {(project.notes || []).length === 0 ? (
                <EmptyState />
              ) : (
                project.notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm leading-6 text-slate-700">{note.content}</p>
                    <div className="mt-3 text-xs text-slate-500">
                      {note.created_by} • {note.created_at}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "timelogs" && (
            <SimpleTable
              headers={["Member", "Task", "Date", "Hours"]}
              rows={(project.time_logs || []).map((log) => [
                log.member,
                log.task,
                log.date,
                `${log.hours}h`,
              ])}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium text-slate-800">{value || "—"}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function OverviewCard({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm text-slate-600">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-100 text-sm text-slate-700">
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="px-4 py-4">
                  {cell || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return <div className="py-16 text-center text-sm text-slate-500">No records available.</div>;
}

// ── Editable Tasks Table ──────────────────────────────────────────────────────

const TASK_STATUSES: ProjectTaskStatus[] = ["Not Started", "In Progress", "On Hold", "Completed"];
const TASK_PRIORITIES: ProjectPriority[] = ["Low", "Medium", "High", "Critical"];

type TaskRow = Omit<ProjectTask, "id"> & { id?: string | number };

// ── Task Detail / Edit Modal ──────────────────────────────────────────────────

function TaskModal({
  task,
  projectId,
  onClose,
  onRefresh,
}: {
  task: ProjectTask;
  projectId: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<TaskRow>({ ...task });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200";

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    try {
      setSaving(true);
      setError(null);
      await apiRequest(`/projects/${projectId}/tasks/${task.id}/`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      await onRefresh();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    try {
      await apiRequest(`/projects/${projectId}/tasks/${task.id}/`, { method: "DELETE" });
      await onRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const statusColors: Record<ProjectTaskStatus, string> = {
    "Completed": "bg-emerald-100 text-emerald-700",
    "In Progress": "bg-blue-100 text-blue-700",
    "On Hold": "bg-amber-100 text-amber-700",
    "Not Started": "bg-slate-100 text-slate-600",
  };

  const priorityColors: Record<ProjectPriority, string> = {
    "Critical": "bg-red-100 text-red-700",
    "High": "bg-orange-100 text-orange-700",
    "Medium": "bg-sky-100 text-sky-700",
    "Low": "bg-slate-100 text-slate-600",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {isEditing ? "Edit Task" : "Task Details"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {isEditing ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">Title *</label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">Owner</label>
                <input
                  className={inputCls}
                  value={form.owner ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">Due Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.due_date ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">Status</label>
                  <select
                    className={inputCls}
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ProjectTaskStatus }))}
                  >
                    {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 uppercase tracking-wide">Priority</label>
                  <select
                    className={inputCls}
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as ProjectPriority }))}
                  >
                    {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Title</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{task.title || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Owner</p>
                  <p className="mt-1 text-sm text-slate-700">{task.owner || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Due Date</p>
                  <p className="mt-1 text-sm text-slate-700">{task.due_date || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[task.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {task.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Priority</p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityColors[task.priority] ?? "bg-slate-100 text-slate-600"}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            onClick={() => void handleDelete()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => { setIsEditing(false); setForm({ ...task }); setError(null); }}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableTasksTable({
  projectId,
  tasks,
  onRefresh,
}: {
  projectId: string;
  tasks: ProjectTask[];
  onRefresh: () => Promise<void>;
}) {
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState<TaskRow>({ title: "", owner: "", due_date: "", status: "Not Started", priority: "Medium" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAdd = () => {
    setAddingNew(true);
    setForm({ title: "", owner: "", due_date: "", status: "Not Started", priority: "Medium" });
    setError(null);
  };

  const cancelAdd = () => { setAddingNew(false); setError(null); };

  const handleAddSave = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    try {
      setSaving(true);
      setError(null);
      await apiRequest(`/projects/${projectId}/tasks/`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setAddingNew(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string | number, status: ProjectTaskStatus) => {
    try {
      await apiRequest(`/projects/${projectId}/tasks/${taskId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed.");
    }
  };

  const inputCls = "w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500";

  return (
    <div>
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
          onRefresh={async () => { setSelectedTask(null); await onRefresh(); }}
        />
      )}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
        <button
          onClick={startAdd}
          disabled={addingNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3 w-16">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Add new row */}
            {addingNew && (
              <tr className="bg-blue-50">
                <td className="px-4 py-2"><input className={inputCls} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Task title" autoFocus /></td>
                <td className="px-4 py-2"><input className={inputCls} value={form.owner} onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))} placeholder="Owner" /></td>
                <td className="px-4 py-2"><input type="date" className={inputCls} value={form.due_date ?? ""} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} /></td>
                <td className="px-4 py-2">
                  <select className={inputCls} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ProjectTaskStatus }))}>
                    {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select className={inputCls} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as ProjectPriority }))}>
                    {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => void handleAddSave()} disabled={saving} className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                    <button onClick={cancelAdd} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            )}

            {tasks.length === 0 && !addingNew && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No tasks yet. Click "Add Task" to create one.</td></tr>
            )}

            {tasks.map((task) => (
              <tr
                key={task.id}
                className="cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setSelectedTask(task)}
              >
                <td className="px-4 py-3 font-medium text-slate-800">{task.title || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{task.owner || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{task.due_date || "—"}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.status}
                    onChange={(e) => void handleStatusChange(task.id, e.target.value as ProjectTaskStatus)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border-0 outline-none cursor-pointer ${
                      task.status === "Completed" ? "bg-emerald-100 text-emerald-700"
                      : task.status === "In Progress" ? "bg-blue-100 text-blue-700"
                      : task.status === "On Hold" ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    task.priority === "Critical" ? "bg-red-100 text-red-700"
                    : task.priority === "High" ? "bg-orange-100 text-orange-700"
                    : task.priority === "Medium" ? "bg-sky-100 text-sky-700"
                    : "bg-slate-100 text-slate-600"
                  }`}>{task.priority}</span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    title="View / Edit"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}