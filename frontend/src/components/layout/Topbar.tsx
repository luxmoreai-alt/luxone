import {
  Bell,
  CalendarDays,
  Gauge,
  Grid2x2,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";

type TopbarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Topbar({
  sidebarOpen,
  setSidebarOpen,
}: TopbarProps) {
  return (
    <header className="flex h-[58px] items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={18} />
        </button>

        <h1 className="text-[18px] font-medium text-slate-800">Home</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden h-[32px] w-[235px] items-center gap-2 rounded-md bg-[#eef3fb] px-3 md:flex">
          <Search size={16} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search records"
            className="w-full bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-500"
          />
        </div>

        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-md border border-[#4c6fff] text-[#4c6fff] transition hover:bg-blue-50"
        >
          <Plus size={16} />
        </button>

        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100"
        >
          <Gauge size={16} />
        </button>

        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100"
        >
          <Bell size={16} />
        </button>

        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100"
        >
          <CalendarDays size={16} />
        </button>

        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100"
        >
          <Sparkles size={16} />
        </button>

        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100"
        >
          <Settings size={16} />
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
        >
          <User size={16} />
        </button>

        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100"
        >
          <Grid2x2 size={16} />
        </button>
      </div>
    </header>
  );
}