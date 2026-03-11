import DashboardLayout from "../components/layout/DashboardLayout";
import ModulePageLayout from "../components/crm/ModulePageLayout";

const dealColumns = [
  { key: "dealName", label: "Deal Name" },
  { key: "accountName", label: "Account Name" },
  { key: "amount", label: "Amount" },
  { key: "stage", label: "Stage" },
];

const dealData = [
  {
    dealName: "CRM Implementation",
    accountName: "Zora",
    amount: "₹50,000",
    stage: "Proposal",
  },
  {
    dealName: "Website Revamp",
    accountName: "Grayson",
    amount: "₹85,000",
    stage: "Negotiation",
  },
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
  return (
    <DashboardLayout>
      <ModulePageLayout
        title="Deals"
        viewName="All Deals"
        createButtonLabel="Create Deal"
        filterTitle="Filter Deals by"
        filterSections={dealFilterSections}
        columns={dealColumns}
        data={dealData}
      />
    </DashboardLayout>
  );
}