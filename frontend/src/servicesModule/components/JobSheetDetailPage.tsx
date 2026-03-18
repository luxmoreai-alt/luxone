import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CRMDetailHeader from "../../components/crm/CRMDetailHeader";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getAppointment, getJobSheet, getService } from "../api";
import type { AppointmentRecord, JobSheetRecord, ServiceRecord } from "../types";

export default function JobSheetDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [jobSheet, setJobSheet] = useState<JobSheetRecord | null>(null);
  const [service, setService] = useState<ServiceRecord | null>(null);
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const detail = await getJobSheet(id);
        setJobSheet(detail);
        const [serviceDetail, appointmentDetail] = await Promise.all([
          getService(detail.serviceId),
          detail.appointmentId ? getAppointment(detail.appointmentId) : Promise.resolve(null),
        ]);
        setService(serviceDetail);
        setAppointment(appointmentDetail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load job sheet.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) return <DashboardLayout><div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading job sheet...</div></DashboardLayout>;
  if (error || !jobSheet) return <DashboardLayout><div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error || "Job sheet not found."}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <CRMDetailHeader title={jobSheet.title} subtitle={jobSheet.status} avatar={jobSheet.title.slice(0, 2).toUpperCase()} actions={["Edit"]} onBack={() => navigate("/services/catalog")} />
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <CRMSectionCard title="Job Sheet Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Service</p><p className="mt-1 text-sm text-slate-800">{service?.serviceName || jobSheet.serviceName}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 text-sm text-slate-800">{jobSheet.status}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Appointment</p><p className="mt-1 text-sm text-slate-800">{appointment?.appointmentNumber || "-"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Customer</p><p className="mt-1 text-sm text-slate-800">{appointment?.appointmentForDisplay || "-"}</p></div>
            </div>
          </CRMSectionCard>
          <CRMSectionCard title="Submitted Fields">
            <div className="space-y-3">
              {jobSheet.fields.length ? jobSheet.fields.map((field, index) => (
                <div key={`${field.fieldName}-${index}`} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{field.fieldLabel}</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{field.fieldValue || "-"}</div>
                </div>
              )) : <div className="text-sm text-slate-500">No field values captured yet.</div>}
            </div>
          </CRMSectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

