import DashboardLayout from "../components/layout/DashboardLayout";
import ModulePageLayout from "../components/crm/ModulePageLayout";

const leadColumns = [
  { key: "fullName", label: "Full Name" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "leadSource", label: "Lead Source" },
];

const leadData = [
  {
    fullName: "John Carter",
    company: "Zora",
    email: "john@zora.ai",
    phone: "9876543210",
    leadSource: "Website",
  },
  {
    fullName: "Emily Watson",
    company: "Grayson",
    email: "emily@grayson.com",
    phone: "9876501234",
    leadSource: "Campaign",
  },
];

const leadFilterSections = [
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
      "Full Name",
      "Lead Owner",
      "Company",
      "Email",
      "Phone",
      "Lead Source",
      "Lead Status",
      "Industry",
      "Annual Revenue",
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
      "Accounts",
      "Deals",
      "Cases",
      "Calls",
      "Meetings",
      "Tasks",
      "Emails",
    ],
  },
];

export default function LeadsPage() {
  return (
    <DashboardLayout>
      <ModulePageLayout
        title="Leads"
        viewName="All Leads"
        createButtonLabel="Create Lead"
        filterTitle="Filter Leads by"
        filterSections={leadFilterSections}
        columns={leadColumns}
        data={leadData}
      />
    </DashboardLayout>
  );
}