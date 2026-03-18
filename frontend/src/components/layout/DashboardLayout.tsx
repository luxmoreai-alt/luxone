import { createContext, useContext, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// Context to detect when we're already inside the persistent layout
const InsideLayoutContext = createContext(false);

/**
 * Persistent layout route — use this ONCE in App.tsx as a parent route.
 * It keeps Sidebar + Topbar mounted across navigations; only <Outlet> changes.
 */
export function DashboardLayoutRoute() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <InsideLayoutContext.Provider value={true}>
      <div className="flex h-screen overflow-hidden bg-slate-100">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 min-h-0 overflow-y-auto p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </InsideLayoutContext.Provider>
  );
}

/**
 * DashboardLayout used inside individual pages.
 * - When inside the persistent layout route → renders children directly (no double sidebar).
 * - When standalone (e.g. during testing) → renders the full layout.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const isInsideLayout = useContext(InsideLayoutContext);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Already wrapped by the persistent layout — just render content
  if (isInsideLayout) {
    return <>{children}</>;
  }

  // Fallback: standalone layout (pages not inside the persistent route)
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 min-h-0 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
