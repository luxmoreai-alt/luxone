import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Gauge,
  Grid2x2,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  X,
  Mail,
  Shield,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

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

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case "/home":
      return "Home";
    case "/leads":
      return "Leads";
    case "/contacts":
      return "Contacts";
    case "/accounts":
      return "Accounts";
    case "/deals":
      return "Deals";
    case "/reports":
      return "Reports";
    case "/analytics":
      return "Analytics";
    case "/my-requests":
      return "My Requests";
    default:
      return "";
  }
};

export default function Topbar(_: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<LoggedInUser>({});

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

  const displayName =
    user.name ||
    user.full_name ||
    user.firstName ||
    user.first_name ||
    user.username ||
    user.email ||
    "User";

  const displayEmail = user.email || "No email";
  const displayRole = user.is_admin ? "Administrator" : user.role || "User";
  const displayId = user.id || "N/A";

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("loggedInUser");
    navigate("/login");
  };

  return (
    <>
      <header className="flex h-[62px] items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center">
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

              <div className="flex-1 p-5">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <UserCircle2 size={34} className="text-slate-600" />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-slate-800">
                      {displayName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{displayRole}</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      User ID
                    </p>
                    <p className="mt-1 text-sm text-slate-800">{displayId}</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail size={16} className="mt-0.5 text-slate-500" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Email
                      </p>
                      <p className="mt-1 text-sm text-slate-800">{displayEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield size={16} className="mt-0.5 text-slate-500" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Role
                      </p>
                      <p className="mt-1 text-sm text-slate-800">{displayRole}</p>
                    </div>
                  </div>
                </div>
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