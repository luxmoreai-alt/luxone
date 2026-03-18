import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  BarChart3,
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
  PanelLeft,
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
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

type NavItem = {
  label: string;
  icon: React.ElementType;
  path?: string;
  expandable?: boolean;
  children?: { label: string; icon: React.ElementType; path: string }[];
};

const primaryItems: NavItem[] = [
  { label: "Home", icon: Home, path: "/home" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Analytics", icon: PieChart, path: "/analytics" },
  { label: "My Requests", icon: ClipboardList, path: "/my-requests" },
];

const workspaceItems: NavItem[] = [
  {
    label: "Sales",
    icon: ShoppingBag,
    expandable: true,
    children: [
      { label: "Leads", icon: CircleDot, path: "/leads" },
      { label: "Contacts", icon: Users, path: "/contacts" },
      { label: "Accounts", icon: Building2, path: "/accounts" },
      { label: "Deals", icon: BadgeDollarSign, path: "/deals" },
      { label: "Forecasts", icon: TrendingUp, path: "/forecasts" },
      { label: "Documents", icon: FileText, path: "/documents" },
      { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
    ],
  },
  {
    label: "Activities",
    icon: Search,
    expandable: true,
    children: [
      { label: "Tasks", icon: CircleDot, path: "/tasks" },
      { label: "Meetings", icon: CalendarDays, path: "/meetings" },
      { label: "Calls", icon: Phone, path: "/calls" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    expandable: true,
    children: [
      { label: "Products", icon: CircleDot, path: "/products" },
      { label: "Price Books", icon: BookOpenText, path: "/price-books" },
      { label: "Quotes", icon: FileSignature, path: "/quotes" },
      { label: "Sales Orders", icon: ShoppingCart, path: "/sales-orders" },
      { label: "Purchase Orders", icon: ReceiptText, path: "/purchase-orders" },
      { label: "Invoices", icon: FileText, path: "/invoices" },
      { label: "Vendors", icon: Truck, path: "/vendors" },
    ],
  },
  {
    label: "Support",
    icon: HandHelping,
    expandable: true,
    children: [
      { label: "Cases", icon: CircleDot, path: "/support/cases" },
      { label: "Solutions", icon: Lightbulb, path: "/support/solutions" },
    ],
  },
  {
    label: "Integrations",
    icon: Settings2,
    expandable: true,
    children: [
      { label: "Email", icon: Inbox, path: "/integrations/email" },
      { label: "Social", icon: Share2, path: "/integrations/social" },
      { label: "Visitor Tracking", icon: MapPinned, path: "/integrations/visitors" },
    ],
  },
  {
    label: "Services",
    icon: Wrench,
    expandable: true,
    children: [
      { label: "Promo", icon: CircleDot, path: "/services/promo" },
      { label: "Business Hours", icon: CalendarDays, path: "/services/business-hours" },
      { label: "Catalog", icon: ClipboardList, path: "/services/catalog" },
      { label: "Appointments", icon: CalendarDays, path: "/services/appointments" },
      { label: "Company Details", icon: Building2, path: "/services/settings/company-details" },
      { label: "Domain Mapping", icon: MapPinned, path: "/services/settings/domain-mapping" },
      { label: "Fiscal Year", icon: BarChart3, path: "/services/settings/fiscal-year" },
      { label: "Holidays", icon: CalendarDays, path: "/services/settings/holidays" },
    ],
  },
  { label: "Projects", icon: Folder, path: "/projects" },
  { label: "Voice of the Customer", icon: SquareKanban },
];

const getParentMenuByPath = (pathname: string) => {
  for (const item of workspaceItems) {
    if (!item.children) continue;
    const hasMatch = item.children.some(
      (child) => pathname === child.path || pathname.startsWith(`${child.path}/`)
    );
    if (hasMatch) return item.label;
  }
  return null;
};

const initialOpenMenus = {
  Sales: true,
  Activities: false,
  Inventory: false,
  Support: false,
  Integrations: false,
  Services: false,
};

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isManager } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(initialOpenMenus);

  useEffect(() => {
    const parentMenu = getParentMenuByPath(location.pathname);
    setOpenMenus((prev) => {
      const nextState: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        nextState[key] = key === parentMenu;
      });
      return nextState;
    });
  }, [location.pathname]);

  const handleNavigate = (path?: string) => {
    if (!path) return;
    navigate(path);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleToggleMenu = (label: string) => {
    if (!sidebarOpen) return;
    setOpenMenus((prev) => {
      const nextState: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        nextState[key] = key === label ? !prev[key] : false;
      });
      return nextState;
    });
  };

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 h-screen overflow-y-auto bg-[#1f3566] text-white transition-all duration-300 md:static md:z-auto md:flex md:h-screen md:flex-col ${
          sidebarOpen
            ? "translate-x-0 w-56"
            : "-translate-x-full w-56 md:translate-x-0 md:w-14"
        }`}
      >
        <div className={`flex min-h-full flex-col ${sidebarOpen ? "min-w-[224px]" : "min-w-[56px]"}`}>
          {sidebarOpen ? (
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <div className="flex items-center">
                <img src="/logo.png" alt="Zora CRM Logo" className="h-7 w-7 rounded-md object-contain" />
                <div className="ml-2.5 text-[17px] font-bold">Zora CRM</div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/10"
                aria-label="Collapse sidebar"
              >
                <span className="hidden md:block">
                  <PanelLeft size={18} />
                </span>
                <span className="md:hidden">
                  <X size={18} />
                </span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center px-2 pt-3 pb-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-md transition hover:opacity-90"
                aria-label="Expand sidebar"
              >
                <img src="/logo.png" alt="Zora CRM Logo" className="h-7 w-7 rounded-md object-contain" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pb-3">
            <nav className={sidebarOpen ? "px-2.5" : "px-1.5"}>
              <div className="flex flex-col gap-0.5">
                {primaryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleNavigate(item.path)}
                      title={!sidebarOpen ? item.label : undefined}
                      className={[
                        "flex w-full items-center rounded-lg text-left text-[14px] transition",
                        sidebarOpen ? "gap-2 px-2.5 py-2" : "justify-center px-2 py-2.5",
                        location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                          ? "bg-white/12 font-semibold"
                          : "text-white hover:bg-white/8",
                      ].join(" ")}
                    >
                      <Icon size={17} />
                      {sidebarOpen && <span>{item.label}</span>}
                    </button>
                  );
                })}

                {(isAdmin || isManager) && (
                  <button
                    type="button"
                    onClick={() => handleNavigate("/home")}
                    title={!sidebarOpen ? "My Team" : undefined}
                    className={[
                      "flex w-full items-center rounded-lg text-left text-[14px] transition",
                      sidebarOpen ? "gap-2 px-2.5 py-2" : "justify-center px-2 py-2.5",
                      location.pathname === "/home" ? "bg-white/12 font-semibold" : "text-white hover:bg-white/8",
                    ].join(" ")}
                  >
                    <Users size={17} />
                    {sidebarOpen && <span>My Team</span>}
                  </button>
                )}
              </div>
            </nav>

            <div className={`my-3 border-t border-white/15 ${sidebarOpen ? "mx-2.5" : "mx-2"}`} />

            {sidebarOpen ? (
              <div className="px-2.5">
                <div className="px-2.5 pb-2.5 text-[14px] font-semibold">CRM Teamspace</div>
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
                              item.expandable ? handleToggleMenu(item.label) : handleNavigate(item.path)
                            }
                            className="flex flex-1 items-center gap-2 text-left"
                          >
                            <Icon size={15} />
                            <span>{item.label}</span>
                          </button>

                          {item.expandable && (
                            <div
                              className={`flex items-center gap-0.5 transition ${
                                isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => undefined}
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
                                  className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                                  onClick={() => handleNavigate(child.path)}
                                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
                                    location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
                                      ? "bg-white/12 font-semibold text-white"
                                      : "text-slate-200 hover:bg-white/8"
                                  }`}
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
              <div className="px-1.5">
                <div className="flex flex-col gap-0.5">
                  {workspaceItems.map((item) => {
                    const Icon = item.icon;
                    const fallbackPath = item.path ?? item.children?.[0]?.path;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        title={item.label}
                        onClick={() => handleNavigate(fallbackPath)}
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
        </div>
      </aside>
    </>
  );
}
