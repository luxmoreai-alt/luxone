import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getLoggedInUser, getLoggedInUserName } from "../../lib/auth/currentUser";
import { getInventoryRecordSnapshot, reviewInvoiceChanges, saveInventoryRecord } from "../api";
import { getInventoryMeta } from "../config";
import type {
  ConfiguratorFormValues,
  ConfiguratorRuleForm,
  InventoryFormValues,
  InventoryLineItem,
  InventoryModuleKey,
  InvoiceFormValues,
  PriceBookFormValues,
  ProductFormValues,
  PurchaseOrderFormValues,
  QuoteFormValues,
  SalesOrderFormValues,
  VendorFormValues,
} from "../types";
import { emptyLineItem, recalculateDocument } from "../utils";
import InventoryDocumentItemsTable from "./InventoryDocumentItemsTable";
import InventoryLookupField from "./InventoryLookupField";
import InventoryQuickVendorModal from "./InventoryQuickVendorModal";
import InventoryReviewChangesModal from "./InventoryReviewChangesModal";
import InventoryTotalsPanel from "./InventoryTotalsPanel";

type Props = { moduleKey: InventoryModuleKey };

const inputClass = "h-[38px] w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500";
const textareaClass = "min-h-[96px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function getInitialValues(moduleKey: InventoryModuleKey): InventoryFormValues {
  const currentUserId = String(getLoggedInUser()?.id || "");
  if (moduleKey === "products") return { owner: currentUserId, productName: "", productCode: "", vendor: "", vendorLabel: "", manufacturer: "", productCategory: "", unitPrice: 0, commissionRate: 0, tax: 0, quantityInStock: 0, quantityInDemand: 0, reorderLevel: 0, usageUnit: "", supportStartDate: "", supportExpiryDate: "", description: "" } as ProductFormValues;
  if (moduleKey === "vendors") return { vendorOwner: currentUserId, vendorName: "", email: "", phone: "", website: "", category: "", description: "", billingStreet: "", billingCity: "", billingState: "", billingCountry: "", billingZipCode: "", shippingStreet: "", shippingCity: "", shippingState: "", shippingCountry: "", shippingZipCode: "" } as VendorFormValues;
  if (moduleKey === "price-books") return { owner: currentUserId, name: "", active: true, pricingModel: "fixed", description: "", ranges: [{ fromRange: 1, toRange: 10, discountPercentage: 0 }], productLinks: [] } as PriceBookFormValues;
  if (moduleKey === "quotes") return { owner: currentUserId, subject: "", quoteStage: "", team: "", carrier: "", priceBook: "", priceBookLabel: "", deal: "", dealLabel: "", validUntil: "", contact: "", contactLabel: "", account: "", accountLabel: "", subtotal: 0, discount: 0, tax: 0, adjustment: 0, grandTotal: 0, termsAndConditions: "", description: "", billingStreet: "", billingCity: "", billingState: "", billingCountry: "", billingZipCode: "", shippingStreet: "", shippingCity: "", shippingState: "", shippingCountry: "", shippingZipCode: "", items: [emptyLineItem()] } as QuoteFormValues;
  if (moduleKey === "sales-orders") return { owner: currentUserId, subject: "", customerNo: "", quote: "", quoteLabel: "", pending: false, carrier: "", salesCommission: 0, account: "", accountLabel: "", deal: "", dealLabel: "", dueDate: "", contact: "", contactLabel: "", exciseDuty: 0, status: "", subtotal: 0, discount: 0, tax: 0, adjustment: 0, grandTotal: 0, termsAndConditions: "", description: "", billingStreet: "", billingCity: "", billingState: "", billingCountry: "", billingZipCode: "", shippingStreet: "", shippingCity: "", shippingState: "", shippingCountry: "", shippingZipCode: "", items: [emptyLineItem()] } as SalesOrderFormValues;
  if (moduleKey === "purchase-orders") return { owner: currentUserId, subject: "", requisitionNumber: "", contact: "", contactLabel: "", dueDate: "", exciseDuty: 0, status: "", poNumber: "", vendor: "", vendorLabel: "", trackingNumber: "", poDate: "", carrier: "", salesCommission: 0, subtotal: 0, discount: 0, tax: 0, adjustment: 0, grandTotal: 0, termsAndConditions: "", description: "", billingStreet: "", billingCity: "", billingState: "", billingCountry: "", billingZipCode: "", shippingStreet: "", shippingCity: "", shippingState: "", shippingCountry: "", shippingZipCode: "", items: [emptyLineItem()] } as PurchaseOrderFormValues;
  if (moduleKey === "invoices") return { owner: currentUserId, subject: "", invoiceDate: "", dueDate: "", salesCommission: 0, account: "", accountLabel: "", contact: "", contactLabel: "", deal: "", dealLabel: "", salesOrder: "", salesOrderLabel: "", purchaseOrder: "", purchaseOrderLabel: "", exciseDuty: 0, status: "", subtotal: 0, discount: 0, tax: 0, adjustment: 0, grandTotal: 0, termsAndConditions: "", description: "", billingStreet: "", billingCity: "", billingState: "", billingCountry: "", billingZipCode: "", shippingStreet: "", shippingCity: "", shippingState: "", shippingCountry: "", shippingZipCode: "", items: [emptyLineItem()] } as InvoiceFormValues;
  return { name: "", targetModule: "quotes", layout: "", subform: "", lookupField: "", description: "", active: true, rules: [{ criteria: "{\"all\":[]}", actionType: "mandatory_product", targetProduct: "", targetProductLabel: "", fieldName: "", fieldValue: "", metadata: "{}" } as ConfiguratorRuleForm] } as ConfiguratorFormValues;
}

