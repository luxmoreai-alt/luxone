import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import LeadsPage from "./pages/LeadsPage";
import ContactsPage from "./pages/ContactsPage";
import AccountsPage from "./pages/AccountsPage";
import DealsPage from "./pages/DealsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/leads" element={<LeadsPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/accounts" element={<AccountsPage />} />
      <Route path="/deals" element={<DealsPage />} />
    </Routes>
  );
}