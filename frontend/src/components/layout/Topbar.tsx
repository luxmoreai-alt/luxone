import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Gauge,
  Grid2x2,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  X,
  Mail,
  Shield,
  LogOut,
  Building2,
  UserCog,
  Briefcase,
  Clock,
  Loader2,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";

type TopbarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

type LoggedInUser = {
  name?: string;
  full_name?: string;
  firstName?: string;
  first_name?: string;
  username?: string;
  email?: string;
  role?: string;
  id?: string | number;
  is_admin?: boolean;
};

type FullUserDetail = {
  id: number;
  email: string;
  name?: string;
  role: string;
  role_display?: string;
  department?: string;
  department_display?: string;
  status?: string;
  status_display?: string;
  is_active: boolean;
  must_change_password?: boolean;
  manager_email?: string | null;
  organization_name?: string | null;
  created_at?: string;
};

const getPageTitle = (pathname: string) => {
  if (pathname === "/home") return "Home";
  if (pathname === "/leads" || pathname.startsWith("/leads/")) return "Leads";
  if (pathname === "/contacts" || pathname.startsWith("/contacts/")) return "Contacts";
  if (pathname === "/accounts" || pathname.startsWith("/accounts/")) return "Accounts";
  if (pathname === "/deals" || pathname.startsWith("/deals/")) return "Deals";
  if (pathname === "/campaigns" || pathname.startsWith("/campaigns/")) return "Campaigns";
  if (pathname === "/support/cases" || pathname.startsWith("/support/cases/")) return "Cases";
  if (pathname === "/support/solutions" || pathname.startsWith("/support/solutions/")) return "Solutions";
  if (pathname === "/services/business-hours" || pathname.startsWith("/services/business-hours/")) return "Business Hours";
  if (pathname === "/services/catalog" || pathname.startsWith("/services/catalog/")) return "Services Catalog";
  if (pathname === "/services/appointments" || pathname.startsWith("/services/appointments/")) return "Appointments";
  if (pathname === "/services/job-sheets" || pathname.startsWith("/services/job-sheets/")) return "Job Sheets";
  if (pathname === "/services/settings/company-details") return "Company Details";
  if (pathname === "/services/settings/domain-mapping") return "Domain Mapping";
  if (pathname === "/services/settings/fiscal-year") return "Fiscal Year";
  if (pathname === "/services/settings/holidays") return "Holidays";
  if (pathname === "/products" || pathname.startsWith("/products/")) return "Products";
  if (pathname === "/price-books" || pathname.startsWith("/price-books/")) return "Price Books";
  if (pathname === "/quotes" || pathname.startsWith("/quotes/")) return "Quotes";
  if (pathname === "/sales-orders" || pathname.startsWith("/sales-orders/")) return "Sales Orders";
  if (pathname === "/purchase-orders" || pathname.startsWith("/purchase-orders/")) return "Purchase Orders";
  if (pathname === "/invoices" || pathname.startsWith("/invoices/")) return "Invoices";
  if (pathname === "/vendors" || pathname.startsWith("/vendors/")) return "Vendors";
  if (pathname === "/reports") return "Reports";
  if (pathname === "/analytics") return "Analytics";
  if (pathname === "/my-requests") return "My Requests";
  return "";
};

