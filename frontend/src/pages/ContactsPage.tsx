import DashboardLayout from "../components/layout/DashboardLayout";
import ModulePageLayout from "../components/crm/ModulePageLayout";

const contactColumns = [
  { key: "fullName", label: "Full Name" },
  { key: "accountName", label: "Account Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

const contactData = [
  {
    fullName: "John Carter",
    accountName: "Zora",
    email: "john@zora.ai",
    phone: "9876543210",
  },
  {
    fullName: "Emily Watson",
    accountName: "Grayson",
    email: "emily@grayson.com",
    phone: "9876501234",
  },
];

const contactFilterSections = [
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
      "Contact Owner",
      "Account Name",
      "Email",
      "Phone",
      "Mobile",
      "Contact Source",
      "Department",
      "Title",
      "Created Time",
      "Modified Time",
      "Last Activity Time",
      "Tag",
    ],
  },
  {
    title: "Filter By Related Modules",
    items: [
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

export default function ContactsPage() {
  return (
    <DashboardLayout>
      <ModulePageLayout
        title="Contacts"
        viewName="All Contacts"
        createButtonLabel="Create Contact"
        filterTitle="Filter Contacts by"
        filterSections={contactFilterSections}
        columns={contactColumns}
        data={contactData}
      />
    </DashboardLayout>
  );
}