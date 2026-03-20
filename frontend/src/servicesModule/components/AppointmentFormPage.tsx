import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  appointmentCoverageStatusOptions,
  appointmentCoverageTypeOptions,
  appointmentEntityTypeOptions,
  appointmentStatusOptions,
} from "../config";
import {
  createAppointment,
  getAppointment,
  getService,
  listHolidays,
  listServices,
  listTeamMembers,
  updateAppointment,
} from "../api";
import type { AppointmentFormData, Holiday, LookupOption, ServiceRecord, TeamMember } from "../types";
import ServicesLookupModal from "./ServicesLookupModal";

const inputClass = "h-[38px] w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500";
const textareaClass = "min-h-[110px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";

const emptyForm: AppointmentFormData = {
  serviceId: "",
  appointmentForType: "contact",
  appointmentForId: "",
  appointmentForLabel: "",
  appointmentDate: "",
  appointmentStartTime: "",
  appointmentEndTime: "",
  assignedMemberId: "",
  productId: "",
  salesOrderId: "",
  invoiceId: "",
  customerAssetName: "",
  productSerialNumber: "",
  coverageType: "none",
  coverageStatus: "not_applicable",
  location: "",
  status: "scheduled",
  notes: "",
  completionNotes: "",
  completionProofUrl: "",
};

