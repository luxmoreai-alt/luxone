import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DashboardLayoutRoute } from "./components/layout/DashboardLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AccountDetailPage from "./pages/accounts/AccountDetailPage";
import AccountsPage from "./pages/accounts/AccountsPage";
import CallsPage from "./pages/activities/calls";
import CreateMeetingPage from "./pages/activities/meetings/CreateMeetingPage";
import MeetingDetailPage from "./pages/activities/meetings/MeetingDetailPage";
import MeetingsPage from "./pages/activities/meetings";
import CreateTaskPage from "./pages/activities/tasks/CreateTaskPage";
import TaskDetailPage from "./pages/activities/tasks/TaskDetailPage";
import TasksPage from "./pages/activities/tasks";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
import DocumentsPage from "./pages/documents/DocumentsPage";
import DocumentDetailPage from "./pages/documents/DocumentDetailPage";
import CampaignDetailPage from "./pages/campaigns/CampaignDetailPage";
import CreateCampaignPage from "./pages/campaigns/CreateCampaignPage";
import PublicCampaignFormPage from "./pages/campaigns/PublicCampaignFormPage";
import ContactDetailPage from "./pages/contacts/ContactDetailPage";
import ContactsPage from "./pages/contacts/ContactsPage";
import ImportPage from "./pages/crm/ImportPage";
import DealDetailPage from "./pages/deals/DealDetailPage";
import DealsPage from "./pages/deals/DealsPage";
import CreateAccountPage from "./pages/accounts/CreateAccountPage";
import CreateContactPage from "./pages/contacts/CreateContactPage";
import CreateDealPage from "./pages/deals/CreateDealPage";
import CreateLeadPage from "./pages/leads/CreateLeadPage";
import LeadDetailPage from "./pages/leads/LeadDetailPage";
import LeadsPage from "./pages/leads/LeadsPage";
import EmployeeProfilePage from "./pages/team/EmployeeProfilePage";
import UserCreatePage from "./pages/team/UserCreatePage";
import UsersListPage from "./pages/team/UsersListPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import CreateProjectPage from "./pages/projects/CreateProjectPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import InventoryListRoute from "./pages/inventory/InventoryListRoute";
import InventoryFormRoute from "./pages/inventory/InventoryFormRoute";
import InventoryDetailRoute from "./pages/inventory/InventoryDetailRoute";
import PriceBookImportPage from "./pages/inventory/PriceBookImportPage";
import CasesPage from "./pages/support/CasesPage";
import CaseFormRoute from "./pages/support/CaseFormRoute";
import CaseDetailRoute from "./pages/support/CaseDetailRoute";
import CaseImportRoute from "./pages/support/CaseImportRoute";
import SolutionsPage from "./pages/support/SolutionsPage";
import SolutionFormRoute from "./pages/support/SolutionFormRoute";
import SolutionDetailRoute from "./pages/support/SolutionDetailRoute";
import SolutionImportRoute from "./pages/support/SolutionImportRoute";
import ServicesPromoRoute from "./pages/servicesModule/ServicesPromoRoute";
import BusinessHoursRoute from "./pages/servicesModule/BusinessHoursRoute";
import ServicesCatalogPage from "./pages/servicesModule/ServicesCatalogPage";
import ServiceFormRoute from "./pages/servicesModule/ServiceFormRoute";
import ServiceDetailRoute from "./pages/servicesModule/ServiceDetailRoute";
import AppointmentsPage from "./pages/servicesModule/AppointmentsPage";
import AppointmentFormRoute from "./pages/servicesModule/AppointmentFormRoute";
import AppointmentDetailRoute from "./pages/servicesModule/AppointmentDetailRoute";
import JobSheetFormRoute from "./pages/servicesModule/JobSheetFormRoute";
import JobSheetDetailRoute from "./pages/servicesModule/JobSheetDetailRoute";
import CompanyDetailsRoute from "./pages/servicesModule/CompanyDetailsRoute";
import DomainMappingRoute from "./pages/servicesModule/DomainMappingRoute";
import FiscalYearRoute from "./pages/servicesModule/FiscalYearRoute";
import HolidaysRoute from "./pages/servicesModule/HolidaysRoute";
import IntegrationsPage from "./pages/integrations/IntegrationsPage";
import EmailIntegrationsPage from "./pages/integrations/EmailIntegrationsPage";
import SocialIntegrationsPage from "./pages/integrations/SocialIntegrationsPage";
import VisitorTrackingPage from "./pages/integrations/VisitorTrackingPage";

function hasSession() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("isLoggedIn") === "true";
}

