import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModuleToolbar from "../../components/crm/ModuleToolbar";
import FilterSidebar from "../../components/crm/FilterSidebar";
import CRMPagination from "../../components/crm/CRMPagination";
import CRMTable from "../../components/crm/CRMTable";
import {
  AddTagsModal,
  ConvertLeadModal,
  DeleteModal,
  LogCallModal,
  MeetingModal,
  NoteModal,
  ScheduleCallModal,
  SendEmailModal,
  TaskModal,
} from "../../components/crm/CRMActionModals";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { filterRecords, sortRecords } from "../../lib/shared/crmHelpers";
import type { CRMModuleConfig, CRMRecord } from "../../lib/shared/crmTypes";

type CRMModuleListPageProps<T extends CRMRecord> = {
  config: CRMModuleConfig<T>;
  rows: T[];
  pageSize?: number;
  showNotes?: boolean;
  showActivity?: boolean;
};

type ModalState =
  | null
  | "send-email"
  | "add-tags"
  | "task"
  | "meeting"
  | "schedule-call"
  | "log-call"
  | "note"
  | "convert"
  | "delete";

export default function CRMModuleListPage<T extends CRMRecord>({
  config,
  rows,
  pageSize = 5,
  showNotes = true,
  showActivity = false,
}: CRMModuleListPageProps<T>) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortState, setSortState] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    null
  );
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [pinnedColumn, setPinnedColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<string, string>>>({});
  const [filterOpen, setFilterOpen] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalState>(null);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  const visibleColumns = useMemo(
    () => config.columns.filter((column) => !hiddenColumns.includes(column.key)),
    [config.columns, hiddenColumns]
  );

  const processedRows = useMemo(() => {
    let output = filterRecords(paginatedRows, visibleColumns, columnFilters);

    if (sortState) {
      output = sortRecords(output, sortState.key as keyof T & string, sortState.direction);
    }

    return output;
  }, [columnFilters, paginatedRows, sortState, visibleColumns]);

  const handleRowAction = (actionKey: string, row: T) => {
    if (actionKey === "copy-url") {
      void navigator.clipboard.writeText(`${window.location.origin}${config.baseRoute}/${row.id}`);
      return;
    }
    if (actionKey === "send-email") return setActiveModal("send-email");
    if (actionKey === "add-tags") return setActiveModal("add-tags");
    if (actionKey === "create-task") return setActiveModal("task");
    if (actionKey === "create-meeting") return setActiveModal("meeting");
    if (actionKey === "schedule-call") return setActiveModal("schedule-call");
    if (actionKey === "log-call") return setActiveModal("log-call");
    if (actionKey === "convert" && config.module === "leads") return setActiveModal("convert");
    if (actionKey === "delete") return setActiveModal("delete");
    if (actionKey === "edit") return navigate(`${config.baseRoute}/${row.id}`);
  };

  const handleOpenRow = (row: T) => navigate(`${config.baseRoute}/${row.id}`);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ModuleToolbar
          viewName={config.subtitle}
          createButtonLabel={`Create ${config.title.slice(0, -1)}`}
          isFilterOpen={filterOpen}
          onToggleFilter={() => {
            if (!config.filterSections) return;
            setFilterOpen((prev) => !prev);
          }}
        />

        <div className="flex gap-3">
          {config.filterSections && filterOpen && (
            <FilterSidebar
              title={`Filter ${config.title} by`}
              sections={config.filterSections}
            />
          )}

          <div className="min-w-0 flex-1">
        <CRMTable
          rows={processedRows}
          columns={visibleColumns}
          rowActions={config.rowActions}
          selectedIds={selectedIds}
          hiddenColumns={hiddenColumns}
          pinnedColumn={pinnedColumn}
          columnFilters={columnFilters}
          showNotes={showNotes}
          showActivity={showActivity}
          onToggleAll={(checked) => {
            if (!checked) return setSelectedIds([]);
            setSelectedIds(processedRows.map((row) => row.id));
          }}
          onToggleRow={(id, checked) => {
            if (!checked) return setSelectedIds((prev) => prev.filter((item) => item !== id));
            setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          }}
          onOpenRow={handleOpenRow}
          onOpenNotes={() => setActiveModal("note")}
          onOpenActivityAction={(_, actionKey) => {
            if (actionKey === "create-task") setActiveModal("task");
            if (actionKey === "create-meeting") setActiveModal("meeting");
            if (actionKey === "schedule-call") setActiveModal("schedule-call");
            if (actionKey === "log-call") setActiveModal("log-call");
          }}
          onRowAction={handleRowAction}
          onSortColumn={(columnKey, direction) => setSortState({ key: columnKey, direction })}
          onToggleHideColumn={(columnKey) => {
            setHiddenColumns((prev) =>
              prev.includes(columnKey)
                ? prev.filter((item) => item !== columnKey)
                : [...prev, columnKey]
            );
            if (pinnedColumn === columnKey) setPinnedColumn(null);
          }}
          onTogglePinColumn={(columnKey) =>
            setPinnedColumn((prev) => (prev === columnKey ? null : columnKey))
          }
          onFilterColumn={(columnKey, value) =>
            setColumnFilters((prev) => ({ ...prev, [columnKey]: value }))
          }
        />

        <CRMPagination
          page={page}
          pageSize={pageSize}
          totalItems={rows.length}
          onPageChange={setPage}
        />
          </div>
        </div>
      </div>

      <SendEmailModal open={activeModal === "send-email"} onClose={() => setActiveModal(null)} />
      <AddTagsModal open={activeModal === "add-tags"} onClose={() => setActiveModal(null)} />
      <TaskModal open={activeModal === "task"} onClose={() => setActiveModal(null)} />
      <MeetingModal open={activeModal === "meeting"} onClose={() => setActiveModal(null)} />
      <ScheduleCallModal open={activeModal === "schedule-call"} onClose={() => setActiveModal(null)} />
      <LogCallModal open={activeModal === "log-call"} onClose={() => setActiveModal(null)} />
      <NoteModal open={activeModal === "note"} onClose={() => setActiveModal(null)} />
      <ConvertLeadModal open={activeModal === "convert"} onClose={() => setActiveModal(null)} />
      <DeleteModal open={activeModal === "delete"} onClose={() => setActiveModal(null)} />
    </DashboardLayout>
  );
}
