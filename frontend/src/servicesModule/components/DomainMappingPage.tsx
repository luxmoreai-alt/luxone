import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import { listDomainMappings } from "../api";
import type { DomainMapping } from "../types";
import DomainMappingModal from "./DomainMappingModal";

export default function DomainMappingPage() {
  const [rows, setRows] = useState<DomainMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await listDomainMappings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load domain mappings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Domain Mapping</h1>
            <p className="text-sm text-slate-500">Map custom domains for CRM, Sandbox, and Portal-facing service experiences.</p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">Map Domain</button>
        </div>
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error}</div> : null}
        {loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading domain mappings...</div> : null}
        {!loading && !rows.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">No mapped domains yet</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">Start the three-step mapping flow to connect a custom domain and verify it.</p>
          </div>
        ) : null}
        {!loading && rows.length ? (
          <div className="grid gap-4">
            {rows.map((row) => (
              <CRMSectionCard key={row.id} title={row.domain}>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Account</p><p className="mt-1 text-sm text-slate-800">{row.accountType.toUpperCase()}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">CNAME Target</p><p className="mt-1 text-sm text-slate-800">{row.cnameTarget}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Verification</p><p className="mt-1 text-sm text-slate-800">{row.verificationStatus}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Portal URL</p><p className="mt-1 text-sm text-slate-800">{row.publicBookingBaseUrl || "-"}</p></div>
                </div>
              </CRMSectionCard>
            ))}
          </div>
        ) : null}
      </div>
      <DomainMappingModal open={open} onClose={() => setOpen(false)} onSaved={() => void load()} />
    </DashboardLayout>
  );
}
