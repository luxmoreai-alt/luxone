import { useEffect, useState } from "react";
import CRMModuleListPage from "../crm/CRMModuleListPage";
import { contactModuleConfig } from "../../components/modules/contacts/contactsMockData";
import { deleteContact, getContacts } from "../../lib/api/contactsApi";
import type { ContactRecord } from "../../lib/shared/crmTypes";
import FilterSidebar from "../../components/crm/FilterSidebar";

export default function ContactsPage() {
  const [rows, setRows] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getContacts();
        setRows(data);
      } catch (err) {
        console.error("Failed to load contacts:", err);
        setError(err instanceof Error ? err.message : "Unable to load contacts");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading contacts...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-rose-600">
        Unable to load contacts: {error}
      </div>
    );
  }

  const handleDeleteRow = async (id: string) => {
    await deleteContact(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <>
      <CRMModuleListPage
        config={contactModuleConfig}
        rows={rows}
        showNotes={true}
        showActivity={false}
        onDeleteRow={handleDeleteRow}
      />

      {/* Example usage, update filterTitle/filterSections as needed */}
      <FilterSidebar
        title="Contacts Filters"
        sections={[]}
        onApply={() => {}}
        onClear={() => {}}
      />
    </>
  );
}