export default function Topbar({
  sidebarOpen,
  setSidebarOpen,
}: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<LoggedInUser>({});
  const [fullUser, setFullUser] = useState<FullUserDetail | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("loggedInUser");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse logged in user:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (!profileOpen || fullUser) return;
    setLoadingFull(true);
    apiRequest<FullUserDetail>("/auth/manage-users/me/")
      .then((data) => setFullUser(data))
      .catch(() => {})
      .finally(() => setLoadingFull(false));
  }, [profileOpen, fullUser]);

  const displayName =
    user.name ||
    user.full_name ||
    user.firstName ||
    user.first_name ||
    user.username ||
    user.email ||
    "User";

  const displayEmail = user.email || "No email";

  const handleLogout = () => {
    // Clear all auth keys and fire the logout event so RequireAuth updates
    ["accessToken", "refreshToken", "loggedInUser", "isLoggedIn"].forEach(
      (key) => localStorage.removeItem(key)
    );
    window.dispatchEvent(new CustomEvent("auth:logout"));
    navigate("/login");
  };

  return (
    <>
      <header className="flex h-[62px] items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="mr-3 flex h-[36px] w-[36px] items-center justify-center rounded-md hover:bg-slate-100 md:hidden"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu size={18} />
          </button>

          <h1 className="text-[18px] font-medium text-slate-800">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden h-[32px] w-[235px] items-center gap-2 rounded-md bg-[#eef3fb] px-3 md:flex">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search records"
              className="w-full bg-transparent text-[14px] outline-none"
            />
          </div>

          <button className="flex h-[32px] w-[32px] items-center justify-center rounded-md border border-[#4c6fff] text-[#4c6fff]">
            <Plus size={16} />
          </button>

          <button className="flex h-[32px] w-[32px] items-center justify-center rounded-md hover:bg-slate-100">
            <Gauge size={16} />
          </button>

          <button className="flex h-[32px] w-[32px] items-center justify-center rounded-md hover:bg-slate-100">
            <Bell size={16} />
          </button>

          <button className="flex h-[32px] w-[32px] items-center justify-center rounded-md hover:bg-slate-100">
            <CalendarDays size={16} />
          </button>

          <button className="flex h-[32px] w-[32px] items-center justify-center rounded-md hover:bg-slate-100">
            <Sparkles size={16} />
          </button>

          <button className="flex h-[32px] w-[32px] items-center justify-center rounded-md hover:bg-slate-100">
            <Settings size={16} />
          </button>

          <div className="mx-1 h-5 w-px bg-slate-200" />

          <button
            onClick={() => setProfileOpen(true)}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
          >
            <User size={16} />
          </button>

          <button className="flex h-[32px] w-[32px] items-center justify-center rounded-md hover:bg-slate-100">
            <Grid2x2 size={16} />
          </button>
        </div>
      </header>

      {profileOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/25"
            onClick={() => setProfileOpen(false)}
          />

          <div className="absolute right-0 top-0 h-full w-full max-w-[360px] bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  User Details
                </h2>

                <button
                  onClick={() => setProfileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* Avatar + name */}
                <div className="mb-5 flex items-center gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold uppercase ${
                    fullUser?.status === "terminated" ? "bg-red-100 text-red-600"
                    : fullUser?.status === "inactive" ? "bg-slate-100 text-slate-500"
                    : "bg-blue-100 text-blue-700"
                  }`}>
                    {displayName[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-slate-900">{displayName}</h3>
                    <p className="truncate text-xs text-slate-400">{displayEmail}</p>
                    {fullUser?.status && (
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        fullUser.status === "active" ? "bg-green-100 text-green-700"
                        : fullUser.status === "inactive" ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          fullUser.status === "active" ? "bg-green-500"
                          : fullUser.status === "inactive" ? "bg-amber-500"
                          : "bg-red-500"
                        }`} />
                        {fullUser.status_display || fullUser.status}
                      </span>
                    )}
                  </div>
                </div>

                {loadingFull ? (
                  <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 size={20} className="animate-spin mr-2" /> Loading details…
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { icon: <Mail size={14} />, label: "Email", value: fullUser?.email || displayEmail },
                      { icon: <Shield size={14} />, label: "Role", value: fullUser?.role_display || fullUser?.role || user.role || "—" },
                      { icon: <Briefcase size={14} />, label: "Department", value: fullUser?.department_display || fullUser?.department || "—" },
                      { icon: <Building2 size={14} />, label: "Organization", value: fullUser?.organization_name || "—" },
                      ...(fullUser?.manager_email ? [{ icon: <UserCog size={14} />, label: "Manager", value: fullUser.manager_email }] : []),
                      { icon: <Clock size={14} />, label: "Member Since", value: fullUser?.created_at ? new Date(fullUser.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                        <span className="mt-0.5 text-slate-400">{icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                          <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 p-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
