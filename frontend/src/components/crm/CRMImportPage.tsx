import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { FileText } from "lucide-react";
import DashboardLayout from "../layout/DashboardLayout";
import { apiRequest } from "../../api/client";

type CRMImportPageProps = {
  pageTitle: string;
  moduleLabel: string;
  mode: "module" | "notes";
  backPath: string;
};

type ModuleField = {
  key: string;
  label: string;
  required?: boolean;
  virtual?: boolean;
};

type ModuleConfig = {
  endpoint: string;
  fields: ModuleField[];
  aliasDictionary: Record<string, string>;
  emailFields: Set<string>;
  phoneFields: Set<string>;
  numberFields: Set<string>;
  integerFields: Set<string>;
  dateFields: Set<string>;
  duplicateField?: string;
};

const MAX_ROWS = 5000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PREVIEW_ROWS = 5;

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeKeySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

const similarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phonePattern = /^\+?[0-9\-().\s]{7,20}$/;

const buildModuleConfig = (moduleKey: string): ModuleConfig | null => {
  if (moduleKey === "leads") {
    return {
      endpoint: "/leads/import",
      fields: [
        { key: "full_name", label: "Full Name", virtual: true },
        { key: "first_name", label: "First Name", required: true },
        { key: "last_name", label: "Last Name", required: true },
        { key: "company", label: "Company", required: true },
        { key: "email", label: "Email", required: true },
        { key: "phone", label: "Phone" },
        { key: "mobile", label: "Mobile" },
        { key: "title", label: "Title" },
        { key: "website", label: "Website" },
        { key: "lead_source", label: "Lead Source" },
        { key: "lead_status", label: "Lead Status" },
        { key: "industry", label: "Industry" },
        { key: "annual_revenue", label: "Annual Revenue" },
        { key: "employee_count", label: "Employees" },
        { key: "rating", label: "Rating" },
        { key: "street", label: "Street" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "country", label: "Country" },
        { key: "zip_code", label: "Zip Code" },
        { key: "skype_id", label: "Skype ID" },
        { key: "secondary_email", label: "Secondary Email" },
        { key: "description", label: "Description" },
      ],
      aliasDictionary: {
        lead_name: "full_name",
        name: "full_name",
        fullname: "full_name",
        "full name": "full_name",
        firstname: "first_name",
        "first name": "first_name",
        lastname: "last_name",
        "last name": "last_name",
        company: "company",
        organization: "company",
        business: "company",
        mail: "email",
        "email address": "email",
        phone: "phone",
        mobile: "mobile",
        "contact number": "phone",
        "annual revenue": "annual_revenue",
        employees: "employee_count",
        "employee count": "employee_count",
        "lead source": "lead_source",
        "lead status": "lead_status",
        zipcode: "zip_code",
        "zip code": "zip_code",
        "postal code": "zip_code",
        "secondary email": "secondary_email",
        "skype id": "skype_id",
        "country/region": "country",
        "state/province": "state",
      },
      emailFields: new Set(["email", "secondary_email"]),
      phoneFields: new Set(["phone", "mobile"]),
      numberFields: new Set(["annual_revenue"]),
      integerFields: new Set(["employee_count"]),
      dateFields: new Set<string>(),
      duplicateField: "email",
    };
  }

  if (moduleKey === "contacts") {
    return {
      endpoint: "/contact/import",
      fields: [
        { key: "full_name", label: "Full Name", virtual: true },
        { key: "first_name", label: "First Name", required: true },
        { key: "last_name", label: "Last Name", required: true },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "mobile", label: "Mobile" },
        { key: "account_name", label: "Account Name" },
        { key: "salutation", label: "Salutation" },
        { key: "secondary_email", label: "Secondary Email" },
        { key: "other_phone", label: "Other Phone" },
        { key: "home_phone", label: "Home Phone" },
        { key: "assistant_phone", label: "Assistant Phone" },
        { key: "title", label: "Title" },
        { key: "department", label: "Department" },
        { key: "assistant", label: "Assistant" },
        { key: "date_of_birth", label: "Date of Birth" },
        { key: "lead_source", label: "Lead Source" },
        { key: "vendor_name", label: "Vendor Name" },
      ],
      aliasDictionary: {
        contact_name: "full_name",
        name: "full_name",
        fullname: "full_name",
        "full name": "full_name",
        firstname: "first_name",
        "first name": "first_name",
        lastname: "last_name",
        "last name": "last_name",
        mail: "email",
        "email address": "email",
        phone: "phone",
        mobile: "mobile",
        "contact number": "phone",
        "account name": "account_name",
        "secondary email": "secondary_email",
        "other phone": "other_phone",
        "home phone": "home_phone",
        "assistant phone": "assistant_phone",
        "date of birth": "date_of_birth",
        "lead source": "lead_source",
      },
      emailFields: new Set(["email", "secondary_email"]),
      phoneFields: new Set(["phone", "mobile", "other_phone", "home_phone", "assistant_phone"]),
      numberFields: new Set<string>(),
      integerFields: new Set<string>(),
      dateFields: new Set(["date_of_birth"]),
      duplicateField: "email",
    };
  }

  if (moduleKey === "accounts") {
    return {
      endpoint: "/accounts/import",
      fields: [
        { key: "account_name", label: "Account Name", required: true },
        { key: "account_number", label: "Account Number" },
        { key: "account_type", label: "Account Type" },
        { key: "account_site", label: "Account Site" },
        { key: "industry", label: "Industry" },
        { key: "annual_revenue", label: "Annual Revenue" },
        { key: "employees", label: "Employees" },
        { key: "phone", label: "Phone" },
        { key: "fax", label: "Fax" },
        { key: "website", label: "Website" },
        { key: "ticker_symbol", label: "Ticker Symbol" },
        { key: "billing_address", label: "Billing Address" },
        { key: "shipping_address", label: "Shipping Address" },
        { key: "description", label: "Description" },
      ],
      aliasDictionary: {
        name: "account_name",
        "account name": "account_name",
        "account number": "account_number",
        "account type": "account_type",
        "account site": "account_site",
        industry: "industry",
        "annual revenue": "annual_revenue",
        employees: "employees",
        "employee count": "employees",
        "billing address": "billing_address",
        "shipping address": "shipping_address",
      },
      emailFields: new Set<string>(),
      phoneFields: new Set(["phone", "fax"]),
      numberFields: new Set(["annual_revenue"]),
      integerFields: new Set(["employees"]),
      dateFields: new Set<string>(),
    };
  }

  if (moduleKey === "deals") {
    return {
      endpoint: "/deals/import",
      fields: [
        { key: "deal_name", label: "Deal Name", required: true },
        { key: "account_name", label: "Account Name", required: true },
        { key: "contact_email", label: "Contact Email" },
        { key: "lead_email", label: "Lead Email" },
        { key: "amount", label: "Amount" },
        { key: "expected_revenue", label: "Expected Revenue" },
        { key: "stage", label: "Stage" },
        { key: "probability", label: "Probability" },
        { key: "closing_date", label: "Closing Date" },
        { key: "type", label: "Type" },
        { key: "lead_source", label: "Lead Source" },
        { key: "campaign_source", label: "Campaign Source" },
        { key: "next_step", label: "Next Step" },
        { key: "forecast_category", label: "Forecast Category" },
        { key: "description", label: "Description" },
      ],
      aliasDictionary: {
        name: "deal_name",
        "deal name": "deal_name",
        "account name": "account_name",
        "contact email": "contact_email",
        "lead email": "lead_email",
        "expected revenue": "expected_revenue",
        "close date": "closing_date",
      },
      emailFields: new Set(["contact_email", "lead_email"]),
      phoneFields: new Set<string>(),
      numberFields: new Set(["amount", "expected_revenue", "probability"]),
      integerFields: new Set(["probability"]),
      dateFields: new Set(["closing_date"]),
    };
  }

  return null;
};

