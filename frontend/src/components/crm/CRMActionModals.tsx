import { Paperclip } from "lucide-react";
import { useState } from "react";
import CRMModalBase from "./CRMModalBase";

type BaseModalProps = {
  open: boolean;
  onClose: () => void;
};

// ─── Send Email ───────────────────────────────────────────────────────────────
export function SendEmailModal({
  open,
  onClose,
  toEmail = "",
  recordName = "",
}: BaseModalProps & { toEmail?: string; recordName?: string }) {
  const [from, setFrom] = useState("sales@crms2.com");
  const [to, setTo] = useState(toEmail);
  const [subject, setSubject] = useState(recordName ? `Re: ${recordName}` : "");
  const [body, setBody] = useState("");

  const handleSend = async () => {
    if (!to.trim()) { alert("Please enter a recipient email."); return; }
    if (!subject.trim()) { alert("Please enter a subject."); return; }
    try {
      const { sendEmail } = await import("../../lib/api/leadsApi");
      await sendEmail({
        to,
        subject,
        body,
        from_email: from,
      });
      alert("Email sent successfully.");
      onClose();
    } catch (err: any) {
      alert("Failed to send email: " + (err?.message || err));
    }
  };

  return (
    <CRMModalBase
      open={open}
      title="Email Composer"
      maxWidthClassName="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg border border-blue-600 px-3 py-2 text-sm text-blue-700">Schedule</button>
          <button onClick={handleSend} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Send</button>
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
          <button className="rounded border border-slate-200 px-2 py-1">List</button>
          <button className="rounded border border-slate-200 px-2 py-1">Link</button>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} className="w-full resize-none rounded-b-lg px-3 py-2 text-sm outline-none" />
      </div>
      <button className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"><Paperclip size={14} />Attach Files</button>
    </CRMModalBase>
  );
}

// ─── Add Tags ─────────────────────────────────────────────────────────────────
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
      title={recordName ? `Add Tags — ${recordName}` : "Add Tags"}
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!value.trim()) { alert("Please enter or select a tag."); return; }
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

// ─── Note ─────────────────────────────────────────────────────────────────────
export function NoteModal({ open, onClose }: BaseModalProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  return (
    <CRMModalBase
      open={open}
      title="Notes"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!note.trim()) { alert("Please enter a note."); return; }
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Save
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" rows={5} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
    </CRMModalBase>
  );
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export function TaskModal({
  open,
  onClose,
  recordName = "",
}: BaseModalProps & { recordName?: string }) {
  const [subject, setSubject] = useState(recordName ? `Follow up with ${recordName}` : "");

  return (
    <CRMModalBase
      open={open}
      title="Create Task"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!subject.trim()) { alert("Please enter a subject."); return; }
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Save
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
        <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Priority</option>
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
        <input placeholder="Owner" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Reminder</option>
          <option>None</option><option>5 minutes before</option><option>15 minutes before</option><option>30 minutes before</option><option>1 hour before</option>
        </select>
      </div>
    </CRMModalBase>
  );
}

// ─── Meeting ──────────────────────────────────────────────────────────────────
export function MeetingModal({
  open,
  onClose,
  recordName = "",
}: BaseModalProps & { recordName?: string }) {
  const [title, setTitle] = useState(recordName ? `Meeting with ${recordName}` : "");

  return (
    <CRMModalBase
      open={open}
      title="Create Meeting"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!title.trim()) { alert("Please enter a meeting title."); return; }
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Save
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
        <input placeholder="Meeting Venue" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Location" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" />All Day</label>
        <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Host" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Participants" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <textarea rows={3} placeholder="Add more details" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </CRMModalBase>
  );
}

// ─── Schedule Call ────────────────────────────────────────────────────────────
export function ScheduleCallModal({
  open,
  onClose,
  recordName = "",
}: BaseModalProps & { recordName?: string }) {
  const [subject, setSubject] = useState(recordName ? `Call with ${recordName}` : "");

  return (
    <CRMModalBase
      open={open}
      title="Schedule a Call"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!subject.trim()) { alert("Please enter a subject."); return; }
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Schedule
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
        <input defaultValue={recordName} placeholder="Call For" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Related To" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Call Type</option><option>Inbound</option><option>Outbound</option>
        </select>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Call Status</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option>
        </select>
        <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Owner" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Reminder</option><option>None</option><option>5 min before</option><option>15 min before</option>
        </select>
        <input placeholder="Call Purpose" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <textarea rows={3} placeholder="Call Agenda" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </CRMModalBase>
  );
}

// ─── Log Call ─────────────────────────────────────────────────────────────────
export function LogCallModal({
  open,
  onClose,
  recordName = "",
}: BaseModalProps & { recordName?: string }) {
  const [subject, setSubject] = useState(recordName ? `Call with ${recordName}` : "");

  return (
    <CRMModalBase
      open={open}
      title="Log a Call"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!subject.trim()) { alert("Please enter a subject."); return; }
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Save
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
        <input defaultValue={recordName} placeholder="Call For" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Related To" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Call Type</option><option>Inbound</option><option>Outbound</option>
        </select>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Call Status</option><option>Completed</option><option>Not Connected</option>
        </select>
        <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Duration (minutes)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Purpose" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Result" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <textarea rows={3} placeholder="Description" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </CRMModalBase>
  );
}

// ─── Delete ───────────────────────────────────────────────────────────────────
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

// ─── Convert Lead ─────────────────────────────────────────────────────────────
export function ConvertLeadModal({
  open,
  onClose,
  leadName = "",
}: BaseModalProps & { leadName?: string }) {
  const [createDeal, setCreateDeal] = useState(true);
  const [owner, setOwner] = useState("");

  return (
    <CRMModalBase
      open={open}
      title={leadName ? `Convert Lead — ${leadName}` : "Convert Lead"}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Convert</button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><input type="checkbox" defaultChecked readOnly />Create New Account</label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><input type="checkbox" defaultChecked readOnly />Create New Contact</label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
          <input type="checkbox" checked={createDeal} onChange={(e) => setCreateDeal(e.target.checked)} />
          Create a new Deal for this Account
        </label>
      </div>
      <label className="mt-4 grid gap-1 text-sm">
        <span>Owner of the New Records</span>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Enter owner name" className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
    </CRMModalBase>
  );
}
