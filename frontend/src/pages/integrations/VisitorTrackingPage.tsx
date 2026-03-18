import { useEffect, useMemo, useState } from "react";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { integrationsApi } from "../../integrations/api";
import IntegrationHeader from "../../integrations/components/IntegrationHeader";
import VisitorLeadGenerationModal from "../../integrations/components/VisitorLeadGenerationModal";
import VisitorPortalForm from "../../integrations/components/VisitorPortalForm";
import VisitorTrackingCodeModal from "../../integrations/components/VisitorTrackingCodeModal";
import VisitorTrackingLanding from "../../integrations/components/VisitorTrackingLanding";
import VisitorTrackingTable from "../../integrations/components/VisitorTrackingTable";
import { integrationsNavTabs } from "../../integrations/config";
import type {
  VisitorLeadEvent,
  VisitorTrackingPortal,
  VisitorTrackingSetting,
} from "../../integrations/types";

type Notice = { tone: "success" | "error"; message: string } | null;

export default function VisitorTrackingPage() {
  const [portals, setPortals] = useState<VisitorTrackingPortal[]>([]);
  const [settings, setSettings] = useState<VisitorTrackingSetting[]>([]);
  const [events, setEvents] = useState<VisitorLeadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<VisitorTrackingPortal | null>(null);

  const [leadSettingsOpen, setLeadSettingsOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<VisitorTrackingSetting | null>(null);
  const [selectedPortal, setSelectedPortal] = useState<VisitorTrackingPortal | null>(null);

  const [trackingCodeOpen, setTrackingCodeOpen] = useState(false);
  const [trackingCodePortalName, setTrackingCodePortalName] = useState("");
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [nextPortals, nextSettings, nextEvents] = await Promise.all([
        integrationsApi.listVisitorPortals().catch(() => []),
        integrationsApi.listVisitorSettings().catch(() => []),
        integrationsApi.listVisitorEvents().catch(() => []),
      ]);
      setPortals(nextPortals);
      setSettings(nextSettings);
      setEvents(nextEvents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const settingsByPortal = useMemo(
    () =>
      settings.reduce<Record<number, VisitorTrackingSetting>>((result, setting) => {
        result[setting.portal] = setting;
        return result;
      }, {}),
    [settings]
  );

  const setSuccess = (message: string) => setNotice({ tone: "success", message });
  const setError = (error: unknown) =>
    setNotice({
      tone: "error",
      message: error instanceof Error ? error.message : "Action failed.",
    });

  const runAction = async (
    action: () => Promise<unknown>,
    message: string,
    after?: () => void
  ) => {
    try {
      await action();
      setSuccess(message);
      after?.();
      await load();
    } catch (error) {
      setError(error);
    }
  };

  const openCreatePortal = () => {
    setEditingPortal(null);
    setPortalModalOpen(true);
  };

  const handleManagePortal = (portal: VisitorTrackingPortal) => {
    setSelectedPortal(portal);
    setEditingSetting(settingsByPortal[portal.id] || null);
    setLeadSettingsOpen(true);
  };

  const handleViewCode = async (portal: VisitorTrackingPortal) => {
    const setting = settingsByPortal[portal.id];
    setTrackingCodePortalName(portal.portal_name);
    setTrackingCode(setting?.tracking_code || null);
    setTrackingCodeOpen(true);

    if (!setting) {
      return;
    }

    try {
      const response = await integrationsApi.getVisitorTrackingCode(setting.id);
      setTrackingCode(response.tracking_code || setting.tracking_code || null);
    } catch {
      setTrackingCode(setting.tracking_code || null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <IntegrationHeader
          title="Visitor Tracking"
          subtitle="Set up visitor portals, control website lead capture, and surface source events for your CRM team."
          tabs={integrationsNavTabs}
          activePath="/integrations/visitors"
          action={
            <button
              type="button"
              onClick={openCreatePortal}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Create Portal
            </button>
          }
        />

        {notice ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-500">Loading visitor tracking...</div>
        ) : null}

        <VisitorTrackingLanding
          hasPortals={portals.length > 0}
          onGetStarted={openCreatePortal}
        />

        <VisitorTrackingTable
          portals={portals}
          events={events}
          onCreatePortal={openCreatePortal}
          onManagePortal={handleManagePortal}
          onDeactivatePortal={(portal) => {
            if (!window.confirm(`Deactivate visitor portal "${portal.portal_name}"?`)) {
              return;
            }
            void runAction(
              () => integrationsApi.deactivateVisitorPortal(portal.id),
              "Visitor portal deactivated successfully."
            );
          }}
          onViewCode={(portal) => void handleViewCode(portal)}
          onConvertEvent={(event) =>
            void runAction(
              () => integrationsApi.convertVisitorEventToLead(event.id),
              "Visitor event converted to lead successfully."
            )
          }
        />

        <CRMSectionCard title="Visitor Tracking Overview">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Portals</div>
              <div className="mt-2 text-2xl font-semibold">{portals.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Active Lead Rules</div>
              <div className="mt-2 text-2xl font-semibold">
                {settings.filter((setting) => setting.status_enabled).length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Open Visitor Events</div>
              <div className="mt-2 text-2xl font-semibold">
                {events.filter((event) => !event.converted_to_lead).length}
              </div>
            </div>
          </div>
        </CRMSectionCard>

        <VisitorPortalForm
          open={portalModalOpen}
          initialValue={editingPortal}
          onClose={() => setPortalModalOpen(false)}
          onSubmit={(values) =>
            void runAction(
              () =>
                editingPortal
                  ? integrationsApi.updateVisitorPortal(editingPortal.id, values)
                  : integrationsApi.createVisitorPortal(values),
              editingPortal
                ? "Visitor portal updated successfully."
                : "Visitor portal created successfully.",
              () => setPortalModalOpen(false)
            )
          }
        />

        <VisitorLeadGenerationModal
          open={leadSettingsOpen}
          initialValue={editingSetting}
          onClose={() => setLeadSettingsOpen(false)}
          onSubmit={(payload) => {
            if (!selectedPortal) {
              return;
            }

            void runAction(
              () =>
                editingSetting
                  ? integrationsApi.updateVisitorSetting(editingSetting.id, payload)
                  : integrationsApi.createVisitorSetting({
                      ...payload,
                      portal: selectedPortal.id,
                    }),
              editingSetting
                ? "Visitor lead generation updated successfully."
                : "Visitor lead generation created successfully.",
              () => setLeadSettingsOpen(false)
            );
          }}
        />

        <VisitorTrackingCodeModal
          open={trackingCodeOpen}
          portalName={trackingCodePortalName}
          trackingCode={trackingCode}
          onClose={() => setTrackingCodeOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
