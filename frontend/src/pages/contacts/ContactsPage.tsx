import { useEffect, useState } from "react";
import CRMModuleListPage from "../crm/CRMModuleListPage";
import { contactModuleConfig, contactsMockList } from "../../components/modules/contacts/contactsMockData";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { fetchContacts } from "../../api/crm";
import { mapContact } from "../../lib/shared/crmMappers";
import type { ContactRecord } from "../../lib/shared/crmTypes";

export default function ContactsPage() {
  const [rows, setRows] = useState<ContactRecord[]>(contactsMockList);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const contacts = await fetchContacts();
        setRows(contacts.map(mapContact));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contacts");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <DashboardLayout><div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading contacts...</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div></DashboardLayout>;
  }

  return (
    <CRMModuleListPage
      config={contactModuleConfig}
      rows={rows}
      showNotes={true}
      showActivity={false}
    />
  );
}