function getMustChangePassword() {
  try {
    const raw = localStorage.getItem("loggedInUser");
    if (!raw) return false;
    const user = JSON.parse(raw) as { must_change_password?: boolean };
    return user.must_change_password === true;
  } catch {
    return false;
  }
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(hasSession());

  useEffect(() => {
    const sync = () => setAuthenticated(hasSession());
    window.addEventListener("storage", sync);
    window.addEventListener("auth:login", sync as EventListener);
    window.addEventListener("auth:logout", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth:login", sync as EventListener);
      window.removeEventListener("auth:logout", sync as EventListener);
    };
  }, []);

  // Silently refresh allowed_modules from backend so sidebar stays in sync
  // without requiring a re-login after role/department changes.
  useEffect(() => {
    if (!hasSession()) return;
    const token = localStorage.getItem("accessToken");
    const tenantDb = localStorage.getItem("tenantDb");
    if (!token) return;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (tenantDb) headers["X-Tenant-DB"] = tenantDb;

    fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"}/auth/my-modules/`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { allowed_modules?: string[]; department?: string } | null) => {
        if (!data?.allowed_modules) return;
        const raw = localStorage.getItem("loggedInUser");
        if (!raw) return;
        const storedUser = JSON.parse(raw) as Record<string, unknown>;
        const prevModules = JSON.stringify(storedUser.allowed_modules);
        const prevDept = storedUser.department;
        storedUser.allowed_modules = data.allowed_modules;
        if (data.department !== undefined) storedUser.department = data.department;
        localStorage.setItem("loggedInUser", JSON.stringify(storedUser));
        // Only trigger re-render if something changed
        if (prevModules !== JSON.stringify(data.allowed_modules) || prevDept !== data.department) {
          window.dispatchEvent(new Event("auth:modules-updated"));
        }
      })
      .catch(() => {});
  }, []);

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

/**
 * Redirects to /change-password if the logged-in user has must_change_password=true.
 * Placed inside RequireAuth so it only runs for authenticated users.
 */
function MustChangePasswordGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (getMustChangePassword() && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* First-login password change — auth required but no dashboard shell */}
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />

      {/* Public campaign form — no auth required */}
      <Route path="/public/campaigns/:campaignId/form" element={<PublicCampaignFormPage />} />

      <Route
        element={
          <RequireAuth>
            <MustChangePasswordGuard>
              <DashboardLayoutRoute />
            </MustChangePasswordGuard>
          </RequireAuth>
        }
      >
        <Route path="/home" element={<HomePage />} />

        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/create" element={<CreateLeadPage />} />
        <Route path="/leads/:id/edit" element={<CreateLeadPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/leads/import" element={<ImportPage />} />
        <Route path="/leads/import-notes" element={<ImportPage />} />

        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/create" element={<CreateContactPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/contacts/import" element={<ImportPage />} />
        <Route path="/contacts/import-notes" element={<ImportPage />} />

        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/accounts/create" element={<CreateAccountPage />} />
        <Route path="/accounts/:id" element={<AccountDetailPage />} />
        <Route path="/accounts/import" element={<ImportPage />} />
        <Route path="/accounts/import-notes" element={<ImportPage />} />

        <Route path="/deals" element={<DealsPage />} />
        <Route path="/deals/create" element={<CreateDealPage />} />
        <Route path="/deals/:id" element={<DealDetailPage />} />
        <Route path="/deals/import" element={<ImportPage />} />
        <Route path="/deals/import-notes" element={<ImportPage />} />

        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/create" element={<CreateTaskPage />} />
        <Route path="/tasks/:id/edit" element={<CreateTaskPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />

        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/meetings/create" element={<CreateMeetingPage />} />
        <Route path="/meetings/:id/edit" element={<CreateMeetingPage />} />
        <Route path="/meetings/:id" element={<MeetingDetailPage />} />

        <Route path="/calls" element={<CallsPage />} />

        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/create" element={<CreateCampaignPage />} />
        <Route path="/campaigns/:id/edit" element={<CreateCampaignPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/campaigns/import" element={<ImportPage />} />
        <Route path="/campaigns/import-notes" element={<ImportPage />} />

        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />

        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/create" element={<CreateProjectPage />} />
        <Route path="/projects/:id/edit" element={<CreateProjectPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />

        <Route path="/team" element={<UsersListPage />} />
        <Route path="/team/user/:id" element={<EmployeeProfilePage />} />
        <Route path="/team/users/create" element={<UserCreatePage />} />

        <Route path="/support/cases" element={<CasesPage />} />
        <Route path="/support/cases/create" element={<CaseFormRoute />} />
        <Route path="/support/cases/:id" element={<CaseDetailRoute />} />
        <Route path="/support/cases/:id/edit" element={<CaseFormRoute />} />
        <Route path="/support/cases/import" element={<CaseImportRoute />} />

        <Route path="/support/solutions" element={<SolutionsPage />} />
        <Route path="/support/solutions/create" element={<SolutionFormRoute />} />
        <Route path="/support/solutions/:id" element={<SolutionDetailRoute />} />
        <Route path="/support/solutions/:id/edit" element={<SolutionFormRoute />} />
        <Route path="/support/solutions/import" element={<SolutionImportRoute />} />

        <Route path="/services/promo" element={<ServicesPromoRoute />} />
        <Route path="/services/business-hours" element={<BusinessHoursRoute />} />
        <Route path="/services/business-hours/new" element={<BusinessHoursRoute />} />
        <Route path="/services/catalog" element={<ServicesCatalogPage />} />
        <Route path="/services/catalog/create" element={<ServiceFormRoute />} />
        <Route path="/services/catalog/:id" element={<ServiceDetailRoute />} />
        <Route path="/services/catalog/:id/edit" element={<ServiceFormRoute />} />
        <Route path="/services/appointments" element={<AppointmentsPage />} />
        <Route path="/services/appointments/create" element={<AppointmentFormRoute />} />
        <Route path="/services/appointments/:id" element={<AppointmentDetailRoute />} />
        <Route path="/services/appointments/:id/edit" element={<AppointmentFormRoute />} />
        <Route path="/services/job-sheets/create" element={<JobSheetFormRoute />} />
        <Route path="/services/job-sheets/:id" element={<JobSheetDetailRoute />} />
        <Route path="/services/job-sheets/:id/edit" element={<JobSheetFormRoute />} />
        <Route path="/services/settings/company-details" element={<CompanyDetailsRoute />} />
        <Route path="/services/settings/domain-mapping" element={<DomainMappingRoute />} />
        <Route path="/services/settings/fiscal-year" element={<FiscalYearRoute />} />
        <Route path="/services/settings/holidays" element={<HolidaysRoute />} />

        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/integrations/email" element={<EmailIntegrationsPage />} />
        <Route path="/integrations/social" element={<SocialIntegrationsPage />} />
        <Route path="/integrations/visitors" element={<VisitorTrackingPage />} />

        <Route path="/vendors" element={<InventoryListRoute moduleKey="vendors" />} />
        <Route path="/vendors/create" element={<InventoryFormRoute moduleKey="vendors" />} />
        <Route path="/vendors/:id" element={<InventoryDetailRoute moduleKey="vendors" />} />

        <Route path="/products" element={<InventoryListRoute moduleKey="products" />} />
        <Route path="/products/create" element={<InventoryFormRoute moduleKey="products" />} />
        <Route path="/products/:id" element={<InventoryDetailRoute moduleKey="products" />} />

        <Route path="/price-books" element={<InventoryListRoute moduleKey="price-books" />} />
        <Route path="/price-books/create" element={<InventoryFormRoute moduleKey="price-books" />} />
        <Route path="/price-books/import" element={<PriceBookImportPage />} />
        <Route path="/price-books/:id" element={<InventoryDetailRoute moduleKey="price-books" />} />

        <Route path="/quotes" element={<InventoryListRoute moduleKey="quotes" />} />
        <Route path="/quotes/create" element={<InventoryFormRoute moduleKey="quotes" />} />
        <Route path="/quotes/:id" element={<InventoryDetailRoute moduleKey="quotes" />} />

        <Route path="/sales-orders" element={<InventoryListRoute moduleKey="sales-orders" />} />
        <Route path="/sales-orders/create" element={<InventoryFormRoute moduleKey="sales-orders" />} />
        <Route path="/sales-orders/:id" element={<InventoryDetailRoute moduleKey="sales-orders" />} />

        <Route path="/purchase-orders" element={<InventoryListRoute moduleKey="purchase-orders" />} />
        <Route path="/purchase-orders/create" element={<InventoryFormRoute moduleKey="purchase-orders" />} />
        <Route path="/purchase-orders/:id" element={<InventoryDetailRoute moduleKey="purchase-orders" />} />

        <Route path="/invoices" element={<InventoryListRoute moduleKey="invoices" />} />
        <Route path="/invoices/create" element={<InventoryFormRoute moduleKey="invoices" />} />
        <Route path="/invoices/:id" element={<InventoryDetailRoute moduleKey="invoices" />} />

        <Route path="/configurator" element={<InventoryListRoute moduleKey="configurator" />} />
        <Route path="/configurator/create" element={<InventoryFormRoute moduleKey="configurator" />} />
        <Route path="/configurator/:id" element={<InventoryDetailRoute moduleKey="configurator" />} />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
}
