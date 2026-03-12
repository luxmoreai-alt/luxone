import { Paperclip } from "lucide-react";
import { useEffect, useState } from "react";
import CRMModalBase from "./CRMModalBase";

type BaseModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SendEmailModal({
  open,
  onClose,
  toEmail = "",
  recordName = "",
  onSend,
}: BaseModalProps & {
  toEmail?: string;
  recordName?: string;
  onSend?: (payload: { to: string; subject: string; body: string; from_email?: string }) => Promise<void>;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(toEmail);
  const [subject, setSubject] = useState(recordName ? `Re: ${recordName}` : "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTo(toEmail);
    setSubject(recordName ? `Re: ${recordName}` : "");
    setBody("");
    setError(null);
  }, [open, toEmail, recordName]);

  const handleSend = async () => {
    if (!to.trim()) {
      setError("Please enter a recipient email.");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }

    try {
      setSending(true);
      setError(null);

      if (onSend) {
        await onSend({ to: to.trim(), subject: subject.trim(), body: body.trim(), from_email: from.trim() || undefined });
      } else {
        const { sendEmail } = await import("../../lib/api/leadsApi");
        await sendEmail({ to: to.trim(), subject: subject.trim(), body: body.trim(), from_email: from.trim() || undefined });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <CRMModalBase
      open={open}
      title="Email Composer"
      maxWidthClassName="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} disabled={sending} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button onClick={() => void handleSend()} disabled={sending} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">
            {sending ? "Sending..." : "Send"}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm"><span>From</span><input value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="grid gap-1 text-sm"><span>To</span><input value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
      </div>
      <label className="mt-3 grid gap-1 text-sm"><span>Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
      <div className="mt-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
          <button className="rounded border border-slate-200 px-2 py-1 font-bold">B</button>
          <button className="rounded border border-slate-200 px-2 py-1 italic">I</button>
          <button className="rounded border border-slate-200 px-2 py-1 underline">U</button>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} className="w-full resize-none rounded-b-lg px-3 py-2 text-sm outline-none" />
      </div>
      <button className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"><Paperclip size={14} />Attach Files</button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </CRMModalBase>
  );
}

export function AddTagsModal({
  open,
  onClose,
  recordName = "",
}: BaseModalProps & { recordName?: string }) {
  const [value, setValue] = useState("");
  const tags = ["Hot Lead", "Follow-Up", "Priority", "Enterprise", "Decision Maker"];

  return (
    <CRMModalBase
      open={open}
      title={recordName ? `Add Tags - ${recordName}` : "Add Tags"}
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!value.trim()) return;
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Add
          </button>
        </>
      }
    >
      <label className="grid gap-1 text-sm">
        <span>Tag</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Type a tag or select below" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button key={tag} type="button" onClick={() => setValue(tag)} className={`rounded-full border px-3 py-1 text-xs transition ${value === tag ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>{tag}</button>
        ))}
      </div>
    </CRMModalBase>
  );
}

export function NoteModal({
  open,
  onClose,
  recordName = "",
  onSave,
}: BaseModalProps & { recordName?: string; onSave?: (note: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!note.trim()) {
      setError("Please enter a note.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave?.(note.trim());
      setTitle("");
      setNote("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRMModalBase
      open={open}
      title={recordName ? `Notes - ${recordName}` : "Notes"}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" rows={5} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </CRMModalBase>
  );
}

export function TaskModal({
  open,
  onClose,
  recordName = "",
  onSave,
}: BaseModalProps & {
  recordName?: string;
  onSave?: (payload: { subject: string; description?: string }) => Promise<void>;
}) {
  const [subject, setSubject] = useState(recordName ? `Follow up with ${recordName}` : "");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave?.({ subject: subject.trim(), description: description.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRMModalBase
      open={open}
      title="Create Task"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button onClick={() => void handleSave()} disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </CRMModalBase>
  );
}

export function MeetingModal({
  open,
  onClose,
  recordName = "",
  onSave,
}: BaseModalProps & {
  recordName?: string;
  onSave?: (payload: { meeting_subject: string; agenda?: string }) => Promise<void>;
}) {
  const [meetingSubject, setMeetingSubject] = useState(recordName ? `Meeting with ${recordName}` : "");
  const [agenda, setAgenda] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!meetingSubject.trim()) {
      setError("Please enter a meeting title.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave?.({ meeting_subject: meetingSubject.trim(), agenda: agenda.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule meeting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRMModalBase
      open={open}
      title="Create Meeting"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button onClick={() => void handleSave()} disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <input placeholder="Meeting Subject" value={meetingSubject} onChange={(e) => setMeetingSubject(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea rows={3} placeholder="Agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </CRMModalBase>
  );
}

export function ScheduleCallModal({
  open,
  onClose,
  recordName = "",
  onSave,
}: BaseModalProps & {
  recordName?: string;
  onSave?: (payload: { call_summary: string; call_outcome?: string }) => Promise<void>;
}) {
  const [summary, setSummary] = useState(recordName ? `Call with ${recordName}` : "");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!summary.trim()) {
      setError("Please enter call summary.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave?.({ call_summary: summary.trim(), call_outcome: outcome.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule call.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRMModalBase
      open={open}
      title="Schedule a Call"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button onClick={() => void handleSave()} disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Scheduling..." : "Schedule"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <input placeholder="Call Subject" value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea rows={3} placeholder="Call Purpose / Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </CRMModalBase>
  );
}

export function LogCallModal({
  open,
  onClose,
  recordName = "",
  onSave,
}: BaseModalProps & {
  recordName?: string;
  onSave?: (payload: { call_summary: string; call_outcome?: string }) => Promise<void>;
}) {
  const [summary, setSummary] = useState(recordName ? `Call with ${recordName}` : "");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!summary.trim()) {
      setError("Please enter call summary.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave?.({ call_summary: summary.trim(), call_outcome: outcome.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log call.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRMModalBase
      open={open}
      title="Log a Call"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button onClick={() => void handleSave()} disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <input placeholder="Call Subject" value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea rows={3} placeholder="Call Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </CRMModalBase>
  );
}

export function DeleteModal({
  open,
  onClose,
  onConfirm,
  recordName = "this record",
}: BaseModalProps & { onConfirm: () => Promise<void>; recordName?: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <CRMModalBase
      open={open}
      title="Delete Record"
      maxWidthClassName="max-w-sm"
      footer={
        <>
          <button onClick={onClose} disabled={deleting} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700">
        Are you sure you want to delete <span className="font-semibold">{recordName}</span>? This action cannot be undone.
      </p>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </CRMModalBase>
  );
}

export function ConvertLeadModal({
  open,
  onClose,
  leadName = "",
  onConvert,
}: BaseModalProps & {
  leadName?: string;
  onConvert?: (payload: { create_deal: boolean; deal_name?: string }) => Promise<void>;
}) {
  const [createDeal, setCreateDeal] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    try {
      setSaving(true);
      setError(null);
      await onConvert?.({
        create_deal: createDeal,
        deal_name: createDeal ? `${leadName || "Lead"} Deal` : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRMModalBase
      open={open}
      title={leadName ? `Convert Lead - ${leadName}` : "Convert Lead"}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button onClick={() => void handleConvert()} disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Converting..." : "Convert"}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><input type="checkbox" checked readOnly />Create New Account</label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><input type="checkbox" checked readOnly />Create New Contact</label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
          <input type="checkbox" checked={createDeal} onChange={(e) => setCreateDeal(e.target.checked)} />
          Create a new Deal for this Account
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </CRMModalBase>
  );
}
