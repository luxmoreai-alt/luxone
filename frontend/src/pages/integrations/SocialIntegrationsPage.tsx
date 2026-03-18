import { useEffect, useMemo, useState } from "react";
import CRMModalBase from "../../components/crm/CRMModalBase";
import CRMSectionCard from "../../components/crm/CRMSectionCard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { integrationsApi } from "../../integrations/api";
import {
  automationTriggerOptions,
  integrationsNavTabs,
  socialPlatformOptions,
  socialTabs,
} from "../../integrations/config";
import BrandForm from "../../integrations/components/BrandForm";
import BrandSettingsSection from "../../integrations/components/BrandSettingsSection";
import IntegrationHeader from "../../integrations/components/IntegrationHeader";
import SocialAdminSettingsPanel from "../../integrations/components/SocialAdminSettingsPanel";
import SocialAutomationRulesPanel from "../../integrations/components/SocialAutomationRulesPanel";
import SocialLanding from "../../integrations/components/SocialLanding";
import type {
  SocialAccount,
  SocialBrand,
  SocialConnectPayload,
  SocialLeadAutomationRule,
  SocialPermissionSetting,
  SocialPlatform,
  SocialTriggerType,
} from "../../integrations/types";

type Notice = { tone: "success" | "error"; message: string } | null;

type AccountDraft = {
  brandId: number;
  platform: SocialPlatform;
  accountId?: number;
  account_name: string;
  handle: string;
  page_id: string;
  access_token: string;
  refresh_token: string;
};

type RuleDraft = {
  platform: SocialPlatform;
  trigger_type: SocialTriggerType;
  action_type: "create_lead" | "create_case";
  is_active: boolean;
  assign_to_user: string;
  assign_to_team: string;
  qualification_logic_text: string;
};

const defaultAccountDraft: AccountDraft = {
  brandId: 0,
  platform: "x",
  account_name: "",
  handle: "",
  page_id: "",
  access_token: "",
  refresh_token: "",
};

const defaultRuleDraft: RuleDraft = {
  platform: "x",
  trigger_type: "mention",
  action_type: "create_lead",
  is_active: true,
  assign_to_user: "",
  assign_to_team: "",
  qualification_logic_text: '{\n  "intent": "high"\n}',
};

function parseQualificationLogic(value: string) {
  try {
    return value.trim() ? JSON.parse(value) : {};
  } catch {
    return { raw: value };
  }
}

function stringifyQualificationLogic(value: Record<string, unknown> | null | undefined) {
  return JSON.stringify(value || {}, null, 2);
}

