import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import FilterSidebar from "../../../components/crm/FilterSidebar";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { apiRequest } from "../../../api/client";
import type { FilterSection } from "../../../lib/shared/crmTypes";

type FilterMap = Record<string, string>;
type CallType = "Outbound" | "Inbound";
type CallStatus = "Scheduled" | "Completed";

// ── Backend types ──────────────────────────────────────────────────────────────

interface BackendContact { id: number; first_name: string; last_name: string; email?: string | null }
interface BackendLead    { id: number; first_name: string; last_name: string; company?: string }
interface BackendAccount { id: number; account_name: string }
interface BackendDeal    { id: number; deal_name: string }
type Paginated<T> = { results: T[] };
function toList<T>(d: T[] | Paginated<T>): T[] { return Array.isArray(d) ? d : d.results ?? []; }

// ── Display record (used by the list table) ────────────────────────────────────

interface CallRecord {
  id: number;
  subject: string;
  callType: CallType;
  startDate: string;
  startTime: string;
  durationMinutes: number;
  durationSeconds: number;
  callFor: string;
  relatedTo: string;
  owner: string;
  status: CallStatus;
}

interface ApiCall {
  id: number;
  subject: string;
  call_type: CallType;
  call_status: CallStatus;
  call_start_time: string;
  duration_minutes: number;
  duration_seconds: number;
  owner_name?: string;
  lead_name?: string;
  contact_name?: string;
  account_name?: string;
  deal_name?: string;
}

function toApiRecord(r: ApiCall): CallRecord {
  const dt = new Date(r.call_start_time);
  return {
    id: r.id,
    subject: r.subject,
    callType: r.call_type,
    startDate: dt.toISOString().slice(0, 10),
    startTime: `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`,
    durationMinutes: r.duration_minutes,
    durationSeconds: r.duration_seconds,
    callFor: r.lead_name || r.contact_name || "—",
    relatedTo: r.account_name || r.deal_name || "—",
    owner: r.owner_name || "—",
    status: r.call_status,
  };
}

// ── Filter sidebar config ──────────────────────────────────────────────────────

