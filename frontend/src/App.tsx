import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayoutRoute } from "./components/layout/DashboardLayout";

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
import CreateTaskPage from "./pages/activities/tasks/CreateTaskPage";
import TaskDetailPage from "./pages/activities/tasks/TaskDetailPage";
import TasksPage from "./pages/activities/tasks";
import MeetingsPage from "./pages/activities/meetings";
import CreateMeetingPage from "./pages/activities/meetings/CreateMeetingPage";
import MeetingDetailPage from "./pages/activities/meetings/MeetingDetailPage";
import CallsPage from "./pages/activities/calls";
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import CreateProjectPage from "./pages/projects/CreateProjectPage";
import EmployeeProfilePage from "./pages/team/EmployeeProfilePage";
import UserCreatePage from "./pages/team/UserCreatePage";

export default function App() {
  return (
    <Routes>
      {/* Public routes — no layout */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp-login" element={<OtpLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected routes — persistent layout (Sidebar + Topbar stay mounted) */}
      <Route element={<DashboardLayoutRoute />}>
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
        <Route path="/meetings/:id" element={<MeetingDetailPage />} />

        <Route path="/calls" element={<CallsPage />} />

        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/create" element={<CreateCampaignPage />} />
        <Route path="/campaigns/import" element={<ImportPage />} />
        <Route path="/campaigns/import-notes" element={<ImportPage />} />

        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/create" element={<CreateProjectPage />} />
        <Route path="/projects/:id/edit" element={<CreateProjectPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />

        <Route path="/team/user/:id" element={<EmployeeProfilePage />} />
        <Route path="/team/users/create" element={<UserCreatePage />} />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
}
