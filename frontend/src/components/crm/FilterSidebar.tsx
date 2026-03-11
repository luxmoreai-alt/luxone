import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

type FilterSection = {
  title: string;
  items: string[];
};

type FilterSidebarProps = {
  title: string;
  sections: FilterSection[];
};

export default function FilterSidebar({
  title,
  sections,
}: FilterSidebarProps) {
  const [search, setSearch] = useState("");

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.title, true]))
  );

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sections;

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [search, sections]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside className="w-[280px] shrink-0 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-[15px] font-semibold text-slate-800">{title}</h3>

      <div className="mb-5 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
        <Search size={16} className="text-slate-500" />
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="space-y-4">
        {filteredSections.map((section) => {
          const isOpen = openSections[section.title];

          return (
            <div key={section.title}>
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between text-left text-[15px] font-semibold text-slate-800"
              >
                <span>{section.title}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <label
                      key={item}
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}