export default function InventoryFormPage({ moduleKey }: Props) {
  const meta = getInventoryMeta(moduleKey);
  const navigate = useNavigate();
  const [form, setForm] = useState<InventoryFormValues>(() => getInitialValues(moduleKey));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [quickVendorOpen, setQuickVendorOpen] = useState(false);
  const anyForm = form as any;
  const currentUserName = getLoggedInUserName();
  const totals = useMemo(() => Array.isArray(anyForm.items) ? recalculateDocument(anyForm.items as InventoryLineItem[], Number(anyForm.adjustment || 0)) : null, [anyForm.adjustment, anyForm.items]);

  useEffect(() => {
    if (moduleKey !== "quotes" || !anyForm.deal) return;
    let cancelled = false;
    const loadDeal = async () => {
      try {
        const deal = await apiRequest<any>(`/deals/${String(anyForm.deal)}`);
        if (cancelled) return;
        setForm((current: InventoryFormValues) => {
          const draft = current as any;
          return {
            ...draft,
            account: draft.account || String(deal.account_info?.id || deal.account || ""),
            accountLabel: draft.accountLabel || deal.account_info?.name || deal.account_name || "",
            contact: draft.contact || String(deal.contact_info?.id || deal.contact || ""),
            contactLabel: draft.contactLabel || deal.contact_info?.name || deal.contact_name || "",
          };
        });
      } catch {
        // Keep manual form values when deal lookup enrichment fails.
      }
    };
    void loadDeal();
    return () => {
      cancelled = true;
    };
  }, [anyForm.deal, moduleKey]);

  useEffect(() => {
    if (moduleKey !== "quotes" || !anyForm.priceBook || !Array.isArray(anyForm.items) || !anyForm.items.length) return;
    let cancelled = false;
    const loadPriceBook = async () => {
      try {
        const priceBook = await getInventoryRecordSnapshot("price-books", String(anyForm.priceBook));
        if (cancelled) return;
        const links = new Map<string, number>(
          (priceBook.product_links || []).map((link: any) => [String(link.product), Number(link.list_price || 0)] as [string, number])
        );
        const ranges = Array.isArray(priceBook.ranges) ? priceBook.ranges : [];
        const nextItems = (anyForm.items as InventoryLineItem[]).map((item) => {
          const listPrice = links.get(String(item.product));
          if (listPrice == null) return item;
          const quantity = Number(item.quantity || 0);
          const matchingRange = ranges.find(
            (range: any) => quantity >= Number(range.from_range || 0) && quantity <= Number(range.to_range || 0)
          );
          const amount = quantity * listPrice;
          const computedDiscount =
            matchingRange && String(priceBook.pricing_model || "").toLowerCase() === "range"
              ? (amount * Number(matchingRange.discount_percentage || 0)) / 100
              : Number(item.discount || 0);
          return {
            ...item,
            listPrice,
            discount: computedDiscount,
            amount,
            total: amount - computedDiscount + Number(item.tax || 0),
          };
        });
        setForm((current: InventoryFormValues) => {
          const draft = current as any;
          return {
            ...draft,
            ...recalculateDocument(nextItems, Number(draft.adjustment || 0)),
          };
        });
      } catch {
        // Keep product pricing from the base product record if the price book cannot be loaded.
      }
    };
    void loadPriceBook();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify((anyForm.items || []).map((item: InventoryLineItem) => [item.product, item.quantity])), anyForm.priceBook, moduleKey]);

  useEffect(() => {
    if (moduleKey !== "sales-orders" || !anyForm.quote) return;
    let cancelled = false;
    const loadQuote = async () => {
      try {
        const quote = await getInventoryRecordSnapshot("quotes", String(anyForm.quote));
        if (cancelled) return;
        setForm((current: InventoryFormValues) => {
          const draft = current as any;
          const items = (quote.items || []).map((item: any) => ({
            product: String(item.product || ""),
            productName: String(item.product_name || ""),
            productCode: String(item.product_code || ""),
            quantity: Number(item.quantity || 0),
            listPrice: Number(item.list_price || 0),
            amount: Number(item.amount || 0),
            discount: Number(item.discount || 0),
            tax: Number(item.tax || 0),
            total: Number(item.total || 0),
            rowDescription: String(item.row_description || ""),
          }));
          return {
            ...draft,
            account: String(quote.account || draft.account || ""),
            accountLabel: quote.account_name || draft.accountLabel || "",
            contact: String(quote.contact || draft.contact || ""),
            contactLabel: quote.contact_name || draft.contactLabel || "",
            deal: String(quote.deal || draft.deal || ""),
            dealLabel: quote.deal_name || draft.dealLabel || "",
            subject: draft.subject || quote.subject || "",
            termsAndConditions: draft.termsAndConditions || quote.terms_and_conditions || "",
            description: draft.description || quote.description || "",
            billingStreet: draft.billingStreet || quote.billing_street || "",
            billingCity: draft.billingCity || quote.billing_city || "",
            billingState: draft.billingState || quote.billing_state || "",
            billingCountry: draft.billingCountry || quote.billing_country || "",
            billingZipCode: draft.billingZipCode || quote.billing_zip_code || "",
            shippingStreet: draft.shippingStreet || quote.shipping_street || "",
            shippingCity: draft.shippingCity || quote.shipping_city || "",
            shippingState: draft.shippingState || quote.shipping_state || "",
            shippingCountry: draft.shippingCountry || quote.shipping_country || "",
            shippingZipCode: draft.shippingZipCode || quote.shipping_zip_code || "",
            ...recalculateDocument(items.length ? items : draft.items || [], Number(draft.adjustment || quote.adjustment || 0)),
          };
        });
      } catch {
        // Keep manual form values when quote enrichment fails.
      }
    };
    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [anyForm.quote, moduleKey]);

  useEffect(() => {
    if (moduleKey !== "purchase-orders" || !anyForm.vendor) return;
    let cancelled = false;
    const loadVendor = async () => {
      try {
        const vendor = await getInventoryRecordSnapshot("vendors", String(anyForm.vendor));
        if (cancelled) return;
        setForm((current: InventoryFormValues) => {
          const draft = current as any;
          return {
            ...draft,
            billingStreet: draft.billingStreet || vendor.billing_street || "",
            billingCity: draft.billingCity || vendor.billing_city || "",
            billingState: draft.billingState || vendor.billing_state || "",
            billingCountry: draft.billingCountry || vendor.billing_country || "",
            billingZipCode: draft.billingZipCode || vendor.billing_zip_code || "",
            shippingStreet: draft.shippingStreet || vendor.shipping_street || "",
            shippingCity: draft.shippingCity || vendor.shipping_city || "",
            shippingState: draft.shippingState || vendor.shipping_state || "",
            shippingCountry: draft.shippingCountry || vendor.shipping_country || "",
            shippingZipCode: draft.shippingZipCode || vendor.shipping_zip_code || "",
          };
        });
      } catch {
        // Keep manual values.
      }
    };
    void loadVendor();
    return () => {
      cancelled = true;
    };
  }, [anyForm.vendor, moduleKey]);

  useEffect(() => {
    if (moduleKey !== "invoices" || (!anyForm.salesOrder && !anyForm.purchaseOrder)) return;
    let cancelled = false;
    const loadSource = async () => {
      try {
        const sourceKey = anyForm.salesOrder ? "sales-orders" : "purchase-orders";
        const sourceId = String(anyForm.salesOrder || anyForm.purchaseOrder);
        const source = await getInventoryRecordSnapshot(sourceKey as "sales-orders" | "purchase-orders", sourceId);
        if (cancelled) return;
        setForm((current: InventoryFormValues) => {
          const draft = current as any;
          const items = (source.items || []).map((item: any) => ({
            product: String(item.product || ""),
            productName: String(item.product_name || ""),
            productCode: String(item.product_code || ""),
            quantity: Number(item.quantity || 0),
            listPrice: Number(item.list_price || 0),
            amount: Number(item.amount || 0),
            discount: Number(item.discount || 0),
            tax: Number(item.tax || 0),
            total: Number(item.total || 0),
            rowDescription: String(item.row_description || ""),
          }));
          return {
            ...draft,
            account: String(source.account || draft.account || ""),
            accountLabel: source.account_name || draft.accountLabel || "",
            contact: String(source.contact || draft.contact || ""),
            contactLabel: source.contact_name || draft.contactLabel || "",
            deal: String(source.deal || draft.deal || ""),
            dealLabel: source.deal_name || draft.dealLabel || "",
            subject: draft.subject || source.subject || "",
            termsAndConditions: draft.termsAndConditions || source.terms_and_conditions || "",
            description: draft.description || source.description || "",
            billingStreet: draft.billingStreet || source.billing_street || "",
            billingCity: draft.billingCity || source.billing_city || "",
            billingState: draft.billingState || source.billing_state || "",
            billingCountry: draft.billingCountry || source.billing_country || "",
            billingZipCode: draft.billingZipCode || source.billing_zip_code || "",
            shippingStreet: draft.shippingStreet || source.shipping_street || "",
            shippingCity: draft.shippingCity || source.shipping_city || "",
            shippingState: draft.shippingState || source.shipping_state || "",
            shippingCountry: draft.shippingCountry || source.shipping_country || "",
            shippingZipCode: draft.shippingZipCode || source.shipping_zip_code || "",
            ...recalculateDocument(items.length ? items : draft.items || [], Number(draft.adjustment || source.adjustment || 0)),
          };
        });
      } catch {
        // Keep manual values.
      }
    };
    void loadSource();
    return () => {
      cancelled = true;
    };
  }, [anyForm.purchaseOrder, anyForm.salesOrder, moduleKey]);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const result = await saveInventoryRecord(moduleKey, form);
      navigate(`${meta.baseRoute}/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = async () => {
    const requireSelectedLookup = (idValue: string, labelValue: string, fieldLabel: string) => {
      if (String(labelValue || "").trim().length > 0 && String(idValue || "").trim().length === 0) {
        setError(`Select a valid ${fieldLabel.toLowerCase()} from the dropdown.`);
        return true;
      }
      return false;
    };

    if (
      requireSelectedLookup(anyForm.account || "", anyForm.accountLabel || "", "Account") ||
      requireSelectedLookup(anyForm.contact || "", anyForm.contactLabel || "", "Contact") ||
      requireSelectedLookup(anyForm.deal || "", anyForm.dealLabel || "", "Deal") ||
      requireSelectedLookup(anyForm.priceBook || "", anyForm.priceBookLabel || "", "Price Book") ||
      requireSelectedLookup(anyForm.quote || "", anyForm.quoteLabel || "", "Quote") ||
      requireSelectedLookup(anyForm.vendor || "", anyForm.vendorLabel || "", "Vendor") ||
      requireSelectedLookup(anyForm.salesOrder || "", anyForm.salesOrderLabel || "", "Sales Order") ||
      requireSelectedLookup(anyForm.purchaseOrder || "", anyForm.purchaseOrderLabel || "", "Purchase Order")
    ) {
      return;
    }

    if (Array.isArray(anyForm.items)) {
      const itemRows = anyForm.items as InventoryLineItem[];
      const rowHasContent = (item: InventoryLineItem) =>
        String(item.product || "").trim().length > 0 ||
        String(item.productName || "").trim().length > 0 ||
        String(item.rowDescription || "").trim().length > 0 ||
        Number(item.quantity || 0) > 0 ||
        Number(item.listPrice || 0) > 0 ||
        Number(item.discount || 0) > 0 ||
        Number(item.tax || 0) > 0;
      const hasSelectedProduct = itemRows.some((item) => String(item.product || "").trim().length > 0);
      const hasInvalidProductRow = itemRows.some(
        (item) => rowHasContent(item) && String(item.product || "").trim().length === 0
      );
      const hasInvalidQuantityRow = itemRows.some(
        (item) => String(item.product || "").trim().length > 0 && Number(item.quantity || 0) <= 0
      );

      if (!hasSelectedProduct) {
        setError("Add at least one item and select a product from the dropdown.");
        return;
      }

      if (hasInvalidProductRow) {
        setError("One or more item rows has a typed product name but no selected product. Please choose the product from the dropdown list.");
        return;
      }

      if (hasInvalidQuantityRow) {
        setError("Each selected item needs a quantity greater than 0.");
        return;
      }
    }

    if (moduleKey === "quotes" && (!anyForm.account || !anyForm.contact || !anyForm.deal)) {
      setError("Quotes need a selected account, contact, and deal.");
      return;
    }

    if (moduleKey === "sales-orders" && !anyForm.quote && (!anyForm.account || !anyForm.contact || !anyForm.deal)) {
      setError("Sales Orders need a quote or a selected account, contact, and deal.");
      return;
    }

    if (moduleKey === "purchase-orders" && !anyForm.vendor) {
      setError("Purchase Orders need a selected vendor.");
      return;
    }

    if (moduleKey === "invoices" && (!anyForm.account || !anyForm.contact)) {
      setError("Invoices need a selected account and contact.");
      return;
    }

    if (moduleKey === "invoices" && Array.isArray(anyForm.items)) {
      try {
        const reviewed = await reviewInvoiceChanges(anyForm.items, Number(anyForm.adjustment || 0));
        setReviewData(reviewed);
        setReviewOpen(true);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to review invoice changes.");
        return;
      }
    }
    await save();
  };

  const syncItems = (items: InventoryLineItem[]) => {
    const next = recalculateDocument(items, Number(anyForm.adjustment || 0));
    setForm({ ...anyForm, ...next, items });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{meta.createLabel}</h1>
            <p className="text-sm text-slate-500">Integrated {meta.singular.toLowerCase()} form connected to the CRM backend.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate(meta.baseRoute)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">Cancel</button>
            <button type="button" disabled={saving} onClick={() => void onSaveClick()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>

        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {(moduleKey === "products" || moduleKey === "vendors" || moduleKey === "price-books" || moduleKey === "configurator") && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {moduleKey === "products" && (
                <>
                  <Field label="Product Name"><input className={inputClass} value={anyForm.productName} onChange={(e) => setForm({ ...anyForm, productName: e.target.value })} /></Field>
                  <Field label="Product Code"><input className={`${inputClass} bg-slate-50 text-slate-500`} value={anyForm.productCode || "Will be auto-generated as PRD0001"} readOnly /></Field>
                  <Field label="Vendor"><InventoryLookupField lookup="vendors" value={anyForm.vendor || ""} displayValue={anyForm.vendorLabel || ""} onChange={(option) => setForm({ ...anyForm, vendor: option?.id || "", vendorLabel: option?.label || "" })} /></Field>
                  <Field label="Manufacturer"><input className={inputClass} value={anyForm.manufacturer || ""} onChange={(e) => setForm({ ...anyForm, manufacturer: e.target.value })} /></Field>
                  <Field label="Product Category"><input className={inputClass} value={anyForm.productCategory || ""} onChange={(e) => setForm({ ...anyForm, productCategory: e.target.value })} /></Field>
                  <Field label="Unit Price"><input type="number" className={inputClass} value={anyForm.unitPrice} onChange={(e) => setForm({ ...anyForm, unitPrice: Number(e.target.value) })} /></Field>
                  <Field label="Commission Rate"><input type="number" className={inputClass} value={anyForm.commissionRate} onChange={(e) => setForm({ ...anyForm, commissionRate: Number(e.target.value) })} /></Field>
                  <Field label="Tax"><input type="number" className={inputClass} value={anyForm.tax} onChange={(e) => setForm({ ...anyForm, tax: Number(e.target.value) })} /></Field>
                  <Field label="Quantity In Stock"><input type="number" className={inputClass} value={anyForm.quantityInStock} onChange={(e) => setForm({ ...anyForm, quantityInStock: Number(e.target.value) })} /></Field>
                  <Field label="Quantity In Demand"><input type="number" className={inputClass} value={anyForm.quantityInDemand} onChange={(e) => setForm({ ...anyForm, quantityInDemand: Number(e.target.value) })} /></Field>
                  <Field label="Reorder Level"><input type="number" className={inputClass} value={anyForm.reorderLevel} onChange={(e) => setForm({ ...anyForm, reorderLevel: Number(e.target.value) })} /></Field>
                  <Field label="Usage Unit"><input className={inputClass} value={anyForm.usageUnit || ""} onChange={(e) => setForm({ ...anyForm, usageUnit: e.target.value })} /></Field>
                  <Field label="Support Start Date"><input type="date" className={inputClass} value={anyForm.supportStartDate || ""} onChange={(e) => setForm({ ...anyForm, supportStartDate: e.target.value })} /></Field>
                  <Field label="Support Expiry Date"><input type="date" className={inputClass} value={anyForm.supportExpiryDate || ""} onChange={(e) => setForm({ ...anyForm, supportExpiryDate: e.target.value })} /></Field>
                  <div className="md:col-span-2"><Field label="Description"><textarea className={textareaClass} value={anyForm.description || ""} onChange={(e) => setForm({ ...anyForm, description: e.target.value })} /></Field></div>
                </>
              )}
              {moduleKey === "vendors" && (
                <>
                  <Field label="Vendor Name"><input className={inputClass} value={anyForm.vendorName} onChange={(e) => setForm({ ...anyForm, vendorName: e.target.value })} /></Field>
                  <Field label="Email"><input className={inputClass} value={anyForm.email || ""} onChange={(e) => setForm({ ...anyForm, email: e.target.value })} /></Field>
                  <Field label="Phone"><input className={inputClass} value={anyForm.phone || ""} onChange={(e) => setForm({ ...anyForm, phone: e.target.value })} /></Field>
                  <Field label="Website"><input className={inputClass} value={anyForm.website || ""} onChange={(e) => setForm({ ...anyForm, website: e.target.value })} /></Field>
                  <Field label="Category"><input className={inputClass} value={anyForm.category || ""} onChange={(e) => setForm({ ...anyForm, category: e.target.value })} /></Field>
                  <div className="md:col-span-2"><Field label="Description"><textarea className={textareaClass} value={anyForm.description || ""} onChange={(e) => setForm({ ...anyForm, description: e.target.value })} /></Field></div>
                </>
              )}
              {moduleKey === "price-books" && (
                <>
                  <Field label="Price Book Owner"><input className={inputClass} value={currentUserName} readOnly /></Field>
                  <Field label="Price Book Name"><input className={inputClass} value={anyForm.name} onChange={(e) => setForm({ ...anyForm, name: e.target.value })} /></Field>
                  <Field label="Active"><label className="flex h-[38px] items-center gap-2 rounded-md border border-slate-300 px-3"><input type="checkbox" checked={anyForm.active} onChange={(e) => setForm({ ...anyForm, active: e.target.checked })} />Active</label></Field>
                  <Field label="Pricing Model"><select className={inputClass} value={anyForm.pricingModel} onChange={(e) => setForm({ ...anyForm, pricingModel: e.target.value })}><option value="fixed">Fixed</option><option value="range">Range</option><option value="cpq">CPQ</option></select></Field>
                  <div className="md:col-span-2"><Field label="Description"><textarea className={textareaClass} value={anyForm.description || ""} onChange={(e) => setForm({ ...anyForm, description: e.target.value })} /></Field></div>
                  <div className="md:col-span-2 rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Pricing Details</h3><button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setForm({ ...anyForm, ranges: [...anyForm.ranges, { fromRange: 0, toRange: 0, discountPercentage: 0 }] })}>Add Row</button></div>
                    <div className="space-y-3">{anyForm.ranges.map((range: any, index: number) => <div key={index} className="grid gap-3 md:grid-cols-3"><input type="number" className={inputClass} placeholder="From Range" value={range.fromRange} onChange={(e) => { const ranges = [...anyForm.ranges]; ranges[index] = { ...ranges[index], fromRange: Number(e.target.value) }; setForm({ ...anyForm, ranges }); }} /><input type="number" className={inputClass} placeholder="To Range" value={range.toRange} onChange={(e) => { const ranges = [...anyForm.ranges]; ranges[index] = { ...ranges[index], toRange: Number(e.target.value) }; setForm({ ...anyForm, ranges }); }} /><input type="number" className={inputClass} placeholder="Discount %" value={range.discountPercentage} onChange={(e) => { const ranges = [...anyForm.ranges]; ranges[index] = { ...ranges[index], discountPercentage: Number(e.target.value) }; setForm({ ...anyForm, ranges }); }} /></div>)}</div>
                  </div>
                  <div className="md:col-span-2 rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Linked Products</h3><button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setForm({ ...anyForm, productLinks: [...anyForm.productLinks, { product: "", productLabel: "", listPrice: 0, active: true }] })}>Add Product</button></div>
                    <div className="space-y-3">{(anyForm.productLinks || []).map((link: any, index: number) => <div key={index} className="grid gap-3 md:grid-cols-[1fr_160px_120px]"><InventoryLookupField lookup="products" value={link.product || ""} displayValue={link.productLabel || ""} onChange={(option) => { const productLinks = [...anyForm.productLinks]; productLinks[index] = { ...productLinks[index], product: option?.id || "", productLabel: option?.label || "", listPrice: option?.unitPrice ?? productLinks[index].listPrice }; setForm({ ...anyForm, productLinks }); }} /><input type="number" className={inputClass} placeholder="List Price" value={link.listPrice || 0} onChange={(e) => { const productLinks = [...anyForm.productLinks]; productLinks[index] = { ...productLinks[index], listPrice: Number(e.target.value) }; setForm({ ...anyForm, productLinks }); }} /><label className="flex h-[38px] items-center gap-2 rounded-md border border-slate-300 px-3 text-sm text-slate-700"><input type="checkbox" checked={Boolean(link.active)} onChange={(e) => { const productLinks = [...anyForm.productLinks]; productLinks[index] = { ...productLinks[index], active: e.target.checked }; setForm({ ...anyForm, productLinks }); }} />Active</label></div>)}</div>
                  </div>
                </>
              )}
              {moduleKey === "configurator" && (
                <>
                  <Field label="Specify Name"><input className={inputClass} value={anyForm.name} onChange={(e) => setForm({ ...anyForm, name: e.target.value })} /></Field>
                  <Field label="Choose Module"><select className={inputClass} value={anyForm.targetModule} onChange={(e) => setForm({ ...anyForm, targetModule: e.target.value })}><option value="quotes">Quotes</option><option value="sales-orders">Sales Orders</option><option value="invoices">Invoices</option></select></Field>
                  <Field label="Choose Layout"><input className={inputClass} value={anyForm.layout || ""} onChange={(e) => setForm({ ...anyForm, layout: e.target.value })} /></Field>
                  <Field label="Choose Subform"><input className={inputClass} value={anyForm.subform || ""} onChange={(e) => setForm({ ...anyForm, subform: e.target.value })} /></Field>
                  <Field label="Choose Lookup"><input className={inputClass} value={anyForm.lookupField || ""} onChange={(e) => setForm({ ...anyForm, lookupField: e.target.value })} /></Field>
                  <div className="md:col-span-2"><Field label="Description"><textarea className={textareaClass} value={anyForm.description || ""} onChange={(e) => setForm({ ...anyForm, description: e.target.value })} /></Field></div>
                  <div className="md:col-span-2 rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Rule Builder</h3><button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setForm({ ...anyForm, rules: [...anyForm.rules, { criteria: "{\"all\":[]}", actionType: "mandatory_product", targetProduct: "", targetProductLabel: "", fieldName: "", fieldValue: "", metadata: "{}" }] })}>Add Rule</button></div>
                    <div className="space-y-4">{anyForm.rules.map((rule: any, index: number) => <div key={index} className="rounded-lg border border-slate-200 p-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Define Action"><select className={inputClass} value={rule.actionType} onChange={(e) => { const rules = [...anyForm.rules]; rules[index] = { ...rules[index], actionType: e.target.value }; setForm({ ...anyForm, rules }); }}><option value="mandatory_product">Add Mandatory Product</option><option value="suggest_product">Suggest Product</option><option value="field_update">Invoiced Items Field Update</option></select></Field><Field label="Choose Products"><InventoryLookupField lookup="products" value={rule.targetProduct || ""} displayValue={rule.targetProductLabel || ""} onChange={(option) => { const rules = [...anyForm.rules]; rules[index] = { ...rules[index], targetProduct: option?.id || "", targetProductLabel: option?.label || "" }; setForm({ ...anyForm, rules }); }} /></Field><Field label="Criteria"><textarea className={textareaClass} value={rule.criteria} onChange={(e) => { const rules = [...anyForm.rules]; rules[index] = { ...rules[index], criteria: e.target.value }; setForm({ ...anyForm, rules }); }} /></Field><Field label="Field Name"><input className={inputClass} value={rule.fieldName || ""} onChange={(e) => { const rules = [...anyForm.rules]; rules[index] = { ...rules[index], fieldName: e.target.value }; setForm({ ...anyForm, rules }); }} /></Field></div></div>)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {(moduleKey === "quotes" || moduleKey === "sales-orders" || moduleKey === "purchase-orders" || moduleKey === "invoices") && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 text-sm font-semibold text-slate-800">{moduleKey === "quotes" ? "Quote Information" : moduleKey === "sales-orders" ? "Sales Order Information" : moduleKey === "purchase-orders" ? "Purchase Order Information" : "Invoice Information"}</div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Owner"><input className={inputClass} value={currentUserName} readOnly /></Field>
                <Field label="Subject"><input className={inputClass} value={anyForm.subject || ""} onChange={(e) => setForm({ ...anyForm, subject: e.target.value })} /></Field>
                {moduleKey === "quotes" && <Field label="Quote Stage"><input className={inputClass} value={anyForm.quoteStage || ""} onChange={(e) => setForm({ ...anyForm, quoteStage: e.target.value })} /></Field>}
                {moduleKey === "quotes" && <Field label="Team"><input className={inputClass} value={anyForm.team || ""} onChange={(e) => setForm({ ...anyForm, team: e.target.value })} /></Field>}
                {moduleKey === "quotes" && <Field label="Price Book"><InventoryLookupField lookup="price-books" value={anyForm.priceBook || ""} displayValue={anyForm.priceBookLabel || ""} onChange={(option) => setForm({ ...anyForm, priceBook: option?.id || "", priceBookLabel: option?.label || "" })} /></Field>}
                {moduleKey === "sales-orders" && <Field label="Customer No"><input className={inputClass} value={anyForm.customerNo || ""} onChange={(e) => setForm({ ...anyForm, customerNo: e.target.value })} /></Field>}
                {moduleKey === "purchase-orders" && <Field label="Requisition Number"><input className={inputClass} value={anyForm.requisitionNumber || ""} onChange={(e) => setForm({ ...anyForm, requisitionNumber: e.target.value })} /></Field>}
                {moduleKey === "invoices" && <Field label="Invoice Date"><input type="date" className={inputClass} value={anyForm.invoiceDate || ""} onChange={(e) => setForm({ ...anyForm, invoiceDate: e.target.value })} /></Field>}
                {(moduleKey === "sales-orders" || moduleKey === "purchase-orders" || moduleKey === "invoices") && <Field label="Status"><input className={inputClass} value={anyForm.status || ""} onChange={(e) => setForm({ ...anyForm, status: e.target.value })} /></Field>}
                <Field label="Carrier"><input className={inputClass} value={anyForm.carrier || ""} onChange={(e) => setForm({ ...anyForm, carrier: e.target.value })} /></Field>
                {moduleKey === "quotes" && <Field label="Valid Until"><input type="date" className={inputClass} value={anyForm.validUntil || ""} onChange={(e) => setForm({ ...anyForm, validUntil: e.target.value })} /></Field>}
                {(moduleKey === "sales-orders" || moduleKey === "purchase-orders" || moduleKey === "invoices") && <Field label="Due Date"><input type="date" className={inputClass} value={anyForm.dueDate || ""} onChange={(e) => setForm({ ...anyForm, dueDate: e.target.value })} /></Field>}
                {moduleKey === "sales-orders" && <Field label="Quote Name"><InventoryLookupField lookup="quotes" value={anyForm.quote || ""} displayValue={anyForm.quoteLabel || ""} onChange={(option) => setForm({ ...anyForm, quote: option?.id || "", quoteLabel: option?.label || "" })} /></Field>}
                {moduleKey !== "purchase-orders" && <Field label="Account Name"><InventoryLookupField lookup="accounts" value={anyForm.account || ""} displayValue={anyForm.accountLabel || ""} onChange={(option) => setForm({ ...anyForm, account: option?.id || "", accountLabel: option?.label || "" })} /></Field>}
                <Field label="Contact Name"><InventoryLookupField lookup="contacts" extraQuery={anyForm.account ? { account_id: String(anyForm.account) } : undefined} value={anyForm.contact || ""} displayValue={anyForm.contactLabel || ""} onChange={(option) => setForm({ ...anyForm, contact: option?.id || "", contactLabel: option?.label || "" })} /></Field>
                {moduleKey !== "purchase-orders" && <Field label="Deal Name"><InventoryLookupField lookup="deals" value={anyForm.deal || ""} displayValue={anyForm.dealLabel || ""} onChange={(option) => setForm({ ...anyForm, deal: option?.id || "", dealLabel: option?.label || "" })} /></Field>}
                {moduleKey === "purchase-orders" && <Field label="Vendor Name"><div className="space-y-2"><InventoryLookupField lookup="vendors" value={anyForm.vendor || ""} displayValue={anyForm.vendorLabel || ""} onChange={(option) => setForm({ ...anyForm, vendor: option?.id || "", vendorLabel: option?.label || "" })} /><button type="button" className="text-sm font-medium text-blue-600" onClick={() => setQuickVendorOpen(true)}>New Vendor</button></div></Field>}
                {moduleKey === "sales-orders" && <Field label="Pending"><label className="flex h-[38px] items-center gap-2 rounded-md border border-slate-300 px-3"><input type="checkbox" checked={Boolean(anyForm.pending)} onChange={(e) => setForm({ ...anyForm, pending: e.target.checked })} />Pending</label></Field>}
                {moduleKey === "invoices" && <Field label="Sales Order"><InventoryLookupField lookup="sales-orders" value={anyForm.salesOrder || ""} displayValue={anyForm.salesOrderLabel || ""} onChange={(option) => setForm({ ...anyForm, salesOrder: option?.id || "", salesOrderLabel: option?.label || "" })} /></Field>}
                {moduleKey === "invoices" && <Field label="Purchase Order"><InventoryLookupField lookup="purchase-orders" value={anyForm.purchaseOrder || ""} displayValue={anyForm.purchaseOrderLabel || ""} onChange={(option) => setForm({ ...anyForm, purchaseOrder: option?.id || "", purchaseOrderLabel: option?.label || "" })} /></Field>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between"><div className="text-sm font-semibold text-slate-800">Address Information</div>{moduleKey === "invoices" && <button type="button" className="text-sm font-medium text-blue-600" onClick={() => setForm({ ...anyForm, shippingStreet: anyForm.billingStreet, shippingCity: anyForm.billingCity, shippingState: anyForm.billingState, shippingCountry: anyForm.billingCountry, shippingZipCode: anyForm.billingZipCode })}>Copy Address</button>}</div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid gap-3">
                  <h4 className="text-sm font-medium text-slate-700">Billing Address</h4>
                  <input className={inputClass} placeholder="Street" value={anyForm.billingStreet || ""} onChange={(e) => setForm({ ...anyForm, billingStreet: e.target.value })} />
                  <input className={inputClass} placeholder="City" value={anyForm.billingCity || ""} onChange={(e) => setForm({ ...anyForm, billingCity: e.target.value })} />
                  <input className={inputClass} placeholder="State" value={anyForm.billingState || ""} onChange={(e) => setForm({ ...anyForm, billingState: e.target.value })} />
                  <input className={inputClass} placeholder="Country" value={anyForm.billingCountry || ""} onChange={(e) => setForm({ ...anyForm, billingCountry: e.target.value })} />
                  <input className={inputClass} placeholder="Zip Code" value={anyForm.billingZipCode || ""} onChange={(e) => setForm({ ...anyForm, billingZipCode: e.target.value })} />
                </div>
                <div className="grid gap-3">
                  <h4 className="text-sm font-medium text-slate-700">Shipping Address</h4>
                  <input className={inputClass} placeholder="Street" value={anyForm.shippingStreet || ""} onChange={(e) => setForm({ ...anyForm, shippingStreet: e.target.value })} />
                  <input className={inputClass} placeholder="City" value={anyForm.shippingCity || ""} onChange={(e) => setForm({ ...anyForm, shippingCity: e.target.value })} />
                  <input className={inputClass} placeholder="State" value={anyForm.shippingState || ""} onChange={(e) => setForm({ ...anyForm, shippingState: e.target.value })} />
                  <input className={inputClass} placeholder="Country" value={anyForm.shippingCountry || ""} onChange={(e) => setForm({ ...anyForm, shippingCountry: e.target.value })} />
                  <input className={inputClass} placeholder="Zip Code" value={anyForm.shippingZipCode || ""} onChange={(e) => setForm({ ...anyForm, shippingZipCode: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <InventoryDocumentItemsTable title={moduleKey === "quotes" ? "Quoted Items" : moduleKey === "sales-orders" ? "Ordered Items" : moduleKey === "purchase-orders" ? "Purchase Items" : "Invoiced Items"} items={anyForm.items as InventoryLineItem[]} onChange={syncItems} showDescription={moduleKey === "invoices"} />
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4"><Field label="Adjustment"><input type="number" className={inputClass} value={anyForm.adjustment || 0} onChange={(e) => { const next = recalculateDocument(anyForm.items as InventoryLineItem[], Number(e.target.value)); setForm({ ...anyForm, ...next }); }} /></Field></div>
                <InventoryTotalsPanel subtotal={totals?.subtotal || 0} discount={totals?.discount || 0} tax={totals?.tax || 0} adjustment={totals?.adjustment || 0} grandTotal={totals?.grandTotal || 0} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4">
                <Field label="Terms and Conditions"><textarea className={textareaClass} value={anyForm.termsAndConditions || ""} onChange={(e) => setForm({ ...anyForm, termsAndConditions: e.target.value })} /></Field>
                <Field label="Description"><textarea className={textareaClass} value={anyForm.description || ""} onChange={(e) => setForm({ ...anyForm, description: e.target.value })} /></Field>
              </div>
            </div>
          </>
        )}
      </div>

      <InventoryQuickVendorModal open={quickVendorOpen} onClose={() => setQuickVendorOpen(false)} onSaved={(vendor) => setForm({ ...anyForm, vendor: vendor.id, vendorLabel: vendor.label })} />
      <InventoryReviewChangesModal open={reviewOpen} data={reviewData} onClose={() => setReviewOpen(false)} onConfirm={() => { setReviewOpen(false); void save(); }} />
    </DashboardLayout>
  );
}
