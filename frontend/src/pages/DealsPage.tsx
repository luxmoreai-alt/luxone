import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import ModulePageLayout from "../components/crm/ModulePageLayout";
import { fetchDeals } from "../api/crm";

const dealColumns = [
  { key: "dealName", label: "Deal Name" },
  { key: "accountName", label: "Account Name" },
  { key: "amount", label: "Amount" },
  { key: "stage", label: "Stage" },
];

const dealFilterSections = [
  {
    title: "System Defined Filters",
    items: [
      "Touched Records",
      "Untouched Records",
      "Record Action",
      "Locked",
      "Latest Email Status",
      "Activities",
    ],
  },
  {
    title: "Filter By Fields",
    items: [
      "Deal Name",
      "Deal Owner",
      "Account Name",
      "Contact Name",
      "Amount",
      "Stage",
      "Type",
      "Lead Source",
      "Closing Date",
      "Probability (%)",
      "Created Time",
      "Modified Time",
      "Last Activity Time",
      "Tag",
    ],
  },
  {
    title: "Filter By Related Modules",
    items: [
      "Calls",
      "Meetings",
      "Tasks",
      "Emails",
      "Quotes",
      "Invoices",
      "Sales Orders",
      "Contacts",
      "Accounts",
    ],
  },
];

export default function DealsPage() {
  const [dealRows, setDealRows] = useState<Array<Record<string, string>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const deals = await fetchDeals();
        setDealRows(
          deals.map((item) => ({
            dealName: item.name,
            accountName: item.account_name || "-",
            amount: item.value ? `Rs ${Number(item.value).toLocaleString()}` : "Rs 0",
            stage: item.stage,
          }))
        );
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load deals");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <DashboardLayout>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div>
      ) : (
        <ModulePageLayout
          title="Deals"
          viewName="All Deals"
          createButtonLabel="Create Deal"
          filterTitle="Filter Deals by"
          filterSections={dealFilterSections}
          columns={dealColumns}
          data={loading ? [] : dealRows}
        />
      )}
    </DashboardLayout>
  );
}
