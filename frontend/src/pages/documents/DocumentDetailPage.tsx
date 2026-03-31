import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Upload,
  X,
} from "lucide-react";
import {
  deleteDocument,
  getDocumentById,
  updateDocument,
  DOCUMENT_TYPE_LABELS,
  MODULE_LABELS,
  type DocumentRecord,
  type DocumentType,
  type RelatedModule,
} from "../../lib/api/documentsApi";

const TYPE_COLORS: Record<string, string> = {
  portfolio: "bg-purple-100 text-purple-700",
  requirement: "bg-blue-100 text-blue-700",
  presentation: "bg-amber-100 text-amber-700",
  meeting_notes: "bg-teal-100 text-teal-700",
  contract: "bg-rose-100 text-rose-700",
  other: "bg-slate-100 text-slate-600",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid items-start gap-1 text-sm sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <span className="pt-0.5 text-slate-500">{label}</span>
      <span className="min-w-0 break-words font-medium leading-6 text-slate-800">{value || "—"}</span>
    </div>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState<DocumentType>("other");
  const [editModule, setEditModule] = useState<RelatedModule>("");
  const [editRelatedId, setEditRelatedId] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        setLoading(true);
        const data = await getDocumentById(id);
        setDoc(data);
        // populate edit form
        setEditTitle(data.title);
        setEditDesc(data.description ?? "");
        setEditType(data.document_type);
        setEditModule(data.related_module ?? "");
        setEditRelatedId(data.related_id != null ? String(data.related_id) : "");
      } catch {
        setError("Failed to load document.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async () => {
    if (!id || !editTitle.trim()) { setError("Title is required."); return; }
    try {
      setSaving(true);
      setError("");
      const updated = await updateDocument(id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        document_type: editType,
        related_module: editModule || undefined,
        related_id: editRelatedId ? Number(editRelatedId) : undefined,
        file: newFile ?? undefined,
      });
      setDoc(updated);
      setNewFile(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("Delete this document permanently?")) return;
    await deleteDocument(id);
    navigate("/documents");
  };

  const handleDownload = async () => {
    if (!doc?.file_url) return;
    try {
      const response = await fetch(doc.file_url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Download failed.");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = doc.file_name || doc.title || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const inputCls =
    "w-full rounded-[8px] border border-[#cfd7e6] px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4d76ff] focus:ring-2 focus:ring-[#4d76ff]/10";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (error && !doc) {
    return <div className="p-6 text-red-600 text-sm">{error}</div>;
  }

  if (!doc) return null;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f7fb]">
      {/* Header */}
      <div className="border-b border-[#d9e1ef] bg-[#f7f9fc] px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/documents")}
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1f2d3d]">{doc.title}</h1>
              <p className="text-xs text-slate-500">Document Detail</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doc.file_url && (
              <a
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-[6px] border border-[#cfd7e6] bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink size={14} /> Open File
              </a>
            )}
            {doc.file_url && (
              <button
                type="button"
                onClick={() => void handleDownload()}
                className="flex items-center gap-1.5 rounded-[6px] border border-[#cfd7e6] bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Download size={14} /> Download
              </button>
            )}
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-[6px] border border-[#cfd7e6] bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Edit2 size={14} /> Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-[6px] border border-[#cfd7e6] bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-[6px] bg-gradient-to-b from-[#4d76ff] to-[#365eea] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save
                </button>
              </>
            )}
            <button
              onClick={() => void handleDelete()}
              className="rounded-[6px] border border-red-200 bg-white px-4 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="rounded-[10px] border border-[#d9e1ef] bg-white p-5">
            <h2 className="mb-4 text-[13px] font-semibold text-[#1f2d3d]">
              {editing ? "Edit Document" : "Document Info"}
            </h2>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Title *</label>
                  <input className={inputCls} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                  <textarea className={inputCls} rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Document Type</label>
                  <select className={inputCls} value={editType} onChange={(e) => setEditType(e.target.value as DocumentType)}>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Linked Module</label>
                  <select className={inputCls} value={editModule} onChange={(e) => setEditModule(e.target.value as RelatedModule)}>
                    <option value="">None</option>
                    {(["lead", "contact", "deal", "project"] as RelatedModule[]).map((m) => (
                      <option key={m} value={m}>{MODULE_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                {editModule && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">{MODULE_LABELS[editModule]} ID</label>
                    <input className={inputCls} type="number" value={editRelatedId} onChange={(e) => setEditRelatedId(e.target.value)} />
                  </div>
                )}
                {/* Replace file */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Replace File (optional)</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-[#cfd7e6] px-3 py-2.5 text-sm text-slate-500 hover:border-[#4d76ff] hover:text-[#4d76ff]"
                  >
                    <Upload size={14} />
                    {newFile ? newFile.name : "Click to select new file…"}
                    <input ref={fileRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setNewFile(e.target.files[0]); }} />
                  </div>
                  {newFile && (
                    <button onClick={() => setNewFile(null)} className="mt-1 flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                      <X size={11} /> Remove selected file
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label="Title" value={doc.title} />
                <InfoRow label="Description" value={doc.description} />
                <div className="grid items-start gap-1 text-sm sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
                  <span className="pt-0.5 text-slate-500">Type</span>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[doc.document_type] ?? TYPE_COLORS.other}`}>
                    {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                  </span>
                </div>
                <InfoRow
                  label="Linked To"
                  value={doc.related_module ? `${MODULE_LABELS[doc.related_module]} #${doc.related_id ?? "—"}` : undefined}
                />
                <InfoRow label="Uploaded By" value={doc.uploaded_by_email} />
                <InfoRow label="File" value={doc.file_name} />
                <InfoRow label="Version" value={`v${doc.version}`} />
                <InfoRow label="Created" value={new Date(doc.created_at).toLocaleString()} />
                <InfoRow label="Updated" value={new Date(doc.updated_at).toLocaleString()} />
              </div>
            )}
          </div>

        <div className="rounded-[10px] border border-[#d9e1ef] bg-white p-5">
          <h2 className="mb-4 text-[13px] font-semibold text-[#1f2d3d]">Open Document</h2>
          {doc.file_url ? (
            <div className="rounded-[10px] border border-dashed border-[#cfd7e6] bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-[10px] bg-white p-3 text-slate-500 shadow-sm">
                  <FileText size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1f2d3d]">{doc.file_name || doc.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Open the document in a new tab or download it to your device.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#4d76ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#365eea]"
                    >
                      <ExternalLink size={14} /> Open Document
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleDownload()}
                      className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#cfd7e6] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No file attached.</p>
          )}
        </div>

        {doc.versions && doc.versions.length > 0 && (
          <div className="rounded-[10px] border border-[#d9e1ef] bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[#1f2d3d]">
              <Clock size={14} /> Version History
            </h2>
            <div className="space-y-2">
              {doc.versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-[8px] border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-700">v{v.version_number}</span>
                    <span className="ml-3 text-xs text-slate-400">
                      {v.file_name ?? "file"} · {new Date(v.uploaded_at).toLocaleString()}
                    </span>
                  </div>
                  {v.file_url && (
                    <a
                      href={v.file_url}
                      download={v.file_name ?? undefined}
                      className="flex items-center gap-1 text-xs font-medium text-[#4d76ff] hover:underline"
                    >
                      <Download size={12} /> Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