export default function AppointmentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<AppointmentFormData>({
    ...emptyForm,
    serviceId: searchParams.get("service") || "",
  });
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [appointmentNumber, setAppointmentNumber] = useState("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupMode, setLookupMode] = useState<"appointment" | "product" | "sales-order" | "invoice">("appointment");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [serviceRows, holidayRows] = await Promise.all([listServices(), listHolidays()]);
        setServices(serviceRows);
        setHolidays(holidayRows);
        if (id) {
          const detail = await getAppointment(id);
          const serviceDetail = await getService(detail.serviceId);
          const memberRows = await listTeamMembers("", { serviceId: detail.serviceId });
          setSelectedService(serviceDetail);
          setMembers(memberRows);
          setAppointmentNumber(detail.appointmentNumber);
          setForm({
            serviceId: detail.serviceId,
            appointmentForType: detail.appointmentForType,
            appointmentForId: detail.appointmentForId,
            appointmentForLabel: detail.appointmentForDisplay,
            appointmentDate: detail.appointmentDate,
            appointmentStartTime: detail.appointmentStartTime,
            appointmentEndTime: detail.appointmentEndTime,
            assignedMemberId: detail.assignedMemberId,
            productId: detail.productId,
            salesOrderId: detail.salesOrderId,
            invoiceId: detail.invoiceId,
            customerAssetName: detail.customerAssetName,
            productSerialNumber: detail.productSerialNumber,
            coverageType: detail.coverageType || "none",
            coverageStatus: detail.coverageStatus || "not_applicable",
            location: detail.location,
            status: detail.status,
            notes: detail.notes,
            completionNotes: detail.completionNotes,
            completionProofUrl: detail.completionProofUrl,
          });
        } else if (searchParams.get("service")) {
          const serviceDetail = await getService(searchParams.get("service") as string);
          const memberRows = await listTeamMembers("", { serviceId: serviceDetail.id });
          setSelectedService(serviceDetail);
          setMembers(memberRows);
          setForm((prev) => ({
            ...prev,
            serviceId: serviceDetail.id,
            location: prev.location || serviceDetail.location || "",
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load appointment form.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, searchParams]);

  useEffect(() => {
    const loadSelectedService = async () => {
      if (!form.serviceId) {
        setSelectedService(null);
        return;
      }
      try {
        const detail = await getService(form.serviceId);
        const serviceMembers = await listTeamMembers("", { serviceId: detail.id });
        setSelectedService(detail);
        setMembers(serviceMembers);
        const allowedMemberIds = new Set((detail.members || []).map((member) => member.memberId));
        const teamMemberIds = new Set(serviceMembers.map((member) => member.id));
        if (form.assignedMemberId && !teamMemberIds.has(form.assignedMemberId)) {
          setForm((prev) => ({ ...prev, assignedMemberId: "" }));
        }
        if (allowedMemberIds.size === 1) {
          const [onlyMemberId] = Array.from(allowedMemberIds);
          setForm((prev) => ({ ...prev, assignedMemberId: prev.assignedMemberId || onlyMemberId }));
        } else if (!allowedMemberIds.size && serviceMembers.length === 1) {
          setForm((prev) => ({ ...prev, assignedMemberId: prev.assignedMemberId || serviceMembers[0].id }));
        }
        setForm((prev) => {
          if (prev.location.trim()) return prev;
          if (detail.locationBehavior === "online") {
            return { ...prev, location: detail.location || "Virtual meeting" };
          }
          if (detail.locationBehavior === "hybrid") {
            return { ...prev, location: detail.location || "Hybrid service" };
          }
          return { ...prev, location: detail.location || "" };
        });
      } catch {
        setSelectedService(null);
        setMembers([]);
      }
    };
    void loadSelectedService();
  }, [form.serviceId]);

  const memberOptions = members;

  useEffect(() => {
    if (!selectedService || !form.appointmentStartTime) return;
    const [hours, minutes] = form.appointmentStartTime.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
    const totalMinutes = hours * 60 + minutes + (selectedService.durationMinutes || 0);
    const normalizedHours = Math.floor(totalMinutes / 60) % 24;
    const normalizedMinutes = totalMinutes % 60;
    const computed = `${String(normalizedHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`;
    setForm((prev) => (prev.appointmentEndTime === computed ? prev : { ...prev, appointmentEndTime: computed }));
  }, [form.appointmentStartTime, selectedService]);

  useEffect(() => {
    if (form.appointmentForType === "product" && form.appointmentForId && form.productId !== form.appointmentForId) {
      setForm((prev) => ({ ...prev, productId: prev.appointmentForId }));
    }
  }, [form.appointmentForId, form.appointmentForType, form.productId]);

  useEffect(() => {
    if (form.coverageType === "none" && form.coverageStatus !== "not_applicable") {
      setForm((prev) => ({ ...prev, coverageStatus: "not_applicable" }));
    }
  }, [form.coverageType, form.coverageStatus]);

  useEffect(() => {
    if (!form.appointmentDate) return;
    const holiday = holidays.find((item) => item.date === form.appointmentDate);
    if (holiday) {
      setError(`${holiday.name} is marked as a holiday. Appointment booking is blocked for this date.`);
    } else if (error?.includes("holiday")) {
      setError(null);
    }
  }, [form.appointmentDate, holidays]);

  const handleSubmit = async () => {
    if (!form.serviceId) return setError("Service is required.");
    if (!form.appointmentDate) return setError("Appointment date is required.");
    if (!form.appointmentStartTime) return setError("Appointment start time is required.");
    if (holidays.some((item) => item.date === form.appointmentDate)) {
      return setError("Appointments cannot be booked on a holiday.");
    }
    if (form.appointmentForType === "other" && !form.appointmentForLabel.trim()) {
      return setError("Appointment label is required for Other.");
    }
    try {
      setSaving(true);
      setError(null);
      const appointment = isEdit && id ? await updateAppointment(id, form) : await createAppointment(form);
      navigate(`/services/appointments/${appointment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit Appointment" : "Create Appointment"}</h1>
            <p className="text-sm text-slate-500">Schedule a service against a CRM customer and staff member.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate("/services/appointments")} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">Cancel</button>
            <button type="button" disabled={saving} onClick={() => void handleSubmit()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>

        {loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading appointment...</div> : null}
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error}</div> : null}

        {!loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Appointment Number</label>
                <input className={`${inputClass} bg-slate-50`} readOnly value={appointmentNumber || "Auto-generated"} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Service Name</label>
                <select className={inputClass} value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                  <option value="">Select service</option>
                  {services.map((item) => <option key={item.id} value={item.id}>{item.serviceName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Appointment For</label>
                <div className="space-y-2">
                  <select className={inputClass} value={form.appointmentForType} onChange={(e) => setForm({ ...form, appointmentForType: e.target.value as any, appointmentForId: "", appointmentForLabel: "" })}>
                    {appointmentEntityTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {form.appointmentForType === "other" ? (
                    <input className={inputClass} value={form.appointmentForLabel} onChange={(e) => setForm({ ...form, appointmentForLabel: e.target.value })} placeholder="Enter name" />
                  ) : (
                    <div className="flex gap-2">
                      <input readOnly className={`${inputClass} flex-1`} value={form.appointmentForLabel} placeholder="Choose record" />
                      <button type="button" onClick={() => { setLookupMode("appointment"); setLookupOpen(true); }} className="rounded-md border border-slate-300 px-3 text-sm text-slate-700">Lookup</button>
                      {form.appointmentForId ? <button type="button" onClick={() => setForm({ ...form, appointmentForId: "", appointmentForLabel: "" })} className="rounded-md border border-slate-300 px-3 text-sm text-slate-700">Clear</button> : null}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Member</label>
                <select className={inputClass} value={form.assignedMemberId} onChange={(e) => setForm({ ...form, assignedMemberId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {memberOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                {selectedService?.members?.length ? <p className="mt-1 text-xs text-slate-500">Only members assigned to the selected service are available.</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Appointment Date</label>
                <input type="date" className={inputClass} value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
                <input className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                {selectedService?.locationBehavior ? <p className="mt-1 text-xs text-slate-500">Location behavior: {selectedService.locationBehavior}. Service defaults are applied automatically.</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Appointment Start Time</label>
                <input type="time" className={inputClass} value={form.appointmentStartTime} onChange={(e) => setForm({ ...form, appointmentStartTime: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Appointment End Time</label>
                <input type="time" className={`${inputClass} bg-slate-50`} readOnly value={form.appointmentEndTime} onChange={(e) => setForm({ ...form, appointmentEndTime: e.target.value })} />
                <p className="mt-1 text-xs text-slate-500">End time is auto-calculated from the selected service duration.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {appointmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
            {selectedService?.businessHoursDetails ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Booking follows <span className="font-medium text-slate-900">{selectedService.businessHoursName || selectedService.businessHoursDetails.name}</span>
                {selectedService.businessHoursTimezone ? ` (${selectedService.businessHoursTimezone})` : ""}.
              </div>
            ) : null}
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900">Asset & Coverage</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Customer Asset Name</label>
                  <input className={inputClass} value={form.customerAssetName} onChange={(e) => setForm({ ...form, customerAssetName: e.target.value })} placeholder="AC Unit, Printer, Router..." />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Product Serial Number</label>
                  <input className={inputClass} value={form.productSerialNumber} onChange={(e) => setForm({ ...form, productSerialNumber: e.target.value })} placeholder="Enter serial number" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Coverage Type</label>
                  <select className={inputClass} value={form.coverageType} onChange={(e) => setForm({ ...form, coverageType: e.target.value })}>
                    {appointmentCoverageTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Coverage Status</label>
                  <select className={inputClass} value={form.coverageStatus} onChange={(e) => setForm({ ...form, coverageStatus: e.target.value })} disabled={form.coverageType === "none"}>
                    {appointmentCoverageStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Linked Product ID</label>
                  <div className="flex gap-2">
                    <input readOnly className={`${inputClass} flex-1`} value={form.productId} placeholder="Select product" />
                    <button type="button" onClick={() => { setLookupMode("product"); setLookupOpen(true); }} className="rounded-md border border-slate-300 px-3 text-sm text-slate-700">Lookup</button>
                    {form.productId ? <button type="button" onClick={() => setForm({ ...form, productId: "" })} className="rounded-md border border-slate-300 px-3 text-sm text-slate-700">Clear</button> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">If you selected Product in appointment lookup, this fills automatically.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Sales Order ID</label>
                  <div className="flex gap-2">
                    <input readOnly className={`${inputClass} flex-1`} value={form.salesOrderId} placeholder="Select sales order" />
                    <button type="button" onClick={() => { setLookupMode("sales-order"); setLookupOpen(true); }} className="rounded-md border border-slate-300 px-3 text-sm text-slate-700">Lookup</button>
                    {form.salesOrderId ? <button type="button" onClick={() => setForm({ ...form, salesOrderId: "" })} className="rounded-md border border-slate-300 px-3 text-sm text-slate-700">Clear</button> : null}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Invoice ID</label>
                  <div className="flex gap-2">
                    <input readOnly className={`${inputClass} flex-1`} value={form.invoiceId} placeholder="Select invoice" />
                    <button type="button" onClick={() => { setLookupMode("invoice"); setLookupOpen(true); }} className="rounded-md border border-slate-300 px-3 text-sm text-slate-700">Lookup</button>
                    {form.invoiceId ? <button type="button" onClick={() => setForm({ ...form, invoiceId: "" })} className="rounded-md border border-slate-300 px-3 text-sm text-slate-700">Clear</button> : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
              <textarea className={textareaClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900">Completion Details</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Completion Notes</label>
                  <textarea className={textareaClass} value={form.completionNotes} onChange={(e) => setForm({ ...form, completionNotes: e.target.value })} placeholder="Work done, parts replaced, final condition..." />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Completion Proof URL</label>
                  <input className={inputClass} value={form.completionProofUrl} onChange={(e) => setForm({ ...form, completionProofUrl: e.target.value })} placeholder="Photo, signature, drive link..." />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <ServicesLookupModal
        open={lookupOpen}
        type={lookupMode === "appointment" ? form.appointmentForType : lookupMode}
        onClose={() => setLookupOpen(false)}
        onSelect={(option: LookupOption) => {
          if (lookupMode === "appointment") {
            setForm({ ...form, appointmentForId: option.id, appointmentForLabel: option.label });
            return;
          }
          if (lookupMode === "product") {
            setForm((prev) => ({ ...prev, productId: option.id }));
            return;
          }
          if (lookupMode === "sales-order") {
            setForm((prev) => ({
              ...prev,
              salesOrderId: option.id,
              appointmentForType:
                prev.appointmentForId
                  ? prev.appointmentForType
                  : option.contactId
                    ? "contact"
                    : option.accountId
                      ? "account"
                      : option.dealId
                        ? "deal"
                        : prev.appointmentForType,
              appointmentForId:
                prev.appointmentForId || option.contactId || option.accountId || option.dealId || "",
              appointmentForLabel: prev.appointmentForLabel || option.label,
            }));
            return;
          }
          setForm((prev) => ({
            ...prev,
            invoiceId: option.id,
            salesOrderId: prev.salesOrderId || option.salesOrderId || "",
            appointmentForType:
              prev.appointmentForId
                ? prev.appointmentForType
                : option.contactId
                  ? "contact"
                  : option.accountId
                    ? "account"
                    : option.dealId
                      ? "deal"
                      : prev.appointmentForType,
            appointmentForId:
              prev.appointmentForId || option.contactId || option.accountId || option.dealId || "",
            appointmentForLabel: prev.appointmentForLabel || option.label,
          }));
        }}
      />
    </DashboardLayout>
  );
}