const CALL_FILTER_SECTIONS: FilterSection[] = [
  { title: "Call Type", items: [{ label: "Call type contains", key: "callType" }] },
  { title: "Status",    items: [{ label: "Status contains",    key: "status" }] },
  { title: "Owner",     items: [{ label: "Owner name",         key: "owner" }] },
  {
    title: "Related",
    items: [
      { label: "Call For (Contact / Lead)",    key: "callFor" },
      { label: "Related To (Account / Deal)",  key: "relatedTo" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatDisplayTime(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function getTodayDate() { return new Date().toISOString().slice(0, 10); }
function getCurrentTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Shared searchable dropdown ─────────────────────────────────────────────────

interface SearchOption { id: number; label: string }

function SearchDropdown({
  placeholder,
  options,
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
}: {
  placeholder: string;
  options: SearchOption[];
  selectedId: number | null;
  selectedLabel: string;
  onSelect: (id: number, label: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative flex-1" ref={ref}>
      {selectedId ? (
        <div className="flex items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm">
          <span className="text-slate-800">{selectedLabel}</span>
          <button type="button" onClick={onClear} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center rounded-md border border-slate-300 px-3 py-2">
            <Search size={14} className="mr-2 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          {open && (
            <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No results found.</p>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
                    onClick={() => { onSelect(o.id, o.label); setQuery(""); setOpen(false); }}
                  >
                    {o.label}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── useLookupData – fetch contacts, leads, accounts, deals once ────────────────

function useLookupData() {
  const [contacts, setContacts] = useState<SearchOption[]>([]);
  const [leads,    setLeads]    = useState<SearchOption[]>([]);
  const [accounts, setAccounts] = useState<SearchOption[]>([]);
  const [deals,    setDeals]    = useState<SearchOption[]>([]);

  useEffect(() => {
    apiRequest<BackendContact[] | Paginated<BackendContact>>("/contacts/")
      .then((d) => setContacts(toList(d).map((c) => ({
        id: c.id,
        label: `${c.first_name} ${c.last_name}`.trim() || c.email || String(c.id),
      }))))
      .catch(() => {});

    apiRequest<BackendLead[] | Paginated<BackendLead>>("/leads/")
      .then((d) => setLeads(toList(d).map((l) => ({
        id: l.id,
        label: `${l.first_name} ${l.last_name}`.trim() || l.company || String(l.id),
      }))))
      .catch(() => {});

    apiRequest<BackendAccount[] | Paginated<BackendAccount>>("/accounts/")
      .then((d) => setAccounts(toList(d).map((a) => ({ id: a.id, label: a.account_name }))))
      .catch(() => {});

    apiRequest<BackendDeal[] | Paginated<BackendDeal>>("/deals/")
      .then((d) => setDeals(toList(d).map((deal) => ({ id: deal.id, label: deal.deal_name }))))
      .catch(() => {});
  }, []);

  return { contacts, leads, accounts, deals };
}

// ── Schedule Call Modal ────────────────────────────────────────────────────────

function ScheduleCallModal({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  saving?: boolean;
}) {
  const { contacts, leads, accounts, deals } = useLookupData();

  const [callForType,     setCallForType]     = useState<"Contact" | "Lead">("Contact");
  const [callForId,       setCallForId]       = useState<number | null>(null);
  const [callForLabel,    setCallForLabel]     = useState("");
  const [relatedToType,   setRelatedToType]   = useState<"Account" | "Deal" | "None">("None");
  const [relatedToId,     setRelatedToId]     = useState<number | null>(null);
  const [relatedToLabel,  setRelatedToLabel]  = useState("");
  const [callType,        setCallType]        = useState<CallType>("Outbound");
  const [startDate,       setStartDate]       = useState(getTodayDate());
  const [startTime,       setStartTime]       = useState("13:00");
  const [subject,         setSubject]         = useState("");
  const [reminder,        setReminder]        = useState("None");
  const [purpose,         setPurpose]         = useState("");

  const callForOptions  = callForType === "Contact" ? contacts : leads;
  const relatedOptions  = relatedToType === "Account" ? accounts : relatedToType === "Deal" ? deals : [];

  const handleSubmit = () => {
    const callStartTime = `${startDate}T${startTime}:00`;
    onSubmit({
      subject: subject || `Call scheduled with ${callForLabel || "Unknown"}`,
      call_type: callType,
      call_status: "Scheduled",
      call_start_time: callStartTime,
      duration_minutes: 0,
      duration_seconds: 0,
      related_to_type: relatedToType,
      reminder,
      purpose,
      ...(callForType === "Contact" && callForId   ? { contact: callForId }   : {}),
      ...(callForType === "Lead"    && callForId   ? { lead: callForId }       : {}),
      ...(relatedToType === "Account" && relatedToId ? { account: relatedToId } : {}),
      ...(relatedToType === "Deal"    && relatedToId ? { deal: relatedToId }    : {}),
    });
  };

  return (
    <ModalShell title="Schedule a Call" onClose={onClose}>
      <FormRow label="Call For">
        <div className="flex gap-2">
          <select
            value={callForType}
            onChange={(e) => {
              setCallForType(e.target.value as "Contact" | "Lead");
              setCallForId(null); setCallForLabel("");
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value="Contact">Contact</option>
            <option value="Lead">Lead</option>
          </select>
          <SearchDropdown
            placeholder={`Search ${callForType}...`}
            options={callForOptions}
            selectedId={callForId}
            selectedLabel={callForLabel}
            onSelect={(id, label) => { setCallForId(id); setCallForLabel(label); }}
            onClear={() => { setCallForId(null); setCallForLabel(""); }}
          />
        </div>
      </FormRow>

      <FormRow label="Related To">
        <div className="flex gap-2">
          <select
            value={relatedToType}
            onChange={(e) => {
              setRelatedToType(e.target.value as "Account" | "Deal" | "None");
              setRelatedToId(null); setRelatedToLabel("");
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value="None">None</option>
            <option value="Account">Account</option>
            <option value="Deal">Deal</option>
          </select>
          {relatedToType !== "None" && (
            <SearchDropdown
              placeholder={`Search ${relatedToType}...`}
              options={relatedOptions}
              selectedId={relatedToId}
              selectedLabel={relatedToLabel}
              onSelect={(id, label) => { setRelatedToId(id); setRelatedToLabel(label); }}
              onClear={() => { setRelatedToId(null); setRelatedToLabel(""); }}
            />
          )}
        </div>
      </FormRow>

      <FormRow label="Call Type">
        <select
          value={callType}
          onChange={(e) => setCallType(e.target.value as CallType)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        >
          <option value="Outbound">Outbound</option>
          <option value="Inbound">Inbound</option>
        </select>
      </FormRow>

      <FormRow label="Call Start Time">
        <div className="flex gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none" />
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none" />
        </div>
      </FormRow>

      <FormRow label="Subject">
        <input value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Call subject"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </FormRow>

      <FormRow label="Reminder">
        <select value={reminder} onChange={(e) => setReminder(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none">
          <option value="None">None</option>
          <option value="At time of call">At time of call</option>
          <option value="5 minutes before">5 minutes before</option>
          <option value="15 minutes before">15 minutes before</option>
          <option value="30 minutes before">30 minutes before</option>
          <option value="1 hour before">1 hour before</option>
        </select>
      </FormRow>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Purpose</label>
        <textarea rows={4} value={purpose} onChange={(e) => setPurpose(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={onClose}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Saving..." : "Schedule"}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Log Call Modal ─────────────────────────────────────────────────────────────

function LogCallModal({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  saving?: boolean;
}) {
  const { contacts, leads, accounts, deals } = useLookupData();

  const [callForType,     setCallForType]     = useState<"Contact" | "Lead">("Contact");
  const [callForId,       setCallForId]       = useState<number | null>(null);
  const [callForLabel,    setCallForLabel]     = useState("");
  const [relatedToType,   setRelatedToType]   = useState<"Account" | "Deal" | "None">("None");
  const [relatedToId,     setRelatedToId]     = useState<number | null>(null);
  const [relatedToLabel,  setRelatedToLabel]  = useState("");
  const [callType,        setCallType]        = useState<CallType>("Outbound");
  const [startDate,       setStartDate]       = useState(getTodayDate());
  const [startTime,       setStartTime]       = useState(getCurrentTime());
  const [subject,         setSubject]         = useState("");
  const [durationMinutes, setDurationMinutes] = useState("00");
  const [durationSeconds, setDurationSeconds] = useState("00");
  const [purpose,         setPurpose]         = useState("");
  const [voiceRecording,  setVoiceRecording]  = useState("");

  const callForOptions = callForType === "Contact" ? contacts : leads;
  const relatedOptions = relatedToType === "Account" ? accounts : relatedToType === "Deal" ? deals : [];

  const handleSubmit = () => {
    const callStartTime = `${startDate}T${startTime}:00`;
    onSubmit({
      subject: subject || `${callType} call with ${callForLabel || "Unknown"}`,
      call_type: callType,
      call_status: "Completed",
      call_start_time: callStartTime,
      duration_minutes: Number(durationMinutes) || 0,
      duration_seconds: Number(durationSeconds) || 0,
      related_to_type: relatedToType,
      purpose,
      voice_recording: voiceRecording,
      ...(callForType === "Contact" && callForId   ? { contact: callForId }   : {}),
      ...(callForType === "Lead"    && callForId   ? { lead: callForId }       : {}),
      ...(relatedToType === "Account" && relatedToId ? { account: relatedToId } : {}),
      ...(relatedToType === "Deal"    && relatedToId ? { deal: relatedToId }    : {}),
    });
  };

  return (
    <ModalShell title="Log a Call" onClose={onClose}>
      <FormRow label="Call For">
        <div className="flex gap-2">
          <select
            value={callForType}
            onChange={(e) => {
              setCallForType(e.target.value as "Contact" | "Lead");
              setCallForId(null); setCallForLabel("");
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value="Contact">Contact</option>
            <option value="Lead">Lead</option>
          </select>
          <SearchDropdown
            placeholder={`Search ${callForType}...`}
            options={callForOptions}
            selectedId={callForId}
            selectedLabel={callForLabel}
            onSelect={(id, label) => { setCallForId(id); setCallForLabel(label); }}
            onClear={() => { setCallForId(null); setCallForLabel(""); }}
          />
        </div>
      </FormRow>

      <FormRow label="Related To">
        <div className="flex gap-2">
          <select
            value={relatedToType}
            onChange={(e) => {
              setRelatedToType(e.target.value as "Account" | "Deal" | "None");
              setRelatedToId(null); setRelatedToLabel("");
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value="None">None</option>
            <option value="Account">Account</option>
            <option value="Deal">Deal</option>
          </select>
          {relatedToType !== "None" && (
            <SearchDropdown
              placeholder={`Search ${relatedToType}...`}
              options={relatedOptions}
              selectedId={relatedToId}
              selectedLabel={relatedToLabel}
              onSelect={(id, label) => { setRelatedToId(id); setRelatedToLabel(label); }}
              onClear={() => { setRelatedToId(null); setRelatedToLabel(""); }}
            />
          )}
        </div>
      </FormRow>

      <FormRow label="Call Type">
        <select value={callType} onChange={(e) => setCallType(e.target.value as CallType)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none">
          <option value="Outbound">Outbound</option>
          <option value="Inbound">Inbound</option>
        </select>
      </FormRow>

      <FormRow label="Call Start Time">
        <div className="flex gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none" />
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none" />
        </div>
      </FormRow>

      <FormRow label="Call Duration">
        <div className="flex items-center gap-2">
          <input type="number" min="0" value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none" />
          <span className="text-sm text-slate-600">min</span>
          <input type="number" min="0" value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
            className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none" />
          <span className="text-sm text-slate-600">sec</span>
        </div>
      </FormRow>

      <FormRow label="Subject">
        <input value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Call subject"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </FormRow>

      <FormRow label="Voice Recording">
        <input value={voiceRecording} onChange={(e) => setVoiceRecording(e.target.value)}
          placeholder="Recording URL or note"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </FormRow>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Purpose</label>
        <textarea rows={4} value={purpose} onChange={(e) => setPurpose(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={onClose}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Shared modal shell ─────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

// ── Call Detail Modal ──────────────────────────────────────────────────────────

function CallDetailModal({ call, onClose }: { call: CallRecord; onClose: () => void }) {
  const statusColor = call.status === "Completed"
    ? "bg-green-100 text-green-800"
    : "bg-blue-100 text-blue-800";
  const typeColor = call.callType === "Inbound"
    ? "bg-purple-100 text-purple-700"
    : "bg-orange-100 text-orange-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold text-slate-900">{call.subject}</h2>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>{call.status}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>{call.callType}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</p>
              <p className="text-sm text-slate-800">{formatDisplayDate(call.startDate)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Time</p>
              <p className="text-sm text-slate-800">{formatDisplayTime(call.startTime)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duration</p>
              <p className="text-sm text-slate-800">
                {String(call.durationMinutes).padStart(2, "0")}m {String(call.durationSeconds).padStart(2, "0")}s
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Owner</p>
              <p className="text-sm text-slate-800">{call.owner}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Call For</p>
              <p className="text-sm text-slate-800">{call.callFor}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Related To</p>
              <p className="text-sm text-slate-800">{call.relatedTo}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CallsPage() {
  const createMenuRef = useRef<HTMLDivElement>(null);

  const [calls,           setCalls]           = useState<CallRecord[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [,                setFilters]         = useState<FilterMap>({});
  const [showCreateMenu,  setShowCreateMenu]  = useState(false);
  const [showSchedule,    setShowSchedule]    = useState(false);
  const [showLog,         setShowLog]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [selectedCall,    setSelectedCall]    = useState<CallRecord | null>(null);

  const loadCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<ApiCall[] | Paginated<ApiCall>>("/calls/", { method: "GET" });
      setCalls(toList(data).map(toApiRecord));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load calls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCalls(); }, [loadCalls]);

  const handleSave = async (payload: Record<string, unknown>) => {
    try {
      setSaving(true);
      await apiRequest("/calls/", { method: "POST", body: JSON.stringify(payload) });
      setShowSchedule(false);
      setShowLog(false);
      void loadCalls();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Calls</h1>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
                filterOpen ? "bg-slate-100 shadow-sm" : "bg-white"
              }`}
            >
              <Filter size={16} />
              <span>Filters</span>
            </button>

            <div className="relative" ref={createMenuRef}>
              <div className="flex overflow-hidden rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => { setShowCreateMenu(false); setShowSchedule(true); }}
                  className="rounded-l-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create Call
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateMenu((prev) => !prev)}
                  className="rounded-r-md border-l border-blue-500 bg-blue-600 px-2 text-white hover:bg-blue-700"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {showCreateMenu && (
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg">
                  <button type="button"
                    onClick={() => { setShowCreateMenu(false); setShowSchedule(true); }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                    Schedule a call
                  </button>
                  <button type="button"
                    onClick={() => { setShowCreateMenu(false); setShowLog(true); }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                    Log a call
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex gap-4">
          {filterOpen && (
            <FilterSidebar
              title="Filter Calls by"
              sections={CALL_FILTER_SECTIONS}
              onApply={(f) => setFilters(f)}
              onClear={() => setFilters({})}
            />
          )}

          <div className="flex-1">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">Loading calls...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm text-rose-600">{error}</p>
              </div>
            ) : calls.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm font-medium text-slate-500">No calls found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Subject</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Call Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Call Start Time</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Duration</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Call For</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Related To</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => (
                      <tr key={call.id} className="cursor-pointer border-b transition hover:bg-slate-50" onClick={() => setSelectedCall(call)}>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600 underline-offset-2 hover:underline">{call.subject}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{call.callType}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDisplayDate(call.startDate)} {formatDisplayTime(call.startTime)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {String(call.durationMinutes).padStart(2, "0")}m {String(call.durationSeconds).padStart(2, "0")}s
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{call.callFor}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{call.relatedTo}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            call.status === "Completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {call.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSchedule && (
        <ScheduleCallModal
          onClose={() => setShowSchedule(false)}
          onSubmit={handleSave}
          saving={saving}
        />
      )}

      {showLog && (
        <LogCallModal
          onClose={() => setShowLog(false)}
          onSubmit={handleSave}
          saving={saving}
        />
      )}

      {selectedCall && (
        <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </DashboardLayout>
  );
}
