import { Paperclip } from "lucide-react";
import { useState } from "react";
import CRMModalBase from "./CRMModalBase";

type BaseModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SendEmailModal({ open, onClose }: BaseModalProps) {
  const [from, setFrom] = useState("sales@crms2.com");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <CRMModalBase
      open={open}
      title="Email Composer"
      maxWidthClassName="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg border border-blue-600 px-3 py-2 text-sm text-blue-700">Schedule</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Send</button>
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
          <button className="rounded border border-slate-200 px-2 py-1">B</button>
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

export function AddTagsModal({ open, onClose }: BaseModalProps) {
  const [value, setValue] = useState("");
  const tags = ["Hot Lead", "Follow-Up", "Priority", "Enterprise", "Decision Maker"];

  return (
    <CRMModalBase
      open={open}
      title="Add Tags"
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Add</button>
        </>
      }
    >
      <label className="grid gap-1 text-sm"><span>Tag</span><input value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button key={tag} type="button" onClick={() => setValue(tag)} className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700">{tag}</button>
        ))}
      </div>
    </CRMModalBase>
  );
}

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
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Save</button>
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

export function TaskModal({ open, onClose }: BaseModalProps) {
  return (
    <CRMModalBase
      open={open}
      title="Create Task"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Save</button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Subject" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option>High</option><option>Medium</option><option>Low</option></select>
        <input placeholder="Owner" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option>None</option><option>5 minutes before</option><option>10 minutes before</option><option>15 minutes before</option><option>30 minutes before</option><option>1 hour before</option></select>
        <input placeholder="Repeat" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <button className="mt-3 text-sm font-medium text-blue-700">More Fields</button>
    </CRMModalBase>
  );
}

export function MeetingModal({ open, onClose }: BaseModalProps) {
  return (
    <CRMModalBase
      open={open}
      title="Create Meeting"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Save</button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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

export function ScheduleCallModal({ open, onClose }: BaseModalProps) {
  return (
    <CRMModalBase
      open={open}
      title="Schedule a Call"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Schedule</button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Call For" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Related To" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Outgoing Call Status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Owner" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Subject" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Reminder" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Purpose" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <textarea rows={3} placeholder="Call Agenda" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </CRMModalBase>
  );
}

export function LogCallModal({ open, onClose }: BaseModalProps) {
  return (
    <CRMModalBase
      open={open}
      title="Log a Call"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Save</button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Call For" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Related To" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Outgoing Call Status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Duration" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Subject" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Purpose" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Call Result" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <textarea rows={3} placeholder="Call Agenda" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <textarea rows={3} placeholder="Description" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </CRMModalBase>
  );
}

export function ConvertLeadModal({ open, onClose }: BaseModalProps) {
  const [createDeal, setCreateDeal] = useState(true);
  const [owner, setOwner] = useState("Current User");

  return (
    <CRMModalBase
      open={open}
      title="Convert Lead"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Convert</button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><input type="checkbox" checked readOnly />Create New Account</label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><input type="checkbox" checked readOnly />Create New Contact</label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2"><input type="checkbox" checked={createDeal} onChange={(e) => setCreateDeal(e.target.checked)} />Create a new Deal for this Account</label>
      </div>
      <label className="mt-4 grid gap-1 text-sm"><span>Owner of the New Records</span><input value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
    </CRMModalBase>
  );
}
