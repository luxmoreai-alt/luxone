import { useEffect, useMemo, useState } from "react";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { integrationsApi } from "../../integrations/api";
import IntegrationHeader from "../../integrations/components/IntegrationHeader";
import AddDomainModal from "../../integrations/components/AddDomainModal";
import BCCDropboxAddEmailModal from "../../integrations/components/BCCDropboxAddEmailModal";
import BCCDropboxCard from "../../integrations/components/BCCDropboxCard";
import BCCDropboxVerifyModal from "../../integrations/components/BCCDropboxVerifyModal";
import ComposeSettingsForm from "../../integrations/components/ComposeSettingsForm";
import CustomEmailFieldsToggle from "../../integrations/components/CustomEmailFieldsToggle";
import EmailAuthenticationTable from "../../integrations/components/EmailAuthenticationTable";
import EmailCredibilityDashboard from "../../integrations/components/EmailCredibilityDashboard";
import EmailInsightsPanel from "../../integrations/components/EmailInsightsPanel";
import EmailParserCard from "../../integrations/components/EmailParserCard";
import EmailProviderForm from "../../integrations/components/EmailProviderForm";
import EmailProvidersList from "../../integrations/components/EmailProvidersList";
import EmailRelayForm from "../../integrations/components/EmailRelayForm";
import EmailRelayTable from "../../integrations/components/EmailRelayTable";
import EmailSharingTable from "../../integrations/components/EmailSharingTable";
import OrganizationEmailForm from "../../integrations/components/OrganizationEmailForm";
import OrganizationEmailsTable from "../../integrations/components/OrganizationEmailsTable";
import SalesInboxCard from "../../integrations/components/SalesInboxCard";
import SalesInboxFeed from "../../integrations/components/SalesInboxFeed";
import UnsubscribeLinkForm from "../../integrations/components/UnsubscribeLinkForm";
import UnsubscribeLinksTable from "../../integrations/components/UnsubscribeLinksTable";
import { deliverabilityTabs, integrationsNavTabs } from "../../integrations/config";
import type {
  BCCDropboxSetting,
  EmailAuthenticationDomain,
  EmailComposeSetting,
  EmailCredibilityMetric,
  EmailCredibilityReport,
  EmailInsightSetting,
  EmailParserInbox,
  EmailProviderFormValues,
  EmailProviderIntegration,
  EmailRelayServer,
  OrganizationEmailAddress,
  SalesInboxSetting,
  UnsubscribeLink,
} from "../../integrations/types";

type Notice = { tone: "success" | "error"; message: string } | null;
type ProviderFieldErrors = Partial<Record<"email_address" | "display_name" | "reply_to_address", string>>;

function extractFieldErrors(error: unknown): ProviderFieldErrors {
  const payload = (error as { payload?: unknown } | undefined)?.payload;
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const result: ProviderFieldErrors = {};
  const record = payload as Record<string, unknown>;
  const mappings: Array<[keyof ProviderFieldErrors, string[]]> = [
    ["email_address", ["email_address", "email"]],
    ["display_name", ["display_name"]],
    ["reply_to_address", ["reply_to_address", "reply_to"]],
  ];

  for (const [field, keys] of mappings) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        result[field] = value;
        break;
      }
      if (Array.isArray(value) && typeof value[0] === "string") {
        result[field] = value[0];
        break;
      }
    }
  }

  return result;
}

