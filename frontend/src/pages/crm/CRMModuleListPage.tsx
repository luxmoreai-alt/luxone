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
  onDeleteRow?: (id: string) => Promise<void>;
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

/** Extract display name from any CRM record */
function getRecordName(row: CRMRecord): string {
  const r = row as Record<string, unknown>;
  return String(r.leadName ?? r.contactName ?? r.accountName ?? r.dealName ?? "");
}

/** Extract email from any CRM record */
function getRecordEmail(row: CRMRecord): string {
  const r = row as Record<string, unknown>;
  return String(r.email ?? "");
}

export default function CRMModuleListPage<T extends CRMRecord>({
  config,
  rows,
  pageSize = 5,
  showNotes = true,
  showActivity = false,
  onDeleteRow,
}: CRMModuleListPageProps<T>) {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortState, setSortState] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [pinnedColumn, setPinnedColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<string, string>>>({});
  const [sidebarFilters, setSidebarFilters] = useState<Record<string, string>>({});
  const [filterOpen, setFilterOpen] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalState>(null);
  const [activeRow, setActiveRow] = useState<T | null>(null);

  const visibleColumns = useMemo(
    () => config.columns.filter((column) => !hiddenColumns.includes(column.key)),
    [config.columns, hiddenColumns]
  );

  const processedRows = useMemo(() => {
    const combined = { ...columnFilters, ...sidebarFilters };
    let output = filterRecords(rows, visibleColumns, combined);

    if (sortState) {
      output = sortRecords(
        output,
        sortState.key as keyof T & string,
        sortState.direction
      );
    }

    return output;
  }, [rows, visibleColumns, columnFilters, sidebarFilters, sortState]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [page, pageSize, processedRows]);

  const openModal = (modal: ModalState, row: T) => {
    setActiveRow(row);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveRow(null);
  };

  const handleRowAction = (actionKey: string, row: T) => {
    if (actionKey === "copy-url") {
      void navigator.clipboard.writeText(
        `${window.location.origin}${config.baseRoute}/${row.id}`
      );
      return;
    }

    if (actionKey === "send-email") return openModal("send-email", row);
    if (actionKey === "add-tags") return openModal("add-tags", row);
    if (actionKey === "create-task") return openModal("task", row);
    if (actionKey === "create-meeting") return openModal("meeting", row);
    if (actionKey === "schedule-call") return openModal("schedule-call", row);
    if (actionKey === "log-call") return openModal("log-call", row);
    if (actionKey === "convert" && config.module === "leads") {
      return openModal("convert", row);
    }
    if (actionKey === "delete") return openModal("delete", row);
    if (actionKey === "edit") {
      if (config.module === "leads") {
        return navigate(`${config.baseRoute}/${row.id}/edit`);
      }
      return navigate(`${config.baseRoute}/${row.id}`);
    }
  };

  const handleOpenRow = (row: T) => {
    navigate(`${config.baseRoute}/${row.id}`);
  };

  const handleDelete = async (): Promise<void> => {
    if (!activeRow) return;
    if (onDeleteRow) {
      await onDeleteRow(activeRow.id);
    }
  };

  const handleSaveNote = async (note: string): Promise<void> => {
    if (!activeRow) {
      throw new Error("No record selected.");
    }

    if (config.module === "leads") {
      const { addLeadNote } = await import("../../lib/api/leadsApi");
      await addLeadNote(activeRow.id, note);
      return;
    }

    if (config.module === "accounts") {
      const { addAccountNote } = await import("../../lib/api/accountsApi");
      await addAccountNote(activeRow.id, note);
      return;
    }

    if (config.module === "contacts") {
      const { addContactNote } = await import("../../lib/api/contactsApi");
      await addContactNote(activeRow.id, note);
      return;
    }

    throw new Error("Notes are not enabled for this module.");
  };

  const handleSendEmail = async (payload: {
    to: string;
    subject: string;
    body: string;
    from_email?: string;
  }): Promise<void> => {
    if (!activeRow) {
      throw new Error("No record selected.");
    }

    if (config.module === "contacts") {
      const { sendContactEmail } = await import("../../lib/api/contactsApi");
      await sendContactEmail(activeRow.id, {
        subject: payload.subject,
        body: payload.body,
      });
      return;
    }

    if (config.module === "accounts") {
      const { sendAccountEmail } = await import("../../lib/api/accountsApi");
      await sendAccountEmail(activeRow.id, {
        subject: payload.subject,
        body: payload.body,
      });
      return;
    }

    if (config.module === "leads") {
      const { sendEmail, sendLeadEmail } = await import("../../lib/api/leadsApi");
      await sendEmail(payload);
      await sendLeadEmail(activeRow.id, {
        subject: payload.subject,
        body: payload.body,
      });
      return;
    }

    const { sendEmail } = await import("../../lib/api/leadsApi");
    await sendEmail(payload);
  };

  const handleCreateTask = async (payload: {
    subject: string;
    description?: string;
  }): Promise<void> => {
    if (!activeRow) {
      throw new Error("No record selected.");
    }

    if (config.module === "contacts") {
      const { createContactTask } = await import("../../lib/api/contactsApi");
      await createContactTask(activeRow.id, payload);
      return;
    }

    if (config.module === "deals") {
      const { createDealTask } = await import("../../lib/api/dealsApi");
      await createDealTask(activeRow.id, payload);
      return;
    }

    if (config.module === "accounts") {
      const { createAccountTask } = await import("../../lib/api/accountsApi");
      await createAccountTask(activeRow.id, payload);
      return;
    }

    if (config.module === "leads") {
      const { createLeadTask } = await import("../../lib/api/leadsApi");
      await createLeadTask(activeRow.id, payload);
      return;
    }

    throw new Error(`Task action is not available for ${config.module}.`);
  };

  const handleCreateMeeting = async (payload: {
    meeting_subject: string;
    agenda?: string;
  }): Promise<void> => {
    if (!activeRow) {
      throw new Error("No record selected.");
    }

    if (config.module === "deals") {
      const { scheduleDealMeeting } = await import("../../lib/api/dealsApi");
      await scheduleDealMeeting(activeRow.id, payload);
      return;
    }

    if (config.module === "accounts") {
      const { scheduleAccountMeeting } = await import("../../lib/api/accountsApi");
      await scheduleAccountMeeting(activeRow.id, payload);
      return;
    }

    if (config.module === "leads") {
      const { scheduleLeadMeeting } = await import("../../lib/api/leadsApi");
      await scheduleLeadMeeting(activeRow.id, payload);
      return;
    }

    throw new Error(`Meeting action is not available for ${config.module}.`);
  };

  const handleCallAction = async (payload: {
    call_summary: string;
    call_outcome?: string;
  }): Promise<void> => {
    if (!activeRow) {
      throw new Error("No record selected.");
    }

    if (config.module === "contacts") {
      const { logContactCall } = await import("../../lib/api/contactsApi");
      await logContactCall(activeRow.id, payload);
      return;
    }

    if (config.module === "deals") {
      const { logDealCall } = await import("../../lib/api/dealsApi");
      await logDealCall(activeRow.id, payload);
      return;
    }

    if (config.module === "accounts") {
      const { logAccountCall } = await import("../../lib/api/accountsApi");
      await logAccountCall(activeRow.id, payload);
      return;
    }

    if (config.module === "leads") {
      const { logLeadCall } = await import("../../lib/api/leadsApi");
      await logLeadCall(activeRow.id, payload);
      return;
    }

    throw new Error(`Call action is not available for ${config.module}.`);
  };

  const handleConvertLead = async (payload: {
    create_deal: boolean;
    deal_name?: string;
  }): Promise<void> => {
    if (!activeRow || config.module !== "leads") {
      throw new Error("Convert is only available for leads.");
    }

    const { convertLead } = await import("../../lib/api/leadsApi");
    await convertLead(activeRow.id, payload);
  };

  const recordName = activeRow ? getRecordName(activeRow as CRMRecord) : "";
  const recordEmail = activeRow ? getRecordEmail(activeRow as CRMRecord) : "";

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
          onCreateClick={() => navigate(`${config.baseRoute}/create`)}
        />

        <div className="flex gap-3">
          {config.filterSections && filterOpen && (
            <FilterSidebar
              title={`Filter ${config.title} by`}
              sections={config.filterSections}
              onApply={(filters) => {
                setSidebarFilters(filters);
                setPage(1);
              }}
              onClear={() => {
                setSidebarFilters({});
                setPage(1);
              }}
            />
          )}

          <div className="min-w-0 flex-1">
            <CRMTable
              rows={paginatedRows}
              columns={visibleColumns}
              rowActions={config.rowActions}
              selectedIds={selectedIds}
              hiddenColumns={hiddenColumns}
              pinnedColumn={pinnedColumn}
              columnFilters={columnFilters}
              showNotes={showNotes}
              showActivity={showActivity}
              onToggleAll={(checked) => {
                if (!checked) {
                  setSelectedIds([]);
                  return;
                }
                setSelectedIds(paginatedRows.map((row) => row.id));
              }}
              onToggleRow={(id, checked) => {
                if (!checked) {
                  setSelectedIds((prev) => prev.filter((item) => item !== id));
                  return;
                }

                setSelectedIds((prev) =>
                  prev.includes(id) ? prev : [...prev, id]
                );
              }}
              onOpenRow={handleOpenRow}
              onOpenNotes={(row) => openModal("note", row)}
              onOpenActivityAction={(row, actionKey) => {
                if (actionKey === "create-task") openModal("task", row);
                if (actionKey === "create-meeting") openModal("meeting", row);
                if (actionKey === "schedule-call") openModal("schedule-call", row);
                if (actionKey === "log-call") openModal("log-call", row);
              }}
              onRowAction={handleRowAction}
              onSortColumn={(columnKey, direction) =>
                setSortState({ key: columnKey, direction })
              }
              onToggleHideColumn={(columnKey) => {
                setHiddenColumns((prev) =>
                  prev.includes(columnKey)
                    ? prev.filter((item) => item !== columnKey)
                    : [...prev, columnKey]
                );

                if (pinnedColumn === columnKey) {
                  setPinnedColumn(null);
                }
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
              totalItems={processedRows.length}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>

      <SendEmailModal
        open={activeModal === "send-email"}
        onClose={closeModal}
        toEmail={recordEmail}
        recordName={recordName}
        onSend={handleSendEmail}
      />
      <AddTagsModal
        open={activeModal === "add-tags"}
        onClose={closeModal}
        recordName={recordName}
      />
      <TaskModal
        open={activeModal === "task"}
        onClose={closeModal}
        recordName={recordName}
        onSave={handleCreateTask}
      />
      <MeetingModal
        open={activeModal === "meeting"}
        onClose={closeModal}
        recordName={recordName}
        onSave={handleCreateMeeting}
      />
      <ScheduleCallModal
        open={activeModal === "schedule-call"}
        onClose={closeModal}
        recordName={recordName}
        onSave={handleCallAction}
      />
      <LogCallModal
        open={activeModal === "log-call"}
        onClose={closeModal}
        recordName={recordName}
        onSave={handleCallAction}
      />
      <NoteModal
        open={activeModal === "note"}
        onClose={closeModal}
        recordName={recordName}
        onSave={handleSaveNote}
      />
      <ConvertLeadModal
        open={activeModal === "convert"}
        onClose={closeModal}
        leadName={recordName}
        onConvert={handleConvertLead}
      />
      <DeleteModal
        open={activeModal === "delete"}
        onClose={closeModal}
        onConfirm={handleDelete}
        recordName={recordName}
      />
    </DashboardLayout>
  );
}
