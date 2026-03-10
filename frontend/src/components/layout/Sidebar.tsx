import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BadgeDollarSign,
  BookOpenText,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDot,
  ClipboardList,
  FileSignature,
  FileText,
  Folder,
  HandHelping,
  Home,
  Inbox,
  Lightbulb,
  MapPinned,
  Megaphone,
  Package,
  Phone,
  PieChart,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  Share2,
  ShoppingBag,
  ShoppingCart,
  SquareKanban,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

type PrimaryItem = {
  label: string;
  icon: React.ElementType;
  active?: boolean;
};

type SubMenuItem = {
  label: string;
  icon: React.ElementType;
};

type WorkspaceItem = {
  label: string;
  icon: React.ElementType;
  expandable?: boolean;
  children?: SubMenuItem[];
};

const primaryItems: PrimaryItem[] = [
  { label: "Home", icon: Home, active: true },
  { label: "Reports", icon: BarChart3 },
  { label: "Analytics", icon: PieChart },
  { label: "My Requests", icon: ClipboardList },
];

const workspaceItems: WorkspaceItem[] = [
  {
    label: "Sales",
    icon: ShoppingBag,
    expandable: true,
    children: [
      { label: "Leads", icon: CircleDot },
      { label: "Contacts", icon: Users },
      { label: "Accounts", icon: Building2 },
      { label: "Deals", icon: BadgeDollarSign },
      { label: "Forecasts", icon: TrendingUp },
      { label: "Documents", icon: FileText },
      { label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Activities",
    icon: Search,
    expandable: true,
    children: [
      { label: "Tasks", icon: CircleDot },
      { label: "Meetings", icon: CalendarDays },
      { label: "Calls", icon: Phone },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    expandable: true,
    children: [
      { label: "Products", icon: CircleDot },
      { label: "Price Books", icon: BookOpenText },
      { label: "Quotes", icon: FileSignature },
      { label: "Sales Orders", icon: ShoppingCart },
      { label: "Purchase Orders", icon: ReceiptText },
      { label: "Invoices", icon: FileText },
      { label: "Vendors", icon: Truck },
    ],
  },
  {
    label: "Support",
    icon: HandHelping,
    expandable: true,
    children: [
      { label: "Cases", icon: CircleDot },
      { label: "Solutions", icon: Lightbulb },
    ],
  },
  {
    label: "Integrations",
    icon: Settings2,
    expandable: true,
    children: [
      { label: "SalesInbox", icon: Inbox },
      { label: "Social", icon: Share2 },
      { label: "Visits", icon: MapPinned },
    ],
  },
  { label: "Services", icon: Wrench, expandable: false },
  { label: "Projects", icon: Folder, expandable: false },
  { label: "Voice of the Customer", icon: SquareKanban, expandable: false },
];

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps) {
  const navigate = useNavigate();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Sales: false,
    Activities: false,
    Inventory: false,
    Support: false,
    Integrations: false,
  });

  const handleToggleMenu = (label: string) => {
    if (!sidebarOpen) return;

    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handlePlusClick = (label: string) => {
    console.log(`Plus clicked for ${label}`);
  };

  const handlePrimaryNavigation = (label: string) => {
    if (label === "Home") {
      navigate("/home");
    }
  };

  const handleChildNavigation = (parentLabel: string, childLabel: string) => {
    if (parentLabel === "Sales") {
      if (childLabel === "Leads") navigate("/leads");
      if (childLabel === "Contacts") navigate("/contacts");
      if (childLabel === "Accounts") navigate("/accounts");
    }
  };

  return (
    <aside
      className={`hidden shrink-0 overflow-hidden bg-[#1f3566] text-white transition-all duration-300 md:flex md:flex-col ${
        sidebarOpen ? "w-56" : "w-14"
      }`}
    >
      <div className={sidebarOpen ? "min-w-[224px]" : "min-w-[56px]"}>
        <div
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`flex cursor-pointer items-center transition hover:opacity-90 ${
            sidebarOpen
              ? "justify-start px-3 pt-3 pb-2"
              : "justify-center px-2 pt-3 pb-2"
          }`}
        >
          <img
            src="/logo.png"
            alt="Zora CRM Logo"
            className="h-7 w-7 rounded-md object-contain"
          />

          {sidebarOpen && (
            <div className="ml-2.5 text-[17px] font-bold">Zora CRM</div>
          )}
        </div>

        <nav className={sidebarOpen ? "px-2.5" : "px-1.5"}>
          <div className="flex flex-col gap-0.5">
            {primaryItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handlePrimaryNavigation(item.label)}
                  title={!sidebarOpen ? item.label : undefined}
                  className={[
                    "flex w-full items-center rounded-lg text-left text-[14px] transition",
                    sidebarOpen
                      ? "gap-2 px-2.5 py-2"
                      : "justify-center px-2 py-2.5",
                    item.active
                      ? "bg-white/12 font-semibold"
                      : "text-white hover:bg-white/8",
                  ].join(" ")}
                >
                  <Icon size={17} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className={`my-3 border-t border-white/15 ${
            sidebarOpen ? "mx-2.5" : "mx-2"
          }`}
        />

        {sidebarOpen ? (
          <div className="px-2.5 pb-3">
            <div className="px-2.5 pb-2.5 text-[14px] font-semibold">
              CRM Teamspace
            </div>

            <div className="mx-1 mb-2.5 flex items-center gap-2 rounded-lg border border-white/15 px-2.5 py-2 text-slate-200">
              <Search size={15} />
              <span className="text-[14px]">Search</span>
            </div>

            <div className="flex flex-col gap-0.5">
              {workspaceItems.map((item) => {
                const Icon = item.icon;
                const isOpen = !!openMenus[item.label];

                return (
                  <div key={item.label}>
                    <div className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-[14px] transition hover:bg-white/8">
                      <button
                        type="button"
                        onClick={() =>
                          item.expandable && handleToggleMenu(item.label)
                        }
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                      </button>

                      {item.expandable && (
                        <div
                          className={`flex items-center gap-0.5 transition ${
                            isOpen
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handlePlusClick(item.label)}
                            className="rounded p-1 hover:bg-white/10"
                            aria-label={`Add item in ${item.label}`}
                          >
                            <Plus size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleMenu(item.label)}
                            className="rounded p-1 hover:bg-white/10"
                            aria-label={`Toggle ${item.label} submenu`}
                          >
                            <ChevronDown
                              size={13}
                              className={`transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>

                    {item.expandable && isOpen && item.children && (
                      <div className="ml-6 mt-1 flex flex-col gap-0.5">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;

                          return (
                            <button
                              key={child.label}
                              type="button"
                              onClick={() =>
                                handleChildNavigation(item.label, child.label)
                              }
                              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-slate-200 transition hover:bg-white/8"
                            >
                              <ChildIcon size={13} />
                              <span>{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-1.5 pb-3">
            <div className="flex flex-col gap-0.5">
              {workspaceItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    title={item.label}
                    className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 transition hover:bg-white/8"
                  >
                    <Icon size={17} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}