export default function EmailIntegrationsPage() {
  const [providers, setProviders] = useState<EmailProviderIntegration[]>([]);
  const [composeSettings, setComposeSettings] = useState<EmailComposeSetting[]>([]);
  const [sharingRows, setSharingRows] = useState<any[]>([]);
  const [organizationEmails, setOrganizationEmails] = useState<OrganizationEmailAddress[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [salesInboxSettings, setSalesInboxSettings] = useState<SalesInboxSetting[]>([]);
  const [salesInboxFeed, setSalesInboxFeed] = useState<any[]>([]);
  const [parsers, setParsers] = useState<EmailParserInbox[]>([]);
  const [bccSettings, setBccSettings] = useState<BCCDropboxSetting[]>([]);
  const [domains, setDomains] = useState<EmailAuthenticationDomain[]>([]);
  const [relays, setRelays] = useState<EmailRelayServer[]>([]);
  const [credibilityMetrics, setCredibilityMetrics] = useState<EmailCredibilityMetric[]>([]);
  const [credibilityReport, setCredibilityReport] = useState<EmailCredibilityReport | null>(null);
  const [insights, setInsights] = useState<EmailInsightSetting[]>([]);
  const [unsubscribeLinks, setUnsubscribeLinks] = useState<UnsubscribeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [activeDeliverabilityTab, setActiveDeliverabilityTab] = useState("authentication");

  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<EmailProviderIntegration | null>(null);
  const [presetProviderType, setPresetProviderType] = useState<EmailProviderIntegration["provider_type"] | undefined>();
  const [providerSubmitting, setProviderSubmitting] = useState(false);
  const [syncingProviderId, setSyncingProviderId] = useState<number | null>(null);

  const [organizationModalOpen, setOrganizationModalOpen] = useState(false);
  const [editingOrganizationEmail, setEditingOrganizationEmail] = useState<OrganizationEmailAddress | null>(null);

  const [relayModalOpen, setRelayModalOpen] = useState(false);
  const [editingRelay, setEditingRelay] = useState<EmailRelayServer | null>(null);

  const [unsubscribeModalOpen, setUnsubscribeModalOpen] = useState(false);
  const [editingUnsubscribeLink, setEditingUnsubscribeLink] = useState<UnsubscribeLink | null>(null);

  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [bccAddOpen, setBccAddOpen] = useState(false);
  const [bccVerifyOpen, setBccVerifyOpen] = useState(false);

  const primaryComposeSetting = composeSettings[0] || null;
  const primaryCustomField = customFields[0] || null;
  const primarySalesInbox = salesInboxSettings[0] || null;
  const primaryParser = parsers[0] || null;
  const primaryBcc = bccSettings[0] || null;
  const primaryInsight = insights[0] || null;

  const load = async () => {
    try {
      setLoading(true);
      const [
        nextProviders,
        nextComposeSettings,
        nextSharingRows,
        nextOrganizationEmails,
        nextCustomFields,
        nextSalesInboxSettings,
        nextSalesInboxFeed,
        nextParsers,
        nextBccSettings,
        nextDomains,
        nextRelays,
        nextCredibilityMetrics,
        nextCredibilityReport,
        nextInsights,
        nextUnsubscribeLinks,
      ] = await Promise.all([
        integrationsApi.listEmailProviders().catch(() => []),
        integrationsApi.listComposeSettings().catch(() => []),
        integrationsApi.listEmailSharing().catch(() => []),
        integrationsApi.listOrganizationEmails().catch(() => []),
        integrationsApi.listCustomEmailFields().catch(() => []),
        integrationsApi.listSalesInboxSettings().catch(() => []),
        integrationsApi.listSalesInboxFeed().catch(() => []),
        integrationsApi.listEmailParsers().catch(() => []),
        integrationsApi.listBCCDropboxSettings().catch(() => []),
        integrationsApi.listEmailDomains().catch(() => []),
        integrationsApi.listEmailRelays().catch(() => []),
        integrationsApi.listEmailCredibility().catch(() => []),
        integrationsApi.getEmailCredibilityReport().catch(() => null),
        integrationsApi.listEmailInsights().catch(() => []),
        integrationsApi.listUnsubscribeLinks().catch(() => []),
      ]);
      setProviders(nextProviders);
      setComposeSettings(nextComposeSettings);
      setSharingRows(nextSharingRows);
      setOrganizationEmails(nextOrganizationEmails);
      setCustomFields(nextCustomFields);
      setSalesInboxSettings(nextSalesInboxSettings);
      setSalesInboxFeed(nextSalesInboxFeed);
      setParsers(nextParsers);
      setBccSettings(nextBccSettings);
      setDomains(nextDomains);
      setRelays(nextRelays);
      setCredibilityMetrics(nextCredibilityMetrics);
      setCredibilityReport(nextCredibilityReport);
      setInsights(nextInsights);
      setUnsubscribeLinks(nextUnsubscribeLinks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const setSuccess = (message: string) => setNotice({ tone: "success", message });
  const setError = (error: unknown) => setNotice({ tone: "error", message: error instanceof Error ? error.message : "Action failed." });

  const runAction = async (action: () => Promise<unknown>, message: string, after?: () => void) => {
    try {
      await action();
      setSuccess(message);
      after?.();
      await load();
    } catch (error) {
      setError(error);
    }
  };

  const openCreateProvider = (providerType?: EmailProviderIntegration["provider_type"]) => {
    setEditingProvider(null);
    setPresetProviderType(providerType);
    setProviderModalOpen(true);
  };

  const providerSelectOptions = useMemo(() => providers.filter((provider) => provider.is_active), [providers]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <IntegrationHeader
          title="Email Integrations"
          subtitle="Configure mailbox providers, SalesInbox, parser, BCC Dropbox, deliverability, and unsubscribe settings."
          tabs={integrationsNavTabs}
          activePath="/integrations/email"
          action={<button type="button" onClick={() => openCreateProvider()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">Add Provider</button>}
        />

        {notice ? (
          <div className="pointer-events-none fixed right-4 top-4 z-50">
            <div className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              {notice.message}
            </div>
          </div>
        ) : null}

        {loading ? <div className="text-sm text-slate-500">Loading email integrations...</div> : null}

        <EmailProvidersList
          providers={providers}
          syncingProviderId={syncingProviderId}
          onCreate={openCreateProvider}
          onEdit={(provider) => {
            setEditingProvider(provider);
            setPresetProviderType(undefined);
            setProviderModalOpen(true);
          }}
          onSync={(provider) => {
            void (async () => {
              try {
                setSyncingProviderId(provider.id);
                const result = await integrationsApi.syncEmailProvider(provider.id);
                setSuccess(result.message || `Synced ${result.emails_synced} emails successfully.`);
                await load();
              } catch (error) {
                setError(error);
              } finally {
                setSyncingProviderId(null);
              }
            })();
          }}
          onDelete={(provider) => {
            if (!window.confirm(`Delete provider ${provider.email_address}?`)) return;
            void runAction(() => integrationsApi.deleteEmailProvider(provider.id), "Provider deleted successfully.");
          }}
        />

        <ComposeSettingsForm
          value={primaryComposeSetting}
          providers={providerSelectOptions}
          onSubmit={(payload) =>
            void runAction(
              () => primaryComposeSetting ? integrationsApi.updateComposeSetting(primaryComposeSetting.id, payload) : integrationsApi.createComposeSetting(payload),
              "Compose settings saved successfully."
            )
          }
        />

        <EmailSharingTable rows={sharingRows} />

        <OrganizationEmailsTable
          rows={organizationEmails}
          onCreate={() => {
            setEditingOrganizationEmail(null);
            setOrganizationModalOpen(true);
          }}
          onEdit={(row) => {
            setEditingOrganizationEmail(row);
            setOrganizationModalOpen(true);
          }}
          onConfirm={(row) => void runAction(() => integrationsApi.confirmOrganizationEmail(row.id), "Organization email confirmed successfully.")}
        />

        <CustomEmailFieldsToggle
          value={primaryCustomField}
          onToggle={(next) =>
            void runAction(
              () => primaryCustomField ? integrationsApi.updateCustomEmailFields(primaryCustomField.id, { is_enabled: next }) : integrationsApi.createCustomEmailFields({ is_enabled: next }),
              "Custom email field preference updated."
            )
          }
        />

        <SalesInboxCard
          setting={primarySalesInbox}
          onSave={(payload) =>
            void runAction(
              () => primarySalesInbox ? integrationsApi.updateSalesInboxSetting(primarySalesInbox.id, payload) : integrationsApi.createSalesInboxSetting(payload),
              "SalesInbox settings saved."
            )
          }
        />

        <SalesInboxFeed items={salesInboxFeed} />

        <EmailParserCard
          parser={primaryParser}
          onGenerate={() => void runAction(() => integrationsApi.generateEmailParser({ parser_name: "Primary Parser", create_record_type: "lead" }), "Parser inbox generated successfully.")}
          onUpdate={(payload) => primaryParser ? void runAction(() => integrationsApi.updateEmailParser(primaryParser.id, payload), "Parser updated successfully.") : undefined}
          onIngestTest={() => primaryParser ? void runAction(() => integrationsApi.ingestEmailParser(primaryParser.id, { from_email: "prospect@example.com", from_name: "Parsed Prospect", subject: "Parser Test", company: "Website Lead" }), "Parser test ingest completed.") : undefined}
        />

        <BCCDropboxCard
          setting={primaryBcc}
          onCreate={() => void runAction(() => integrationsApi.createBCCDropboxSetting({ exclude_domains: [], search_pattern_order: ["contacts", "leads", "create_new_lead_if_not_found"], is_active: true }), "BCC Dropbox created successfully.")}
          onUpdate={(payload) => primaryBcc ? void runAction(() => integrationsApi.updateBCCDropboxSetting(primaryBcc.id, payload), "BCC Dropbox updated successfully.") : undefined}
          onRegenerate={() => primaryBcc ? void runAction(() => integrationsApi.regenerateBCCDropbox(primaryBcc.id), "BCC Dropbox address regenerated.") : undefined}
          onAddEmail={() => setBccAddOpen(true)}
          onVerifyEmail={() => setBccVerifyOpen(true)}
        />

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {deliverabilityTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveDeliverabilityTab(tab.value)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${activeDeliverabilityTab === tab.value ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeDeliverabilityTab === "authentication" ? (
            <EmailAuthenticationTable
              rows={domains}
              onAdd={() => setAddDomainOpen(true)}
              onCheck={(row) => void runAction(() => integrationsApi.checkEmailDomainStatus(row.id), "Domain authentication status checked.")}
            />
          ) : null}

          {activeDeliverabilityTab === "relay" ? (
            <EmailRelayTable
              rows={relays}
              onAdd={() => {
                setEditingRelay(null);
                setRelayModalOpen(true);
              }}
              onEdit={(row) => {
                setEditingRelay(row);
                setRelayModalOpen(true);
              }}
              onDelete={(row) => {
                if (!window.confirm(`Delete relay ${row.server_name}?`)) return;
                void runAction(() => integrationsApi.deleteEmailRelay(row.id), "Relay deleted successfully.");
              }}
            />
          ) : null}

          {activeDeliverabilityTab === "credibility" ? (
            <EmailCredibilityDashboard metrics={credibilityMetrics} report={credibilityReport} />
          ) : null}
        </div>

        <EmailInsightsPanel
          setting={primaryInsight}
          onSave={(payload) =>
            void runAction(
              () => primaryInsight ? integrationsApi.updateEmailInsight(primaryInsight.id, payload) : integrationsApi.createEmailInsight(payload),
              "Email insight settings saved."
            )
          }
        />

        <UnsubscribeLinksTable
          rows={unsubscribeLinks}
          onCreate={() => {
            setEditingUnsubscribeLink(null);
            setUnsubscribeModalOpen(true);
          }}
          onEdit={(row) => {
            setEditingUnsubscribeLink(row);
            setUnsubscribeModalOpen(true);
          }}
          onDelete={(row) => {
            if (!window.confirm(`Delete unsubscribe link "${row.name}"?`)) return;
            void runAction(() => integrationsApi.deleteUnsubscribeLink(row.id), "Unsubscribe link deleted.");
          }}
        />

        <CRMSectionCard title="Operational Visibility">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Providers</div>
              <div className="mt-2 text-2xl font-semibold">{providers.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">SalesInbox Messages</div>
              <div className="mt-2 text-2xl font-semibold">{salesInboxFeed.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Deliverability Domains</div>
              <div className="mt-2 text-2xl font-semibold">{domains.length}</div>
            </div>
          </div>
        </CRMSectionCard>

        <EmailProviderForm
          open={providerModalOpen}
          initialValue={editingProvider}
          presetProviderType={presetProviderType}
          submitting={providerSubmitting}
          onClose={() => setProviderModalOpen(false)}
          onSubmit={async (values: EmailProviderFormValues) => {
            try {
              setProviderSubmitting(true);
              if (editingProvider) {
                await integrationsApi.updateEmailProvider(editingProvider.id, values);
                setSuccess("Email provider updated successfully");
              } else {
                await integrationsApi.createEmailProvider(values);
                setSuccess("Email provider added successfully");
              }
              setProviderModalOpen(false);
              await load();
              return { success: true };
            } catch (error) {
              const fieldErrors = extractFieldErrors(error);
              setError(error);
              return {
                success: false,
                fieldErrors,
                formError:
                  Object.keys(fieldErrors).length > 0
                    ? ""
                    : error instanceof Error
                      ? error.message
                      : "Unable to save email provider.",
              };
            } finally {
              setProviderSubmitting(false);
            }
          }}
        />

        <OrganizationEmailForm
          open={organizationModalOpen}
          initialValue={editingOrganizationEmail}
          onClose={() => setOrganizationModalOpen(false)}
          onSubmit={(values) =>
            void runAction(
              () => editingOrganizationEmail ? integrationsApi.updateOrganizationEmail(editingOrganizationEmail.id, values) : integrationsApi.createOrganizationEmail(values),
              editingOrganizationEmail ? "Organization email updated." : "Organization email added.",
              () => setOrganizationModalOpen(false)
            )
          }
        />

        <EmailRelayForm
          open={relayModalOpen}
          initialValue={editingRelay}
          onClose={() => setRelayModalOpen(false)}
          onSubmit={(values) =>
            void runAction(
              () => editingRelay ? integrationsApi.updateEmailRelay(editingRelay.id, values) : integrationsApi.createEmailRelay(values),
              editingRelay ? "Relay updated successfully." : "Relay created successfully.",
              () => setRelayModalOpen(false)
            )
          }
        />

        <UnsubscribeLinkForm
          open={unsubscribeModalOpen}
          initialValue={editingUnsubscribeLink}
          onClose={() => setUnsubscribeModalOpen(false)}
          onSubmit={(values) =>
            void runAction(
              () => editingUnsubscribeLink ? integrationsApi.updateUnsubscribeLink(editingUnsubscribeLink.id, values) : integrationsApi.createUnsubscribeLink(values),
              editingUnsubscribeLink ? "Unsubscribe link updated." : "Unsubscribe link created.",
              () => setUnsubscribeModalOpen(false)
            )
          }
        />

        <AddDomainModal
          open={addDomainOpen}
          onClose={() => setAddDomainOpen(false)}
          onSubmit={(domain) =>
            void runAction(
              () => integrationsApi.createEmailDomain({ domain_name: domain }),
              "Authentication domain added.",
              () => setAddDomainOpen(false)
            )
          }
        />

        <BCCDropboxAddEmailModal
          open={bccAddOpen}
          onClose={() => setBccAddOpen(false)}
          onSubmit={(email) => primaryBcc ? void runAction(() => integrationsApi.addBCCVerifiedEmail(primaryBcc.id, email), "Verified email added.", () => setBccAddOpen(false)) : undefined}
        />

        <BCCDropboxVerifyModal
          open={bccVerifyOpen}
          onClose={() => setBccVerifyOpen(false)}
          onSubmit={(payload) => primaryBcc ? void runAction(() => integrationsApi.verifyBCCEmail(primaryBcc.id, payload.email_address, payload.verification_code), "Email verified successfully.", () => setBccVerifyOpen(false)) : undefined}
        />
      </div>
    </DashboardLayout>
  );
}
