import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CRMDetailHeader from "../../components/crm/CRMDetailHeader";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getService, listAppointments, listJobSheets, listTeamMembers } from "../api";
import ServiceMembersSection from "./ServiceMembersSection";
import { formatCurrency, formatDuration, formatDateOnly, formatDateTime } from "../utils";
import type { AppointmentRecord, JobSheetRecord, ServiceRecord, TeamMember } from "../types";

export default function ServiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceRecord | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [jobSheets, setJobSheets] = useState<JobSheetRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [serviceDetail, serviceAppointments, serviceJobSheets, members] = await Promise.all([
          getService(id),
          listAppointments({ service: id }),
          listJobSheets({ service: id }),
          listTeamMembers(),
        ]);
        setService(serviceDetail);
        setAppointments(serviceAppointments);
        setJobSheets(serviceJobSheets);
        setTeamMembers(members);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load service details.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) return <DashboardLayout><div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading service...</div></DashboardLayout>;
  if (error || !service) return <DashboardLayout><div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error || "Service not found."}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <CRMDetailHeader title={service.serviceName} subtitle={service.status} avatar={service.serviceName.slice(0, 2).toUpperCase()} actions={["Edit"]} onBack={() => navigate("/services/catalog")} />

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <CRMSectionCard title="Service Information">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Service Code</p><p className="mt-1 text-sm text-slate-800">{service.serviceCode}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 text-sm text-slate-800">{service.status}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Price</p><p className="mt-1 text-sm text-slate-800">{formatCurrency(service.price)}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Duration</p><p className="mt-1 text-sm text-slate-800">{formatDuration(service.durationMinutes)}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Location</p><p className="mt-1 text-sm text-slate-800">{service.location || "-"}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Location Type</p><p className="mt-1 text-sm text-slate-800">{service.locationType}</p></div>
              </div>
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{service.description || "-"}</p>
              </div>
            </CRMSectionCard>

            <CRMSectionCard title="Availability">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Available Days</p><p className="mt-1 text-sm text-slate-800">{service.availableDaysMode}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Available Time</p><p className="mt-1 text-sm text-slate-800">{service.availableTimeMode}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Linked Business Hours</p><p className="mt-1 text-sm text-slate-800">{service.businessHoursName || "-"}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Timezone</p><p className="mt-1 text-sm text-slate-800">{service.businessHoursTimezone || "-"}</p></div>
                <div className="sm:col-span-2"><p className="text-xs uppercase tracking-wide text-slate-500">Public Booking URL</p><p className="mt-1 break-all text-sm text-slate-800">{service.publicBookingUrl || "-"}</p></div>
              </div>
            </CRMSectionCard>

            <CRMSectionCard title="Appointments" action={<button type="button" onClick={() => navigate("/services/appointments/create")} className="text-xs font-medium text-blue-600">New Appointment</button>}>
              <div className="space-y-2">
                {appointments.length ? appointments.map((item) => (
                  <button key={item.id} type="button" onClick={() => navigate(`/services/appointments/${item.id}`)} className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-800">{item.appointmentForDisplay || item.appointmentNumber}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDateOnly(item.appointmentDate)} • {item.appointmentStartTime} - {item.appointmentEndTime} • {item.status}</div>
                  </button>
                )) : <div className="text-sm text-slate-500">No appointments linked to this service yet.</div>}
              </div>
            </CRMSectionCard>
          </div>

          <div className="space-y-4">
            <ServiceMembersSection members={service.members || []} teamMembers={teamMembers} />
            <CRMSectionCard title="Job Sheets" action={<button type="button" onClick={() => navigate("/services/job-sheets/create")} className="text-xs font-medium text-blue-600">New Job Sheet</button>}>
              <div className="space-y-2">
                {jobSheets.length ? jobSheets.map((sheet) => (
                  <button key={sheet.id} type="button" onClick={() => navigate(`/services/job-sheets/${sheet.id}`)} className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-800">{sheet.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{sheet.status} • Updated {formatDateTime(sheet.updatedAt)}</div>
                  </button>
                )) : <div className="text-sm text-slate-500">No job sheets created for this service yet.</div>}
              </div>
            </CRMSectionCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
