import { Navigate, Route, Routes } from "react-router-dom";
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


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp-login" element={<OtpLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/leads" element={<LeadsPage />} />
      <Route path="/leads/:id" element={<LeadDetailPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/contacts/:id" element={<ContactDetailPage />} />
      <Route path="/accounts" element={<AccountsPage />} />
      <Route path="/accounts/:id" element={<AccountDetailPage />} />
      <Route path="/deals" element={<DealsPage />} />
      <Route path="/deals/:id" element={<DealDetailPage />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
      <Route path="/leads/create" element={<CreateLeadPage />} />
      <Route path="/leads/:id/edit" element={<CreateLeadPage />} />
      <Route path="/contacts/create" element={<CreateContactPage />} />
      <Route path="/accounts/create" element={<CreateAccountPage />} />
      <Route path="/deals/create" element={<CreateDealPage />} />


      <Route path="/leads/import" element={<ImportPage />} />
      <Route path="/leads/import-notes" element={<ImportPage />} />

      <Route path="/contacts/import" element={<ImportPage />} />
      <Route path="/contacts/import-notes" element={<ImportPage />} />

      <Route path="/accounts/import" element={<ImportPage />} />
      <Route path="/accounts/import-notes" element={<ImportPage />} />

      <Route path="/deals/import" element={<ImportPage />} />
      <Route path="/deals/import-notes" element={<ImportPage />} />

      <Route path="/leads/:id" element={<LeadDetailPage />} />
      <Route path="/contacts/:id" element={<ContactDetailPage />} />
      <Route path="/accounts/:id" element={<AccountDetailPage />} />

      <Route path="/campaigns" element={<CampaignsPage />} /> 

      <Route path="/campaigns/create" element={<CreateCampaignPage />} />
      <Route path="/campaigns/import" element={<ImportPage />} />
      <Route path="/campaigns/import-notes" element={<ImportPage />} />

    </Routes>
  );
}
