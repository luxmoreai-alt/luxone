import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OtpLoginPage from "./pages/OtpLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LeadsPage from "./pages/leads/LeadsPage";
import LeadDetailPage from "./pages/leads/LeadDetailPage";
import ContactsPage from "./pages/contacts/ContactsPage";
import ContactDetailPage from "./pages/contacts/ContactDetailPage";
import AccountsPage from "./pages/accounts/AccountsPage";
import AccountDetailPage from "./pages/accounts/AccountDetailPage";
import DealsPage from "./pages/deals/DealsPage";
import DealDetailPage from "./pages/deals/DealDetailPage";
import CreateLeadPage from "./pages/leads/CreateLeadPage";
import CreateContactPage from "./pages/contacts/CreateContactPage";
import CreateAccountPage from "./pages/accounts/CreateAccountPage";
import CreateDealPage from "./pages/deals/CreateDealPage";
import ImportPage from "./pages/crm/ImportPage";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
import CreateCampaignPage from "./pages/campaigns/CreateCampaignPage";
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
import EmailIntegrationsPage from "./pages/integrations/EmailIntegrationsPage";
import IntegrationsPage from "./pages/integrations/IntegrationsPage";
import SocialIntegrationsPage from "./pages/integrations/SocialIntegrationsPage";
import VisitorTrackingPage from "./pages/integrations/VisitorTrackingPage";