export default function SocialIntegrationsPage() {
  const [brands, setBrands] = useState<SocialBrand[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [adminSettings, setAdminSettings] = useState<SocialPermissionSetting[]>([]);
  const [rules, setRules] = useState<SocialLeadAutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [activeTab, setActiveTab] = useState("brand");

  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<SocialBrand | null>(null);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(defaultAccountDraft);

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SocialLeadAutomationRule | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(defaultRuleDraft);

  const load = async () => {
    try {
      setLoading(true);
      const [nextBrands, nextAccounts, nextAdminSettings, nextRules] = await Promise.all([
        integrationsApi.listSocialBrands().catch(() => []),
        integrationsApi.listSocialAccounts().catch(() => []),
        integrationsApi.listSocialAdminSettings().catch(() => []),
        integrationsApi.listSocialAutomationRules().catch(() => []),
      ]);
      setBrands(nextBrands);
      setAccounts(nextAccounts);
      setAdminSettings(nextAdminSettings);
      setRules(nextRules);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const adminSetting = adminSettings[0] || null;

  const brandsWithAccounts = useMemo(
    () =>
      brands.map((brand) => ({
        ...brand,
        accounts: accounts.filter((account) => account.brand === brand.id),
      })),
    [accounts, brands]
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

  const openCreateBrand = () => {
    setEditingBrand(null);
    setBrandModalOpen(true);
  };

  const openConnectModal = (
    brand: SocialBrand,
    platform: SocialPlatform,
    account?: SocialAccount
  ) => {
    setAccountDraft({
      brandId: brand.id,
      platform,
      accountId: account?.id,
      account_name: account?.account_name || "",
      handle: account?.handle || "",
      page_id: account?.page_id || "",
      access_token: "",
      refresh_token: "",
    });
    setAccountModalOpen(true);
  };

  const openRuleModal = (rule?: SocialLeadAutomationRule) => {
    setEditingRule(rule || null);
    setRuleDraft(
      rule
        ? {
            platform: rule.platform,
            trigger_type: rule.trigger_type,
            action_type: rule.action_type,
            is_active: rule.is_active,
            assign_to_user: rule.assign_to_user ? String(rule.assign_to_user) : "",
            assign_to_team: rule.assign_to_team || "",
            qualification_logic_text: stringifyQualificationLogic(
              rule.qualification_logic
            ),
          }
        : defaultRuleDraft
    );
    setRuleModalOpen(true);
  };

  const submitAccount = async () => {
    const payload: SocialConnectPayload = {
      account_name: accountDraft.account_name,
      handle: accountDraft.handle,
      page_id: accountDraft.page_id,
      access_token: accountDraft.access_token,
      refresh_token: accountDraft.refresh_token,
    };

    if (accountDraft.accountId) {
      await runAction(
        () =>
          integrationsApi
            .updateSocialAccount(accountDraft.accountId!, {
              account_name: accountDraft.account_name,
              handle: accountDraft.handle,
              page_id: accountDraft.page_id,
            })
            .then(() =>
              integrationsApi.connectSocialAccount(accountDraft.accountId!, payload)
            ),
        "Social account updated successfully.",
        () => setAccountModalOpen(false)
      );
      return;
    }

    await runAction(
      async () => {
        const account = await integrationsApi.createSocialAccount({
          brand: accountDraft.brandId,
          platform: accountDraft.platform,
          account_name: accountDraft.account_name,
          handle: accountDraft.handle,
          page_id: accountDraft.page_id,
        });
        await integrationsApi.connectSocialAccount(account.id, payload);
      },
      "Social account connected successfully.",
      () => setAccountModalOpen(false)
    );
  };

  const submitRule = async () => {
    const payload = {
      platform: ruleDraft.platform,
      trigger_type: ruleDraft.trigger_type,
      action_type: ruleDraft.action_type,
      is_active: ruleDraft.is_active,
      assign_to_user: ruleDraft.assign_to_user ? Number(ruleDraft.assign_to_user) : null,
      assign_to_team: ruleDraft.assign_to_team || null,
      qualification_logic: parseQualificationLogic(ruleDraft.qualification_logic_text),
    };

    await runAction(
      () =>
        editingRule
          ? integrationsApi.updateSocialAutomationRule(editingRule.id, payload)
          : integrationsApi.createSocialAutomationRule(payload),
      editingRule
        ? "Automation rule updated successfully."
        : "Automation rule created successfully.",
      () => setRuleModalOpen(false)
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <IntegrationHeader
          title="Social Integrations"
          subtitle="Connect brand accounts, control social admins, and automate lead generation from social activity."
          tabs={integrationsNavTabs}
          activePath="/integrations/social"
          action={
            <button
              type="button"
              onClick={openCreateBrand}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Create Brand
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
          <div className="text-sm text-slate-500">Loading social integrations...</div>
        ) : null}

        <SocialLanding hasBrands={brands.length > 0} onGetStarted={openCreateBrand} />

        <div className="flex flex-wrap gap-2">
          {socialTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                activeTab === tab.value
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "brand" ? (
          <BrandSettingsSection
            brands={brandsWithAccounts}
            onCreateBrand={openCreateBrand}
            onEditBrand={(brand) => {
              setEditingBrand(brand);
              setBrandModalOpen(true);
            }}
            onConnectAccount={(brand, platform) =>
              openConnectModal(
                brand,
                platform,
                accounts.find(
                  (account) =>
                    account.brand === brand.id && account.platform === platform
                )
              )
            }
            onDisconnectAccount={(accountId) =>
              void runAction(
                () => integrationsApi.disconnectSocialAccount(accountId),
                "Social account disconnected successfully."
              )
            }
          />
        ) : null}

        {activeTab === "admin" ? (
          <SocialAdminSettingsPanel
            setting={adminSetting}
            onSave={(payload) =>
              void runAction(
                () =>
                  adminSetting
                    ? integrationsApi.updateSocialAdminSetting(adminSetting.id, payload)
                    : integrationsApi.createSocialAdminSetting(payload),
                "Social admin settings saved successfully."
              )
            }
          />
        ) : null}

        {activeTab === "automation" ? (
          <SocialAutomationRulesPanel
            rules={rules}
            onCreate={() => openRuleModal()}
            onEdit={(rule) => openRuleModal(rule)}
            onDelete={(rule) => {
              if (
                !window.confirm(
                  `Delete ${rule.platform} ${rule.trigger_type} automation rule?`
                )
              ) {
                return;
              }
              void runAction(
                () => integrationsApi.deleteSocialAutomationRule(rule.id),
                "Automation rule deleted successfully."
              );
            }}
          />
        ) : null}

        <CRMSectionCard title="Social Overview">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Brands</div>
              <div className="mt-2 text-2xl font-semibold">{brands.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Connected Accounts</div>
              <div className="mt-2 text-2xl font-semibold">
                {accounts.filter((account) => account.is_connected).length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Automation Rules</div>
              <div className="mt-2 text-2xl font-semibold">{rules.length}</div>
            </div>
          </div>
        </CRMSectionCard>

        <BrandForm
          open={brandModalOpen}
          initialValue={editingBrand}
          onClose={() => setBrandModalOpen(false)}
          onSubmit={(values) =>
            void runAction(
              () =>
                editingBrand
                  ? integrationsApi.updateSocialBrand(editingBrand.id, values)
                  : integrationsApi.createSocialBrand(values),
              editingBrand
                ? "Brand updated successfully."
                : "Brand created successfully.",
              () => setBrandModalOpen(false)
            )
          }
        />

        <CRMModalBase
          open={accountModalOpen}
          title={accountDraft.accountId ? "Edit Social Account" : "Connect Social Account"}
          footer={
            <>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitAccount()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Platform</span>
              <select
                value={accountDraft.platform}
                onChange={(event) =>
                  setAccountDraft((previous) => ({
                    ...previous,
                    platform: event.target.value as SocialPlatform,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {socialPlatformOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Account Name</span>
              <input
                value={accountDraft.account_name}
                onChange={(event) =>
                  setAccountDraft((previous) => ({
                    ...previous,
                    account_name: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Handle</span>
              <input
                value={accountDraft.handle}
                onChange={(event) =>
                  setAccountDraft((previous) => ({
                    ...previous,
                    handle: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="@brand"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Page ID</span>
              <input
                value={accountDraft.page_id}
                onChange={(event) =>
                  setAccountDraft((previous) => ({
                    ...previous,
                    page_id: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-slate-600">Access Token</span>
              <textarea
                rows={3}
                value={accountDraft.access_token}
                onChange={(event) =>
                  setAccountDraft((previous) => ({
                    ...previous,
                    access_token: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-slate-600">Refresh Token</span>
              <textarea
                rows={3}
                value={accountDraft.refresh_token}
                onChange={(event) =>
                  setAccountDraft((previous) => ({
                    ...previous,
                    refresh_token: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
        </CRMModalBase>

        <CRMModalBase
          open={ruleModalOpen}
          title={editingRule ? "Edit Automation Rule" : "Create Automation Rule"}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRuleModalOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRule()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Platform</span>
              <select
                value={ruleDraft.platform}
                onChange={(event) =>
                  setRuleDraft((previous) => ({
                    ...previous,
                    platform: event.target.value as SocialPlatform,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {socialPlatformOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Trigger Type</span>
              <select
                value={ruleDraft.trigger_type}
                onChange={(event) =>
                  setRuleDraft((previous) => ({
                    ...previous,
                    trigger_type: event.target.value as SocialTriggerType,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {automationTriggerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Assign To User ID</span>
              <input
                value={ruleDraft.assign_to_user}
                onChange={(event) =>
                  setRuleDraft((previous) => ({
                    ...previous,
                    assign_to_user: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Optional user id"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Assign To Team</span>
              <input
                value={ruleDraft.assign_to_team}
                onChange={(event) =>
                  setRuleDraft((previous) => ({
                    ...previous,
                    assign_to_team: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Optional team name"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                checked={ruleDraft.is_active}
                onChange={(event) =>
                  setRuleDraft((previous) => ({
                    ...previous,
                    is_active: event.target.checked,
                  }))
                }
              />
              Rule active
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-slate-600">Qualification Logic</span>
              <textarea
                rows={8}
                value={ruleDraft.qualification_logic_text}
                onChange={(event) =>
                  setRuleDraft((previous) => ({
                    ...previous,
                    qualification_logic_text: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>
        </CRMModalBase>
      </div>
    </DashboardLayout>
  );
}
