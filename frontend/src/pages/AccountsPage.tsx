import DashboardLayout from "../components/layout/DashboardLayout";
import ModulePageLayout from "../components/crm/ModulePageLayout";

const accountColumns = [
  { key: "accountName", label: "Account Name" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "owner", label: "Owner" },
];

const accountData = [
  {
    accountName: "Zora",
    website: "www.zora.ai",
    phone: "9876543210",
    owner: "Lavanya",
  },
  {
    accountName: "Grayson",
    website: "www.grayson.com",
    phone: "9876512345",
    owner: "Admin",
  },
];

const accountFilterSections = [
  {
    title: "System Defined Filters",
    items: [
      "Touched Records",
      "Untouched Records",
      "Record Action",
      "Locked",
    ],
  },
  {
    title: "Filter By Fields",
    items: [
      "Account Name",
      "Account Owner",
      "Account Type",
      "Industry",
      "Annual Revenue",
      "Phone",
      "Website",
      "Parent Account",
      "Rating",
      "Created Time",
      "Modified Time",
      "Last Activity Time",
      "Tag",
    ],
  },
  {
    title: "Filter By Related Modules",
    items: [
      "Contacts",
      "Deals",
      "Cases",
      "Emails",
      "Invoices",
      "Quotes",
      "Sales Orders",
    ],
  },
];

export default function AccountsPage() {
  return (
    <DashboardLayout>
      <ModulePageLayout
        title="Accounts"
        viewName="All Accounts"
        createButtonLabel="Create Account"
        filterTitle="Filter Accounts by"
        filterSections={accountFilterSections}
        columns={accountColumns}
        data={accountData}
      />
    </DashboardLayout>
  );
}