function hasSession() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("accessToken") && localStorage.getItem("tenantDb"));
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(hasSession());

  useEffect(() => {
    const sync = () => setAuthenticated(hasSession());
    window.addEventListener("storage", sync);
    window.addEventListener("auth:logout", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth:logout", sync as EventListener);
    };
  }, []);

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp-login" element={<OtpLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route path="/home" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/leads" element={<RequireAuth><LeadsPage /></RequireAuth>} />
      <Route path="/leads/create" element={<RequireAuth><CreateLeadPage /></RequireAuth>} />
      <Route path="/leads/:id/edit" element={<RequireAuth><CreateLeadPage /></RequireAuth>} />
      <Route path="/leads/:id" element={<RequireAuth><LeadDetailPage /></RequireAuth>} />

      <Route path="/contacts" element={<RequireAuth><ContactsPage /></RequireAuth>} />
      <Route path="/contacts/create" element={<RequireAuth><CreateContactPage /></RequireAuth>} />
      <Route path="/contacts/:id" element={<RequireAuth><ContactDetailPage /></RequireAuth>} />

      <Route path="/accounts" element={<RequireAuth><AccountsPage /></RequireAuth>} />
      <Route path="/accounts/create" element={<RequireAuth><CreateAccountPage /></RequireAuth>} />
      <Route path="/accounts/:id" element={<RequireAuth><AccountDetailPage /></RequireAuth>} />

      <Route path="/deals" element={<RequireAuth><DealsPage /></RequireAuth>} />
      <Route path="/deals/create" element={<RequireAuth><CreateDealPage /></RequireAuth>} />
      <Route path="/deals/:id" element={<RequireAuth><DealDetailPage /></RequireAuth>} />

      <Route path="/leads/import" element={<RequireAuth><ImportPage /></RequireAuth>} />
      <Route path="/leads/import-notes" element={<RequireAuth><ImportPage /></RequireAuth>} />
      <Route path="/contacts/import" element={<RequireAuth><ImportPage /></RequireAuth>} />
      <Route path="/contacts/import-notes" element={<RequireAuth><ImportPage /></RequireAuth>} />
      <Route path="/accounts/import" element={<RequireAuth><ImportPage /></RequireAuth>} />
      <Route path="/accounts/import-notes" element={<RequireAuth><ImportPage /></RequireAuth>} />
      <Route path="/deals/import" element={<RequireAuth><ImportPage /></RequireAuth>} />
      <Route path="/deals/import-notes" element={<RequireAuth><ImportPage /></RequireAuth>} />

      <Route path="/campaigns" element={<RequireAuth><CampaignsPage /></RequireAuth>} />
      <Route path="/campaigns/create" element={<RequireAuth><CreateCampaignPage /></RequireAuth>} />
      <Route path="/campaigns/import" element={<RequireAuth><ImportPage /></RequireAuth>} />
      <Route path="/campaigns/import-notes" element={<RequireAuth><ImportPage /></RequireAuth>} />

      <Route path="/support/cases" element={<RequireAuth><CasesPage /></RequireAuth>} />
      <Route path="/support/cases/create" element={<RequireAuth><CaseFormRoute /></RequireAuth>} />
      <Route path="/support/cases/:id" element={<RequireAuth><CaseDetailRoute /></RequireAuth>} />
      <Route path="/support/cases/:id/edit" element={<RequireAuth><CaseFormRoute /></RequireAuth>} />
      <Route path="/support/cases/import" element={<RequireAuth><CaseImportRoute /></RequireAuth>} />

      <Route path="/support/solutions" element={<RequireAuth><SolutionsPage /></RequireAuth>} />
      <Route path="/support/solutions/create" element={<RequireAuth><SolutionFormRoute /></RequireAuth>} />
      <Route path="/support/solutions/:id" element={<RequireAuth><SolutionDetailRoute /></RequireAuth>} />
      <Route path="/support/solutions/:id/edit" element={<RequireAuth><SolutionFormRoute /></RequireAuth>} />
      <Route path="/support/solutions/import" element={<RequireAuth><SolutionImportRoute /></RequireAuth>} />

      <Route path="/services/promo" element={<RequireAuth><ServicesPromoRoute /></RequireAuth>} />
      <Route path="/services/business-hours" element={<RequireAuth><BusinessHoursRoute /></RequireAuth>} />
      <Route path="/services/business-hours/new" element={<RequireAuth><BusinessHoursRoute /></RequireAuth>} />
      <Route path="/services/catalog" element={<RequireAuth><ServicesCatalogPage /></RequireAuth>} />
      <Route path="/services/catalog/create" element={<RequireAuth><ServiceFormRoute /></RequireAuth>} />
      <Route path="/services/catalog/:id" element={<RequireAuth><ServiceDetailRoute /></RequireAuth>} />
      <Route path="/services/catalog/:id/edit" element={<RequireAuth><ServiceFormRoute /></RequireAuth>} />
      <Route path="/services/appointments" element={<RequireAuth><AppointmentsPage /></RequireAuth>} />
      <Route path="/services/appointments/create" element={<RequireAuth><AppointmentFormRoute /></RequireAuth>} />
      <Route path="/services/appointments/:id" element={<RequireAuth><AppointmentDetailRoute /></RequireAuth>} />
      <Route path="/services/appointments/:id/edit" element={<RequireAuth><AppointmentFormRoute /></RequireAuth>} />
      <Route path="/services/job-sheets/create" element={<RequireAuth><JobSheetFormRoute /></RequireAuth>} />
      <Route path="/services/job-sheets/:id" element={<RequireAuth><JobSheetDetailRoute /></RequireAuth>} />
      <Route path="/services/job-sheets/:id/edit" element={<RequireAuth><JobSheetFormRoute /></RequireAuth>} />
      <Route path="/services/settings/company-details" element={<RequireAuth><CompanyDetailsRoute /></RequireAuth>} />
      <Route path="/services/settings/domain-mapping" element={<RequireAuth><DomainMappingRoute /></RequireAuth>} />
      <Route path="/services/settings/fiscal-year" element={<RequireAuth><FiscalYearRoute /></RequireAuth>} />
      <Route path="/services/settings/holidays" element={<RequireAuth><HolidaysRoute /></RequireAuth>} />

      <Route path="/integrations" element={<RequireAuth><IntegrationsPage /></RequireAuth>} />
      <Route path="/integrations/email" element={<RequireAuth><EmailIntegrationsPage /></RequireAuth>} />
      <Route path="/integrations/social" element={<RequireAuth><SocialIntegrationsPage /></RequireAuth>} />
      <Route path="/integrations/visitors" element={<RequireAuth><VisitorTrackingPage /></RequireAuth>} />

      <Route path="/vendors" element={<RequireAuth><InventoryListRoute moduleKey="vendors" /></RequireAuth>} />
      <Route path="/vendors/create" element={<RequireAuth><InventoryFormRoute moduleKey="vendors" /></RequireAuth>} />
      <Route path="/vendors/:id" element={<RequireAuth><InventoryDetailRoute moduleKey="vendors" /></RequireAuth>} />

      <Route path="/products" element={<RequireAuth><InventoryListRoute moduleKey="products" /></RequireAuth>} />
      <Route path="/products/create" element={<RequireAuth><InventoryFormRoute moduleKey="products" /></RequireAuth>} />
      <Route path="/products/:id" element={<RequireAuth><InventoryDetailRoute moduleKey="products" /></RequireAuth>} />

      <Route path="/price-books" element={<RequireAuth><InventoryListRoute moduleKey="price-books" /></RequireAuth>} />
      <Route path="/price-books/create" element={<RequireAuth><InventoryFormRoute moduleKey="price-books" /></RequireAuth>} />
      <Route path="/price-books/import" element={<RequireAuth><PriceBookImportPage /></RequireAuth>} />
      <Route path="/price-books/:id" element={<RequireAuth><InventoryDetailRoute moduleKey="price-books" /></RequireAuth>} />

      <Route path="/quotes" element={<RequireAuth><InventoryListRoute moduleKey="quotes" /></RequireAuth>} />
      <Route path="/quotes/create" element={<RequireAuth><InventoryFormRoute moduleKey="quotes" /></RequireAuth>} />
      <Route path="/quotes/:id" element={<RequireAuth><InventoryDetailRoute moduleKey="quotes" /></RequireAuth>} />

      <Route path="/sales-orders" element={<RequireAuth><InventoryListRoute moduleKey="sales-orders" /></RequireAuth>} />
      <Route path="/sales-orders/create" element={<RequireAuth><InventoryFormRoute moduleKey="sales-orders" /></RequireAuth>} />
      <Route path="/sales-orders/:id" element={<RequireAuth><InventoryDetailRoute moduleKey="sales-orders" /></RequireAuth>} />

      <Route path="/purchase-orders" element={<RequireAuth><InventoryListRoute moduleKey="purchase-orders" /></RequireAuth>} />
      <Route path="/purchase-orders/create" element={<RequireAuth><InventoryFormRoute moduleKey="purchase-orders" /></RequireAuth>} />
      <Route path="/purchase-orders/:id" element={<RequireAuth><InventoryDetailRoute moduleKey="purchase-orders" /></RequireAuth>} />

      <Route path="/invoices" element={<RequireAuth><InventoryListRoute moduleKey="invoices" /></RequireAuth>} />
      <Route path="/invoices/create" element={<RequireAuth><InventoryFormRoute moduleKey="invoices" /></RequireAuth>} />
      <Route path="/invoices/:id" element={<RequireAuth><InventoryDetailRoute moduleKey="invoices" /></RequireAuth>} />

      <Route path="/configurator" element={<RequireAuth><InventoryListRoute moduleKey="configurator" /></RequireAuth>} />
      <Route path="/configurator/create" element={<RequireAuth><InventoryFormRoute moduleKey="configurator" /></RequireAuth>} />
      <Route path="/configurator/:id" element={<RequireAuth><InventoryDetailRoute moduleKey="configurator" /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
