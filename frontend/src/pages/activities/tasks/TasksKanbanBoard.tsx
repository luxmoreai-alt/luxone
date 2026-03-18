import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../api/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskStatusColumn =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Waiting for input"
  | "Deferred";

type TaskRecord = {
  id: string | number;
  subject?: string;
  title?: string;
  due_date?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  owner?: string | { name?: string; full_name?: string; first_name?: string; last_name?: string } | null;
  account_name?: string | null;
  account_id?: number | string | null;
  company?: string | null;
  contact_name?: string | null;
  contact_id?: number | string | null;
  status?: string | null;
};

type ApiResponse =
  | TaskRecord[]
  | { results?: TaskRecord[]; data?: TaskRecord[]; tasks?: TaskRecord[] };

type NormalizedFilter = { key: string; value: string };
type DragState = { taskId: string | number; fromColumn: TaskStatusColumn };

const KANBAN_COLUMNS: TaskStatusColumn[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Waiting for input",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapTaskStatusToColumn(status?: string | null): TaskStatusColumn {
  const s = (status || "").trim().toLowerCase();
  if (["not started", "not_started", "new", "open"].includes(s)) return "Not Started";
  if (["in progress", "in_progress", "progress", "working"].includes(s)) return "In Progress";
  if (["completed", "complete", "done", "closed"].includes(s)) return "Completed";
  if (["waiting for input", "waiting_for_input", "waiting", "pending input"].includes(s)) return "Waiting for input";
  if (["deferred", "defer"].includes(s)) return "Deferred";
  return "Not Started";
}

function getTaskListFromResponse(response: ApiResponse): TaskRecord[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.tasks)) return response.tasks;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isOverdue(value?: string | null) {
  if (!value) return false;
  return new Date(value) < new Date();
}

function getOwnerName(owner: TaskRecord["owner"]) {
  if (!owner) return null;
  if (typeof owner === "string") return owner;
  if (owner.name) return owner.name;
  if (owner.full_name) return owner.full_name;
  const first = owner.first_name || "";
  const last = owner.last_name || "";
  return `${first} ${last}`.trim() || null;
}

// ── Card ──────────────────────────────────────────────────────────────────────

