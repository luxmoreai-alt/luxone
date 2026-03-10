import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import OtpLoginPage from "./pages/OtpLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LeadsPage from "./pages/leads/LeadsPage";
import LeadDetailPage from "./pages/leads/LeadDetailPage";
import ContactsPage from "./pages/contacts/ContactsPage";
import ContactDetailPage from "./pages/contacts/ContactDetailPage";
import AccountsPage from "./pages/accounts/AccountsPage";
import AccountDetailPage from "./pages/accounts/AccountDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/otp-login" element={<OtpLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/leads" element={<LeadsPage />} />
      <Route path="/leads/:id" element={<LeadDetailPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/contacts/:id" element={<ContactDetailPage />} />
      <Route path="/accounts" element={<AccountsPage />} />
      <Route path="/accounts/:id" element={<AccountDetailPage />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}