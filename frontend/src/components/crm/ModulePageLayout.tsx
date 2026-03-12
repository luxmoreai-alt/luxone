import { useState } from "react";
import ModuleToolbar from "./ModuleToolbar";
import FilterSidebar from "./FilterSidebar";

type Column = {
  key: string;
  label: string;
};

type FilterSection = {
  title: string;
  items: string[];
};

type ModulePageLayoutProps = {
  title: string;
  viewName: string;
  createButtonLabel: string;
  filterTitle: string;
  filterSections: FilterSection[];
  columns: Column[];
  data: Record<string, string>[];
};

export default function ModulePageLayout({
  viewName,
  createButtonLabel,
  filterTitle,
  filterSections,
}: ModulePageLayoutProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  return (
    <div className="bg-[#f5f7fb]">
        <ModuleToolbar
          viewName={viewName}
          createButtonLabel={createButtonLabel}
          isFilterOpen={isFilterOpen}
          onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
          onCreateClick={() => {}}
        />

      <div className="flex gap-3 p-3">
        {isFilterOpen && (
          <FilterSidebar title={filterTitle} sections={filterSections} />
        )}

        <div className="flex min-h-[520px] min-w-0 flex-1 items-center justify-center border border-slate-200 bg-white">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-700">
              Table Placeholder
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Real table will be merged later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
