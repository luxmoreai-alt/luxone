export type CRMModule = "leads" | "contacts" | "accounts";

export type LeadRecord = {
  id: string;
  leadName: string;
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  email: string;
  secondaryEmail: string;
  phone: string;
  mobile: string;
  leadSource: string;
  leadOwner: string;
  leadStatus: string;
  industry: string;
  annualRevenue: number;
  website: string;
  noOfEmployees: number;
  rating: string;
  fax: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type ContactRecord = {
  id: string;
  contactName: string;
  firstName: string;
  lastName: string;
  accountName: string;
  contactOwner: string;
  email: string;
  otherPhone: string;
  phone: string;
  mobile: string;
  fax: string;
  leadSource: string;
  vendorName: string;
  title: string;
  department: string;
  homePhone: string;
  tags: string[];
  avatar: string;
  createdAt: string;
  updatedAt: string;
};

export type AccountRecord = {
  id: string;
  accountName: string;
  accountOwner: string;
  accountSite: string;
  parentAccount: string;
  accountNumber: string;
  rating: string;
  phone: string;
  fax: string;
  website: string;
  tickerSymbol: string;
  ownership: string;
  industry: string;
  employees: number;
  annualRevenue: number;
  sicCode: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type CRMRecord = LeadRecord | ContactRecord | AccountRecord;

export type Note = {
  id: string;
  parentId: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string;
};

export type Deal = {
  id: string;
  parentId: string;
  dealName: string;
  amount: number;
  stage: string;
  probability: number;
  closingDate: string;
  type: string;
};

export type Activity = {
  id: string;
  parentId: string;
  type: "Task" | "Call";
  subject: string;
  dueAt: string;
  status: string;
};

export type Meeting = {
  id: string;
  parentId: string;
  title: string;
  at: string;
  host: string;
  status: string;
};

export type Product = {
  id: string;
  parentId: string;
  productName: string;
  quantity: number;
  amount: number;
};

export type Case = {
  id: string;
  parentId: string;
  caseNumber: string;
  subject: string;
  status: string;
  priority: string;
};

export type Quote = {
  id: string;
  parentId: string;
  quoteName: string;
  amount: number;
  status: string;
};

export type SalesOrder = {
  id: string;
  parentId: string;
  orderNumber: string;
  amount: number;
  status: string;
};

export type PurchaseOrder = {
  id: string;
  parentId: string;
  poNumber: string;
  amount: number;
  status: string;
};

export type Invoice = {
  id: string;
  parentId: string;
  invoiceNumber: string;
  amount: number;
  status: string;
};

export type EmailRecord = {
  id: string;
  parentId: string;
  subject: string;
  sentAt: string;
  sentBy: string;
  status: "Draft" | "Sent";
};

export type Attachment = {
  id: string;
  parentId: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
};

export type ConnectedRecord = {
  id: string;
  parentId: string;
  recordType: string;
  name: string;
  owner: string;
  status: string;
};

export type TimelineItem = {
  id: string;
  parentId: string;
  type: "Note" | "Call" | "Meeting" | "Task" | "Email" | "Update";
  title: string;
  detail: string;
  at: string;
  by: string;
};

export type CRMColumn<T extends CRMRecord> = {
  key: keyof T & string;
  label: string;
  minWidth?: string;
};

export type CRMRowAction = {
  key: string;
  label: string;
  destructive?: boolean;
  children?: CRMRowAction[];
};

export type CRMDetailField<T extends CRMRecord> = {
  key: keyof T & string;
  label: string;
};

export type CRMDetailSection<T extends CRMRecord> = {
  id: string;
  title: string;
  fields?: CRMDetailField<T>[];
  type:
    | "summary"
    | "info"
    | "attachments"
    | "cadences"
    | "deals"
    | "activities-open"
    | "activities-closed"
    | "meetings"
    | "products"
    | "cases"
    | "quotes"
    | "sales-orders"
    | "purchase-orders"
    | "invoices"
    | "emails"
    | "notes"
    | "connected-records"
    | "social"
    | "links"
    | "generic";
};

export type CRMTabKey = "overview" | "timeline";

export type CRMSummaryField<T extends CRMRecord> = {
  key: keyof T & string;
  label: string;
};

export type CRMModuleConfig<T extends CRMRecord> = {
  module: CRMModule;
  title: string;
  subtitle: string;
  baseRoute: string;
  nameKey: keyof T & string;
  subtitleKey: keyof T & string;
  columns: CRMColumn<T>[];
  summaryFields: CRMSummaryField<T>[];
  detailSections: CRMDetailSection<T>[];
  relatedListItems: string[];
  headerActions: string[];
  rowActions: CRMRowAction[];
};