function TaskKanbanCard({
  task,
  isDragging,
  isSelected,
  onToggleSelect,
  onOpen,
  onOpenContact,
  onOpenAccount,
  onDragStart,
  onDragEnd,
}: {
  task: TaskRecord;
  isDragging: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string | number) => void;
  onOpen: (id: TaskRecord["id"]) => void;
  onOpenContact: (id: TaskRecord["contact_id"]) => void;
  onOpenAccount: (id: TaskRecord["account_id"]) => void;
  onDragStart: (e: React.DragEvent, task: TaskRecord) => void;
  onDragEnd: () => void;
}) {
  const dueDate = formatDate(task.due_date || task.dueDate);
  const overdue = isOverdue(task.due_date || task.dueDate);
  const ownerName = getOwnerName(task.owner);

  return (
    <div
      draggable={!isSelected}
      onDragStart={(e) => !isSelected && onDragStart(e, task)}
      onDragEnd={onDragEnd}
      className={`group relative rounded border bg-white transition-all select-none
        ${isDragging
          ? "scale-95 opacity-40 shadow-none"
          : isSelected
            ? "border-teal-400 ring-2 ring-teal-200 shadow-sm"
            : "cursor-grab border-slate-200 hover:border-slate-300 hover:shadow-sm active:cursor-grabbing"
        }`}
    >
      {/* Checkbox */}
      <div
        className={`absolute left-2.5 top-2.5 z-10 transition-opacity
          ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-teal-600"
        />
      </div>

      <div className="px-3 pt-3 pb-2.5 pl-8">
        {/* Title */}
        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className="mb-2 w-full text-left"
        >
          <p className="text-[13px] font-semibold leading-snug text-slate-800 hover:text-teal-700 transition-colors line-clamp-2">
            {task.subject || task.title || "Untitled Task"}
          </p>
        </button>

        {/* Meta rows — Zoho-style: plain values, no labels */}
        <div className="space-y-0.5">
          {dueDate && (
            <p className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-slate-500"}`}>
              {dueDate}{overdue ? " (Overdue)" : ""}
            </p>
          )}
          <p className="text-xs text-slate-500">{task.priority || "Normal"}</p>
          <p className="text-xs text-slate-500">{ownerName || "Unassigned"}</p>
          {task.contact_name && (
            <button
              type="button"
              onClick={() => task.contact_id && onOpenContact(task.contact_id)}
              className="block max-w-full truncate text-left text-xs text-teal-700 hover:underline"
            >
              {task.contact_name}
            </button>
          )}
          {task.account_name && (
            <button
              type="button"
              onClick={() => task.account_id && onOpenAccount(task.account_id)}
              className="block max-w-full truncate text-left text-xs text-slate-500 hover:text-slate-700"
            >
              {task.account_name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function TaskKanbanColumn({
  title,
  tasks,
  draggingId,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onOpenTask,
  onOpenContact,
  onOpenAccount,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  title: TaskStatusColumn;
  tasks: TaskRecord[];
  draggingId: string | number | null;
  selectedIds: Set<string | number>;
  onToggleSelect: (id: string | number) => void;
  onSelectAll: (ids: (string | number)[], checked: boolean) => void;
  onOpenTask: (id: TaskRecord["id"]) => void;
  onOpenContact: (id: TaskRecord["contact_id"]) => void;
  onOpenAccount: (id: TaskRecord["account_id"]) => void;
  onDragStart: (e: React.DragEvent, task: TaskRecord) => void;
  onDragEnd: () => void;
  onDrop: (column: TaskStatusColumn) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));
  const someSelected = tasks.some((t) => selectedIds.has(t.id));

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Zoho-style teal header */}
      <div className="flex items-center gap-2 bg-teal-50 border-b border-teal-100 px-3 py-2.5">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
          onChange={(e) => onSelectAll(tasks.map((t) => t.id), e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-teal-600"
          title="Select all in this column"
        />
        <span className="flex-1 text-[13px] font-semibold text-slate-700">{title}</span>
        <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(title); }}
        className={`flex-1 overflow-y-auto p-2.5 transition-colors
          ${isOver ? "bg-teal-50/40 ring-2 ring-inset ring-teal-200" : "bg-slate-50/50"}`}
        style={{ minHeight: 120, maxHeight: "calc(100vh - 260px)" }}
      >
        {tasks.length === 0 ? (
          <div className={`flex h-20 items-center justify-center rounded border-2 border-dashed text-xs transition
            ${isOver ? "border-teal-300 bg-teal-50 text-teal-500" : "border-slate-200 text-slate-300"}`}>
            {isOver ? "Drop here" : "No Tasks found"}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskKanbanCard
                key={task.id}
                task={task}
                isDragging={draggingId === task.id}
                isSelected={selectedIds.has(task.id)}
                onToggleSelect={onToggleSelect}
                onOpen={onOpenTask}
                onOpenContact={onOpenContact}
                onOpenAccount={onOpenAccount}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
            {isOver && <div className="h-0.5 rounded-full bg-teal-300 opacity-60" />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Deferred Column (collapsed/vertical strip) ────────────────────────────────

function DeferredColumn({
  count,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  count: number;
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm cursor-default transition-colors
        ${isOver ? "bg-amber-50 border-amber-300" : ""}`}
      style={{ minHeight: 200 }}
      title={`Deferred (${count})`}
    >
      <div className="flex flex-col items-center gap-2">
        <span
          className="text-xs font-semibold text-slate-500 tracking-widest select-none"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Deferred
        </span>
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
          {count}
        </span>
      </div>
    </div>
  );
}

// ── Selection bar ─────────────────────────────────────────────────────────────

function SelectionBar({
  count,
  onDelete,
  onClear,
}: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-800 px-6 py-2.5">
      <span className="text-sm font-medium text-white">
        {count} record{count !== 1 ? "s" : ""} selected
      </span>
      <span className="text-slate-500">·</span>
      <button type="button" onClick={onClear} className="text-sm text-slate-400 underline-offset-2 hover:text-white">
        Clear
      </button>
      <div className="ml-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded border border-red-400 bg-transparent px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500 hover:text-white"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
      <button type="button" onClick={onClear} className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
        <X size={15} />
      </button>
    </div>
  );
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function matchesText(v: string | null | undefined, kw: string) {
  return !!(v?.toLowerCase().includes(kw));
}

function matchesTaskFilter(task: TaskRecord, f: NormalizedFilter) {
  if (!f.value) return true;
  switch (f.key) {
    case "status":   return matchesText(task.status, f.value);
    case "priority": return matchesText(task.priority, f.value);
    case "owner":    return matchesText(getOwnerName(task.owner), f.value);
    case "related":  return matchesText(task.contact_name, f.value) || matchesText(task.account_name, f.value);
    case "company":  return matchesText(task.account_name, f.value) || matchesText(task.company, f.value);
    default:         return true;
  }
}

// ── Board ─────────────────────────────────────────────────────────────────────

export default function TasksKanbanBoard({
  filters = {},
  onSelectionChange,
}: {
  filters?: Record<string, string>;
  onSelectionChange?: (ids: (string | number)[]) => void;
}) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deferredOver, setDeferredOver] = useState(false);
  const dragState = useRef<DragState | null>(null);
  const navigate = useNavigate();

  const normalizedFilters = useMemo<NormalizedFilter[]>(() =>
    Object.entries(filters)
      .map(([key, value]) => ({ key, value: value.trim().toLowerCase() }))
      .filter((f) => f.value.length > 0),
    [filters]
  );

  const filteredTasks = useMemo(() =>
    normalizedFilters.length
      ? tasks.filter((t) => normalizedFilters.every((f) => matchesTaskFilter(t, f)))
      : tasks,
    [tasks, normalizedFilters]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<ApiResponse>("/tasks/", { method: "GET" })
      .then((json) => { if (active) setTasks(getTaskListFromResponse(json)); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Something went wrong"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const groupedTasks = useMemo(() => {
    const g: Record<TaskStatusColumn, TaskRecord[]> = {
      "Not Started": [], "In Progress": [], "Completed": [], "Waiting for input": [], "Deferred": [],
    };
    for (const task of filteredTasks) g[mapTaskStatusToColumn(task.status)].push(task);
    return g;
  }, [filteredTasks]);

  // ── Selection ───────────────────────────────────────────────────────────────

  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      onSelectionChange?.([...next]);
      return next;
    });
  };

  const selectAll = (ids: (string | number)[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => checked ? next.add(id) : next.delete(id));
      onSelectionChange?.([...next]);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    onSelectionChange?.([]);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => apiRequest(`/tasks/${id}/`, { method: "DELETE" })));
      setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      clearSelection();
    } catch {
      alert("Some tasks could not be deleted. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Drag ────────────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, task: TaskRecord) => {
    e.dataTransfer.effectAllowed = "move";
    dragState.current = { taskId: task.id, fromColumn: mapTaskStatusToColumn(task.status) };
    setDraggingId(task.id);
  };

  const handleDragEnd = () => setDraggingId(null);

  const handleDrop = async (toColumn: TaskStatusColumn) => {
    const state = dragState.current;
    dragState.current = null;
    setDraggingId(null);
    if (!state || state.fromColumn === toColumn) return;
    const { taskId, fromColumn } = state;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: toColumn } : t));
    try {
      await apiRequest(`/tasks/${taskId}/`, { method: "PATCH", body: JSON.stringify({ status: toColumn }) });
    } catch {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: fromColumn } : t));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="h-5 w-5 animate-spin text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-medium">Loading Tasks…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
        <p className="text-sm text-slate-400">No tasks yet. Create your first task.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <SelectionBar count={selectedIds.size} onDelete={() => void handleDelete()} onClear={clearSelection} />
      )}

      {deleting && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-6 py-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Deleting selected tasks…
        </div>
      )}

      {/* Board */}
      <div className="overflow-auto p-4">
        <div className="flex gap-3" style={{ minWidth: "max-content", alignItems: "flex-start" }}>
          {KANBAN_COLUMNS.map((column) => (
            <TaskKanbanColumn
              key={column}
              title={column}
              tasks={groupedTasks[column]}
              draggingId={draggingId}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onOpenTask={(id) => navigate(`/tasks/${id}`)}
              onOpenContact={(id) => id && navigate(`/contacts/${id}`)}
              onOpenAccount={(id) => id && navigate(`/accounts/${id}`)}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={(col) => void handleDrop(col)}
            />
          ))}

          {/* Deferred — collapsed vertical column */}
          <DeferredColumn
            count={groupedTasks["Deferred"].length}
            isOver={deferredOver}
            onDragOver={(e) => { e.preventDefault(); setDeferredOver(true); }}
            onDragLeave={() => setDeferredOver(false)}
            onDrop={(e) => { e.preventDefault(); setDeferredOver(false); void handleDrop("Deferred"); }}
          />
        </div>
      </div>
    </div>
  );
}
