import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import { getCompanyDetails, getServicesSetupStatus, listDomainMappings, listTeamMembers, updateCompanyDetails } from "../api";
import type { CompanyDetails, DomainMapping, ServiceSettings, TeamMember } from "../types";

const inputClass = "h-[38px] w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500";
const textareaClass = "min-h-[96px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";

export default function CompanyDetailsPage() {
  const [form, setForm] = useState<CompanyDetails>({ id: "", companyName: "", companyEmail: "", contactPerson: "", phone: "", address: "" });
  const [settings, setSettings] = useState<ServiceSettings | null>(null);
  const [domains, setDomains] = useState<DomainMapping[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [companyDetails, setupStatus, domainMappings, members] = await Promise.all([
          getCompanyDetails(),
          getServicesSetupStatus(),
          listDomainMappings(),
          listTeamMembers(),
        ]);
        setForm(companyDetails);
        setSettings(setupStatus);
        setDomains(domainMappings);
        setTeamMembers(members);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load company details.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSavedMessage(null);
      setForm(await updateCompanyDetails(form));
      setSavedMessage("Company details updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update company details.");
    } finally {
      setSaving(false);
    }
  };

  const verifiedDomain = domains.find((item) => item.verificationStatus === "verified");
  const pendingDomain = domains.find((item) => item.verificationStatus === "pending");
  const accessUrl = form.publicBookingBaseUrl || (verifiedDomain?.domain ? `https://${verifiedDomain.domain}` : window.location.origin);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Company Details</h1>
            <p className="text-sm text-slate-500">Manage core company information used across Services settings.</p>
          </div>
          <button type="button" disabled={saving || loading} onClick={() => void handleSave()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">{saving ? "Saving..." : "Save"}</button>
        </div>
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error}</div> : null}
        {savedMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{savedMessage}</div> : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <CRMSectionCard title="Basic Information">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Company Name</label><input className={inputClass} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Company Email</label><input className={inputClass} value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Contact Person</label><input className={inputClass} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label><textarea className={textareaClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
          </CRMSectionCard>
          <CRMSectionCard title="Access and Locale">
            <div className="space-y-4 text-sm text-slate-600">
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Access URL</p><p className="mt-1 break-all text-slate-800">{accessUrl}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Mapped Domain Status</p><p className="mt-1 break-all text-slate-800">{verifiedDomain ? `Verified: ${verifiedDomain.domain}` : pendingDomain ? `Pending: ${pendingDomain.domain}` : "No mapped domain yet"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Timezone</p><p className="mt-1 text-slate-800">{settings?.defaultTimezone || "Not configured"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Service Contact</p><p className="mt-1 break-all text-slate-800">{form.serviceContactName || form.contactPerson || "-"} {form.serviceContactEmail ? `(${form.serviceContactEmail})` : ""}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Services Enabled</p><p className="mt-1 text-slate-800">{settings?.isServicesEnabled ? "Enabled" : "Not enabled"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Service Team</p><p className="mt-1 text-slate-800">{teamMembers.length} active team member{teamMembers.length === 1 ? "" : "s"}</p></div>
            </div>
          </CRMSectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
