import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { enableServices, getServicesSetupStatus, updateServicesSetupStatus } from "../api";
import { servicesPromoSlides } from "../config";
import type { ServiceSettings } from "../types";
import ServicesEnableModal from "./ServicesEnableModal";

export default function ServicesPromoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [settings, setSettings] = useState<ServiceSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setSettings(await getServicesSetupStatus());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load Services setup state.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [navigate]);

  const handleEnable = async () => {
    try {
      setError(null);
      const nextSettings = await enableServices();
      setSettings(nextSettings);
      navigate("/services/catalog");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to enable Services.";
      if (message.toLowerCase().includes("business hours")) {
        setShowEnableModal(true);
        return;
      }
      setError(message);
    }
  };

  const handleDoNotShow = async () => {
    try {
      const nextSettings = await updateServicesSetupStatus({ hidePromo: true });
      setSettings(nextSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update setup preferences.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">Services Module</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Set up service operations inside your CRM</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            Configure business hours, build a service catalog, assign staff, and collect job-sheet information on live CRM records.
          </p>
          {settings?.isServicesEnabled ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Services is already enabled. You can still view this promo page, or continue to the catalog.
            </div>
          ) : null}
          {settings?.hidePromo ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Promo was previously hidden, but it will still open when you explicitly choose Promo from the sidebar.
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={loading || settings?.isServicesEnabled} onClick={() => void handleEnable()} className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {settings?.isServicesEnabled ? "Services Enabled" : "Enable Services"}
            </button>
            <button type="button" onClick={() => void handleDoNotShow()} className="rounded-md border border-slate-300 px-5 py-2.5 text-sm text-slate-700">
              Do Not Show
            </button>
            <button type="button" onClick={() => navigate("/services/catalog")} className="rounded-md border border-slate-300 px-5 py-2.5 text-sm text-slate-700">
              Open Catalog
            </button>
          </div>
          {error ? <div className="mt-4 text-sm text-rose-600">{error}</div> : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {servicesPromoSlides.map((slide, index) => (
            <section key={slide.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{slide.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{slide.description}</p>
            </section>
          ))}
        </div>
      </div>

      <ServicesEnableModal
        open={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onConfigure={() => {
          setShowEnableModal(false);
          navigate("/services/business-hours/new");
        }}
      />
    </DashboardLayout>
  );
}
