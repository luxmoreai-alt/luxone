import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import { getFiscalYearSettings, listAppointments, listJobSheets, updateFiscalYearSettings } from "../api";
import type { FiscalYearSettings } from "../types";

const inputClass = "h-[38px] w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500";
const customFiscalYearStorageKey = "services.customFiscalYearRange";

export default function FiscalYearPage() {
  const [form, setForm] = useState<FiscalYearSettings>({ id: "", fiscalYearType: "standard", startsInMonth: 1, customStartDate: "", customEndDate: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState({ appointmentsInPeriod: 0, completedAppointments: 0, jobSheetsInPeriod: 0 });

  const handleFiscalYearTypeChange = (fiscalYearType: FiscalYearSettings["fiscalYearType"]) => {
    setForm((current) => ({ ...current, fiscalYearType, startsInMonth: 1 }));
    setError(null);
    setSavedMessage(null);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [settings, appointments, jobSheets] = await Promise.all([
          getFiscalYearSettings(),
          listAppointments(),
          listJobSheets(),
        ]);
        const storedRange = localStorage.getItem(customFiscalYearStorageKey);
        const customRange = storedRange ? JSON.parse(storedRange) as { startDate?: string; endDate?: string } : {};
        setForm({
          ...settings,
          startsInMonth: settings.fiscalYearType === "standard" ? 1 : settings.startsInMonth,
          customStartDate: customRange.startDate || settings.currentPeriodStart || "",
          customEndDate: customRange.endDate || settings.currentPeriodEnd || "",
        });
        const inRange = (value?: string) => {
          const startDate = settings.fiscalYearType === "custom" ? customRange.startDate || settings.currentPeriodStart : settings.currentPeriodStart;
          const endDate = settings.fiscalYearType === "custom" ? customRange.endDate || settings.currentPeriodEnd : settings.currentPeriodEnd;
          if (!value || !startDate || !endDate) return false;
          return value >= startDate && value <= endDate;
        };
        const appointmentsInPeriod = appointments.filter((item) => inRange(item.appointmentDate));
        setUsageSummary({
          appointmentsInPeriod: appointmentsInPeriod.length,
          completedAppointments: appointmentsInPeriod.filter((item) => item.status.toLowerCase() === "completed").length,
          jobSheetsInPeriod: jobSheets.filter((item) => inRange(item.createdAt.slice(0, 10))).length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load fiscal year settings.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    const valuesToSave = form.fiscalYearType === "standard"
      ? { ...form, startsInMonth: 1 }
      : { ...form, startsInMonth: form.customStartDate ? Number(form.customStartDate.slice(5, 7)) : form.startsInMonth };
    if (valuesToSave.fiscalYearType === "custom" && (!valuesToSave.customStartDate || !valuesToSave.customEndDate)) {
      setError("Select both a custom fiscal year start date and end date.");
      return;
    }
    if (valuesToSave.fiscalYearType === "custom" && valuesToSave.customStartDate! >= valuesToSave.customEndDate!) {
      setError("Custom fiscal year end date must be after the start date.");
      return;
    }
    if (valuesToSave.startsInMonth < 1 || valuesToSave.startsInMonth > 12) {
      setError("Fiscal year month must be between 1 and 12.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSavedMessage(null);
      const updatedSettings = await updateFiscalYearSettings(valuesToSave);
      if (valuesToSave.fiscalYearType === "custom") {
        localStorage.setItem(customFiscalYearStorageKey, JSON.stringify({ startDate: valuesToSave.customStartDate, endDate: valuesToSave.customEndDate }));
      }
      setForm({ ...updatedSettings, customStartDate: valuesToSave.customStartDate, customEndDate: valuesToSave.customEndDate });
      setSavedMessage("Fiscal year settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update fiscal year settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Fiscal Year</h1>
            <p className="text-sm text-slate-500">Configure the fiscal-year mode and starting month for Services settings.</p>
          </div>
          <button type="button" disabled={saving || loading} onClick={() => void handleSave()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">{saving ? "Saving..." : "Save"}</button>
        </div>
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error}</div> : null}
        {savedMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{savedMessage}</div> : null}
        <CRMSectionCard title="Fiscal Year Settings">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <input type="radio" checked={form.fiscalYearType === "standard"} onChange={() => handleFiscalYearTypeChange("standard")} />
                Standard Fiscal Year
              </div>
            </label>
            <label className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <input type="radio" checked={form.fiscalYearType === "custom"} onChange={() => handleFiscalYearTypeChange("custom")} />
                Custom Fiscal Year
              </div>
            </label>
            {form.fiscalYearType === "custom" ? (
              <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                <label htmlFor="custom-fiscal-year-start" className="text-sm font-medium text-slate-700">
                  Start date
                  <input id="custom-fiscal-year-start" type="date" className={`${inputClass} mt-1.5`} value={form.customStartDate || ""} onChange={(e) => setForm((current) => ({ ...current, customStartDate: e.target.value }))} />
                </label>
                <label htmlFor="custom-fiscal-year-end" className="text-sm font-medium text-slate-700">
                  End date
                  <input id="custom-fiscal-year-end" type="date" className={`${inputClass} mt-1.5`} value={form.customEndDate || ""} min={form.customStartDate || undefined} onChange={(e) => setForm((current) => ({ ...current, customEndDate: e.target.value }))} />
                </label>
              </div>
            ) : (
              <div className="md:col-span-2 text-sm text-slate-600">Fiscal year starts in January.</div>
            )}
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Current Fiscal Year</p><p className="mt-1 text-sm text-slate-800">{form.fiscalYearLabel || "-"}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Current Period</p><p className="mt-1 text-sm text-slate-800">{form.fiscalYearType === "custom" && form.customStartDate && form.customEndDate ? `${form.customStartDate} to ${form.customEndDate}` : form.currentPeriodStart && form.currentPeriodEnd ? `${form.currentPeriodStart} to ${form.currentPeriodEnd}` : "-"}</p></div>
          </div>
        </CRMSectionCard>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Appointments In Period</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{usageSummary.appointmentsInPeriod}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Completed Appointments</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{usageSummary.completedAppointments}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Job Sheets In Period</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{usageSummary.jobSheetsInPeriod}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
