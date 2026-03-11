import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Ellipsis,
  Filter,
  ListFilter,
  PanelsTopLeft,
  ArrowUpDown,
  LayoutGrid,
  Table,
  ChartPie,
  MapPin,
  Search,
  Check,
} from "lucide-react";

type ModuleToolbarProps = {
  viewName: string;
  createButtonLabel: string;
  sortFields?: string[];
  isFilterOpen: boolean;
  onToggleFilter: () => void;
};

const defaultSortFields = [
  "None",
  "Address - City",
  "Address - Country / Region",
  "Address - Flat / House No./ Building / Apartment Name",
  "Address - Latitude",
  "Address - Longitude",
  "Address - State / Province",
  "Address - Street Address",
  "Address - Zip / Postal Code",
  "Annual Revenue",
  "Company",
  "Created By",
  "Created Time",
  "Distance",
  "Email",
  "Email Opt Out",
  "Fax",
  "First Name",
  "Industry",
  "Last Activity Time",
  "Last Name",
  "Lead Conversion Time",
  "Lead Name",
  "Lead Owner",
  "Lead Source",
  "Lead Status",
  "Mobile",
  "Modified By",
  "Modified Time",
  "No. of Employees",
  "Phone",
  "Rating",
  "Salutation",
  "Secondary Email",
  "Skype ID",
  "Title",
  "Twitter",
  "Unsubscribed Mode",
  "Unsubscribed Time",
  "Website",
];

export default function ModuleToolbar({
  viewName,
  createButtonLabel,
  sortFields,
  isFilterOpen,
  onToggleFilter,
}: ModuleToolbarProps) {
  const fields = sortFields?.length ? sortFields : defaultSortFields;

  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);

  const [selectedField, setSelectedField] = useState("None");
  const [selectedOrder, setSelectedOrder] = useState<"Ascending" | "Descending">(
    "Ascending"
  );
  const [searchText, setSearchText] = useState("");

  const modalRef = useRef<HTMLDivElement | null>(null);

  const filteredFields = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((item) => item.toLowerCase().includes(q));
  }, [fields, searchText]);

  const handleApplySort = () => {
    console.log("Apply sort:", {
      field: selectedField,
      order: selectedOrder,
    });
    setSortModalOpen(false);
    setFieldDropdownOpen(false);
    setOrderDropdownOpen(false);
  };

  const handleCancelSort = () => {
    setSortModalOpen(false);
    setFieldDropdownOpen(false);
    setOrderDropdownOpen(false);
    setSearchText("");
  };

  const toolbarIconButtonClass =
    "flex cursor-pointer items-center justify-center rounded-md p-2 text-slate-600 transition duration-150 hover:bg-slate-100 hover:shadow-sm active:bg-slate-200";

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <button className="cursor-pointer rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-200 hover:shadow-sm">
            {viewName}
          </button>

          <button type="button" className={toolbarIconButtonClass}>
            <Ellipsis size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="cursor-pointer rounded-md bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:shadow-sm">
            {createButtonLabel}
          </button>

          <button className="cursor-pointer rounded-md bg-gradient-to-b from-blue-500 to-blue-600 px-3 py-2 text-white transition duration-150 hover:shadow-sm">
            <ChevronDown size={16} />
          </button>

          <button className="cursor-pointer rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 transition duration-150 hover:bg-slate-200 hover:shadow-sm">
            <Ellipsis size={16} />
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleFilter}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-slate-700 transition duration-150 hover:shadow-sm active:bg-slate-200 ${
              isFilterOpen ? "bg-slate-100 shadow-sm" : "hover:bg-slate-100"
            }`}
          >
            <Filter size={16} />
            <span>Filter</span>
          </button>

          <button
            onClick={() => {
              setSortModalOpen((prev) => !prev);
              setFieldDropdownOpen(false);
              setOrderDropdownOpen(false);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-slate-700 transition duration-150 hover:bg-slate-100 hover:shadow-sm active:bg-slate-200"
          >
            <ArrowUpDown size={16} />
            <span>Sort</span>
          </button>

          <div className="mx-1 h-5 w-px bg-slate-200" />

          <button className="flex cursor-pointer items-center justify-center rounded-md bg-blue-50 p-2 text-blue-600 transition duration-150 hover:bg-blue-100 hover:shadow-sm active:bg-blue-100">
            <ListFilter size={16} />
          </button>

          <button className={toolbarIconButtonClass}>
            <PanelsTopLeft size={16} />
          </button>

          <button className={toolbarIconButtonClass}>
            <Table size={16} />
          </button>

          <button className={toolbarIconButtonClass}>
            <ChartPie size={16} />
          </button>

          <button className={toolbarIconButtonClass}>
            <LayoutGrid size={16} />
          </button>

          <button className={toolbarIconButtonClass}>
            <MapPin size={16} />
          </button>

          <button className={toolbarIconButtonClass}>
            <ChevronDown size={16} />
          </button>
        </div>

        {sortModalOpen && (
          <div
            ref={modalRef}
            className="absolute left-[78px] top-[52px] z-50 w-[385px] rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="p-5">
              <h3 className="mb-5 text-[15px] font-medium text-slate-700">
                Sort By
              </h3>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFieldDropdownOpen((prev) => !prev);
                      setOrderDropdownOpen(false);
                    }}
                    className="flex h-[38px] w-full cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="truncate">{selectedField}</span>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>

                  {fieldDropdownOpen && (
                    <div className="absolute left-0 top-[42px] z-50 w-[380px] rounded-md border border-slate-300 bg-white shadow-lg">
                      <div className="border-b border-slate-200 p-2">
                        <div className="flex items-center gap-2 rounded-md border border-blue-500 px-3 py-2">
                          <Search size={16} className="text-slate-500" />
                          <input
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent text-sm outline-none"
                          />
                        </div>
                      </div>

                      <div className="max-h-[220px] overflow-y-auto p-1">
                        {filteredFields.map((field) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              setSelectedField(field);
                              setFieldDropdownOpen(false);
                              setSearchText("");
                            }}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                              selectedField === field
                                ? "bg-slate-100 font-medium text-slate-800"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="w-4">
                              {selectedField === field && <Check size={16} />}
                            </span>
                            <span className="truncate">{field}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative w-[152px]">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderDropdownOpen((prev) => !prev);
                      setFieldDropdownOpen(false);
                    }}
                    className="flex h-[38px] w-full cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <span>{selectedOrder}</span>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>

                  {orderDropdownOpen && (
                    <div className="absolute left-0 top-[42px] z-50 w-full rounded-md border border-slate-300 bg-white shadow-lg">
                      {(["Ascending", "Descending"] as const).map((order) => (
                        <button
                          key={order}
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setOrderDropdownOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition ${
                            selectedOrder === order
                              ? "bg-slate-100 font-medium text-slate-800"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="w-4">
                            {selectedOrder === order && <Check size={16} />}
                          </span>
                          <span>{order}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelSort}
                  className="cursor-pointer rounded-md border border-slate-300 bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-200 hover:shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplySort}
                  className="cursor-pointer rounded-md bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition duration-150 hover:shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}