export default function CRMImportPage({
  pageTitle,
  moduleLabel,
  mode,
  backPath,
}: CRMImportPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<Record<string, unknown> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const moduleKey = useMemo(
    () => backPath.replace("/", "").toLowerCase(),
    [backPath]
  );

  const moduleConfig = useMemo(() => buildModuleConfig(moduleKey), [moduleKey]);

  const fieldOptions = useMemo(() => moduleConfig?.fields ?? [], [moduleConfig]);

  const mappedFieldKeys = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);

  const mapHeaderToField = (header: string) => {
    if (!moduleConfig) return "";
    const normalizedHeader = normalizeKey(header);
    const normalizedSlug = normalizeKeySlug(header);

    const directMatch = fieldOptions.find(
      (field) => normalizeKeySlug(field.key) === normalizedSlug
    );
    if (directMatch) return directMatch.key;

    const aliasMatch = moduleConfig.aliasDictionary[normalizedHeader];
    if (aliasMatch) return aliasMatch;

    let bestField = "";
    let bestScore = 0;
    fieldOptions.forEach((field) => {
      const fieldSlug = normalizeKeySlug(field.key);
      const fieldLabel = normalizeKey(field.label);
      const score = Math.max(
        similarity(normalizedSlug, fieldSlug),
        similarity(normalizedHeader, fieldLabel)
      );
      if (score > bestScore) {
        bestScore = score;
        bestField = field.key;
      }
    });

    return bestScore >= 0.82 ? bestField : "";
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    if (!moduleConfig) {
      setErrorMsg("Unsupported module for import.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setImportSummary(null);

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv") {
      setErrorMsg("Only CSV files are supported.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg("File size exceeds 10MB.");
      return;
    }

    setIsProcessing(true);
    try {
      const content = await file.text();
      const parsed = Papa.parse<Record<string, unknown>>(content, {
        header: true,
        skipEmptyLines: "greedy",
      });

      if (parsed.errors?.length) {
        throw new Error(parsed.errors[0]?.message || "Invalid CSV format.");
      }

      const parsedHeaders = parsed.meta.fields ?? [];
      if (parsedHeaders.length === 0) {
        throw new Error("CSV file has no headers.");
      }

      const cleanedRows = (parsed.data || []).filter((row: Record<string, unknown>) =>
        Object.values(row || {}).some((value) => String(value ?? "").trim() !== "")
      );

      if (cleanedRows.length > MAX_ROWS) {
        throw new Error(`CSV exceeds the limit of ${MAX_ROWS} rows.`);
      }

      const initialMapping: Record<string, string> = {};
      parsedHeaders.forEach((header: string) => {
        initialMapping[header] = mapHeaderToField(header);
      });

      setSelectedFile(file);
      setHeaders(parsedHeaders);
      setRows(cleanedRows);
      setMapping(initialMapping);
      setStep(2);
      setSuccessMsg("File uploaded successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read file.";
      setErrorMsg(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const normalizeValue = (value: unknown, field: string) => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    if (moduleConfig?.emailFields.has(field)) {
      return raw.toLowerCase();
    }
    if (moduleConfig?.integerFields.has(field)) {
      const parsed = Number.parseInt(raw.replace(/,/g, ""), 10);
      return Number.isNaN(parsed) ? raw : parsed;
    }
    if (moduleConfig?.numberFields.has(field)) {
      const parsed = Number.parseFloat(raw.replace(/,/g, ""));
      return Number.isNaN(parsed) ? raw : parsed;
    }
    if (moduleConfig?.dateFields.has(field)) {
      const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      }
      const altMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (altMatch) {
        return `${altMatch[3]}-${altMatch[1]}-${altMatch[2]}`;
      }
    }
    return raw;
  };

  const buildRecords = () => {
    if (!moduleConfig) return [];
    const records: Record<string, unknown>[] = [];
    rows.forEach((row) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header) => {
        const fieldKey = mapping[header];
        if (!fieldKey) return;
        const value = normalizeValue(row[header], fieldKey);
        if (value === null) return;

        if (fieldKey === "full_name") {
          const parts = String(value).split(/\s+/).filter(Boolean);
          const firstName = parts.shift() ?? "";
          const lastName = parts.join(" ");
          if (!record.first_name && firstName) record.first_name = firstName;
          if (!record.last_name && lastName) record.last_name = lastName;
          return;
        }

        if (!(fieldKey in record)) {
          record[fieldKey] = value;
        }
      });
      if (Object.keys(record).length > 0) {
        records.push(record);
      }
    });
    return records;
  };

  const mappingComplete = useMemo(() => {
    if (!moduleConfig) return false;
    const requiredFields = moduleConfig.fields.filter((field) => field.required);
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    const hasFullName = mapped.has("full_name");

    return requiredFields.every((field) => {
      if (field.key === "first_name" || field.key === "last_name") {
        return mapped.has(field.key) || hasFullName;
      }
      if (field.key === "account_name" && moduleKey === "deals") {
        return mapped.has("account_name") || mapped.has("account");
      }
      return mapped.has(field.key);
    });
  }, [moduleConfig, mapping, moduleKey]);

  const mappingErrors = useMemo(() => {
    if (!moduleConfig) return [];
    const errors: string[] = [];
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    const hasFullName = mapped.has("full_name");
    moduleConfig.fields
      .filter((field) => field.required)
      .forEach((field) => {
        if ((field.key === "first_name" || field.key === "last_name") && hasFullName) {
          return;
        }
        if (field.key === "account_name" && moduleKey === "deals") {
          if (mapped.has("account_name") || mapped.has("account")) return;
        }
        if (!mapped.has(field.key)) {
          errors.push(`${field.label} is required.`);
        }
      });
    return errors;
  }, [moduleConfig, mapping, moduleKey]);

  const unmappedHeaders = useMemo(
    () => headers.filter((header) => !mapping[header]),
    [headers, mapping]
  );

  const previewRows = useMemo(() => buildRecords().slice(0, PREVIEW_ROWS), [rows, mapping]);
  const previewColumns = useMemo(() => {
    const columns = new Set<string>();
    previewRows.forEach((row) => {
      Object.keys(row).forEach((key) => columns.add(key));
    });
    return Array.from(columns);
  }, [previewRows]);

  const handleImport = async () => {
    if (!moduleConfig) return;
    setErrorMsg(null);
    setImportSummary(null);
    setIsProcessing(true);

    try {
      const records = buildRecords();
      if (records.length === 0) {
        throw new Error("No valid records found.");
      }

      if (records.length > MAX_ROWS) {
        throw new Error(`CSV exceeds the limit of ${MAX_ROWS} rows.`);
      }

      const emailDuplicates = new Set<string>();
      const seenEmails = new Set<string>();

      records.forEach((record) => {
        if (moduleConfig.duplicateField && typeof record[moduleConfig.duplicateField] === "string") {
          const email = String(record[moduleConfig.duplicateField]).toLowerCase();
          if (seenEmails.has(email)) emailDuplicates.add(email);
          seenEmails.add(email);
          record[moduleConfig.duplicateField] = email;
        }
      });

      if (emailDuplicates.size > 0) {
        throw new Error(
          `Duplicate emails in file: ${Array.from(emailDuplicates).slice(0, 10).join(", ")}`
        );
      }

      const invalids: string[] = [];
      records.forEach((record, index) => {
        moduleConfig.emailFields.forEach((field) => {
          const value = record[field];
          if (value && !emailPattern.test(String(value))) {
            invalids.push(`Row ${index + 2}: Invalid email in ${field}`);
          }
        });
        moduleConfig.phoneFields.forEach((field) => {
          const value = record[field];
          if (value && !phonePattern.test(String(value))) {
            invalids.push(`Row ${index + 2}: Invalid phone in ${field}`);
          }
        });
      });

      if (invalids.length > 0) {
        throw new Error(invalids.slice(0, 5).join("; "));
      }

      const batches = [];
      for (let i = 0; i < records.length; i += 500) {
        batches.push(records.slice(i, i + 500));
      }

      let imported = 0;
      let skipped = 0;
      const errors: unknown[] = [];

      for (const batch of batches) {
        const response = await apiRequest<{
          imported_count?: number;
          skipped_count?: number;
          error_count?: number;
          errors?: unknown[];
        }>(moduleConfig.endpoint, {
          method: "POST",
          body: JSON.stringify({ records: batch }),
        });

        imported += response.imported_count ?? 0;
        skipped += response.skipped_count ?? 0;
        if (response.errors) errors.push(...response.errors);
      }

      setImportSummary({
        total: records.length,
        imported,
        skipped,
        errors: errors.length,
      });

      setStep(4);
      window.dispatchEvent(new CustomEvent("crm:imported", { detail: { module: moduleKey } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      setErrorMsg(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepper = () => (
    <div className="mb-6 flex items-center gap-6 text-[13px] text-slate-500">
      {[
        { step: 1, label: "Upload" },
        { step: 2, label: "Mapping" },
        { step: 3, label: "Preview" },
        { step: 4, label: "Import" },
      ].map((item) => {
        const isActive = step === item.step;
        const isComplete = step > item.step;
        return (
          <div key={item.step} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${
                isComplete
                  ? "bg-emerald-100 text-emerald-600"
                  : isActive
                  ? "bg-blue-100 text-blue-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isComplete ? "?" : item.step}
            </span>
            <span className={isActive ? "text-slate-700 font-semibold" : ""}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden bg-[#f5f7fb]">
        <div className="border-b border-[#d9e1ef] bg-[#f7f9fc] px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[16px] font-semibold text-[#1f2d3d]">
              {moduleLabel}
            </h1>
          </div>
        </div>

        <div className="h-[calc(100%-57px)] overflow-y-auto">
          <div className="px-8 py-6">
            <h2 className="mb-4 text-[18px] font-semibold text-[#1f2d3d]">
              {pageTitle}
            </h2>

            {renderStepper()}

            {errorMsg && (
              <div className="mb-4 rounded-[6px] border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 rounded-[6px] border border-green-200 bg-green-50 px-4 py-2 text-[13px] text-green-700">
                {successMsg}
              </div>
            )}

            {step === 1 && (
              <div
                className="rounded-[8px] border border-dashed border-[#cfd7e6] bg-white px-8 py-10 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#49c37d] text-[#49c37d]">
                  <FileText size={20} />
                </div>
                <p className="mb-2 text-[14px] text-slate-600">
                  Upload CSV file (max 10MB)
                </p>
                <p className="mb-3 text-[13px] text-slate-500">Drag & drop or</p>
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="rounded-[6px] bg-gradient-to-b from-[#4d76ff] to-[#365eea] px-8 py-2 text-[14px] font-medium text-white"
                  disabled={isProcessing}
                >
                  Browse File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="mt-4 text-[13px] text-slate-700">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <div className="mt-6 text-[12px] text-slate-500">
                  Step 1: Upload File
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="rounded-[8px] border border-[#e2e8f0] bg-white p-6">
                <h3 className="mb-4 text-[15px] font-semibold text-slate-700">
                  Field Mapping
                </h3>
                <div className="grid grid-cols-[1fr_1fr] gap-3 text-[13px] text-slate-500">
                  <span>CSV Column</span>
                  <span>CRM Field</span>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {headers.map((header) => (
                    <div key={header} className="grid grid-cols-[1fr_1fr] gap-3">
                      <div className="rounded-[6px] border border-[#e2e8f0] bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
                        {header}
                      </div>
                      <select
                        className="rounded-[6px] border border-[#cfd7e6] bg-white px-3 py-2 text-[13px] text-slate-700"
                        value={mapping[header] ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [header]: e.target.value,
                          }))
                        }
                      >
                        <option value="">-- Unmapped --</option>
                        {fieldOptions.map((field) => {
                          const isSelected = mapping[header] === field.key;
                          const disabled =
                            !isSelected && mappedFieldKeys.has(field.key);
                          return (
                            <option key={field.key} value={field.key} disabled={disabled}>
                              {field.label}
                              {field.required ? " *" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
                {mappingErrors.length > 0 && (
                  <div className="mt-4 text-[12px] text-amber-600">
                    {mappingErrors.join(" ")}
                  </div>
                )}
                {unmappedHeaders.length > 0 && (
                  <div className="mt-2 text-[12px] text-slate-500">
                    Unmapped columns: {unmappedHeaders.join(", ")}. Please map them if needed.
                  </div>
                )}
                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    className="rounded-[6px] border border-[#cfd7e6] bg-white px-6 py-2 text-[13px] text-slate-600"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="rounded-[6px] bg-[#a9b7f7] px-6 py-2 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={!mappingComplete}
                    onClick={() => setStep(3)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="rounded-[8px] border border-[#e2e8f0] bg-white p-6">
                <h3 className="mb-4 text-[15px] font-semibold text-slate-700">
                  Preview (first {PREVIEW_ROWS} rows)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-[12px] text-slate-600">
                    <thead className="border-b border-[#e2e8f0]">
                      <tr>
                        {previewColumns.map((col) => (
                          <th key={col} className="px-3 py-2 font-semibold text-slate-700">
                            {col.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={`preview-${index}`} className="border-b border-[#f1f5f9]">
                          {previewColumns.map((col) => (
                            <td key={col} className="px-3 py-2">
                              {String(row[col] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    className="rounded-[6px] border border-[#cfd7e6] bg-white px-6 py-2 text-[13px] text-slate-600"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="rounded-[6px] bg-[#4d76ff] px-6 py-2 text-[13px] font-medium text-white disabled:opacity-70"
                    disabled={isProcessing}
                    onClick={handleImport}
                  >
                    {isProcessing ? "Importing..." : "Import"}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="rounded-[8px] border border-[#e2e8f0] bg-white p-6">
                <h3 className="mb-4 text-[15px] font-semibold text-slate-700">
                  Import Summary
                </h3>
                {importSummary ? (
                  <div className="grid grid-cols-2 gap-4 text-[13px] text-slate-700">
                    <div>Total Records: {String(importSummary.total ?? 0)}</div>
                    <div>Imported: {String(importSummary.imported ?? 0)}</div>
                    <div>Skipped: {String(importSummary.skipped ?? 0)}</div>
                    <div>Errors: {String(importSummary.errors ?? 0)}</div>
                  </div>
                ) : (
                  <p className="text-[13px] text-slate-600">
                    Import completed.
                  </p>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="rounded-[6px] bg-[#4d76ff] px-6 py-2 text-[13px] font-medium text-white"
                    onClick={() => navigate(backPath)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {mode !== "module" && (
              <div className="mt-6 text-[12px] text-slate-500">
                Notes import is not supported in this flow.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
