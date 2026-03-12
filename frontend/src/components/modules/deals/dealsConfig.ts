import type {
  CRMColumn,
  CRMDetailSection,
  CRMModuleConfig,
  CRMRowAction,
  CRMSummaryField,
  FilterSection,
  Deal,
} from "../../../lib/shared/crmTypes";

const dealColumns: CRMColumn<Deal>[] = [
  { key: "dealName", label: "Deal Name", minWidth: "min-w-[220px]" },
  { key: "accountName", label: "Account Name" },
  { key: "dealOwner", label: "Deal Owner" },
  { key: "stage", label: "Stage" },
  { key: "amount", label: "Amount" },
  { key: "type", label: "Deal Type" },
  { key: "closingDate", label: "Last Updated" },
];

export const dealFilterSections: FilterSection[] = [
  {
    title: "System Defined Filters",
    items: ["My Deals", "Won Deals", "Lost Deals", "High Priority"],
  },
  {
    title: "Filter By Fields",
    items: ["Deal Name", "Account Name", "Deal Owner", "Stage", "Type"],
  },
  {
    title: "Filter By Related Modules",
    items: ["Contacts", "Accounts", "Activities", "Notes"],
  },
];

const dealRowActions: CRMRowAction[] = [
  { key: "edit", label: "Edit" },
  { key: "send-email", label: "Send Email" },
  { key: "create-task", label: "Create Task" },
  { key: "add-tags", label: "Add Tags" },
  { key: "delete", label: "Delete", destructive: true },
  { key: "copy-url", label: "Copy URL" },
];

const dealSummaryFields: CRMSummaryField<Deal>[] = [
  { key: "stage", label: "Stage" },
  { key: "amount", label: "Amount" },
  { key: "dealOwner", label: "Deal Owner" },
  { key: "closingDate", label: "Last Updated" },
];

const dealDetailSections: CRMDetailSection<Deal>[] = [
  {
    id: "deal-summary",
    title: "Deal Summary",
    type: "summary",
    fields: [
      { key: "dealName", label: "Deal Name" },
      { key: "accountName", label: "Account" },
      { key: "type", label: "Deal Type" },
    ],
  },
  {
    id: "deal-info",
    title: "Deal Information",
    type: "info",
    fields: [
      { key: "stage", label: "Stage" },
      { key: "amount", label: "Amount" },
      { key: "dealOwner", label: "Deal Owner" },
    ],
  },
];

export const dealModuleConfig: CRMModuleConfig<Deal> = {
  module: "deals",
  title: "Deals",
  subtitle: "All Deals",
  baseRoute: "/deals",
  nameKey: "dealName",
  subtitleKey: "accountName",
  columns: dealColumns,
  summaryFields: dealSummaryFields,
  detailSections: dealDetailSections,
  relatedListItems: ["Contacts", "Accounts", "Activities", "Notes"],
  headerActions: ["Add Tags", "Send Email", "Create Task", "More"],
  rowActions: dealRowActions,
  filterSections: dealFilterSections,
};
