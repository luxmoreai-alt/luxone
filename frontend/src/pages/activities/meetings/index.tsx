import { useCallback, useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FilterSidebar from "../../../components/crm/FilterSidebar";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { apiRequest } from "../../../api/client";
import type { FilterSection } from "../../../lib/shared/crmTypes";

type FilterMap = Record<string, string>;

interface Meeting {
  id: string | number;
  title: string;
  start_date: string;
  end_date?: string;
  location?: string;
  organizer?: { name?: string; email?: string };
  contact_name?: string;
  account_name?: string;
  status?: string;
  created_at?: string;
}

const MEETING_FILTER_SECTIONS: FilterSection[] = [
  {
    title: "Status",
    items: [{ label: "Status contains", key: "status" }],
  },
  {
    title: "Organizer",
    items: [{ label: "Organizer name", key: "organizer" }],
  },
  {
    title: "Related",
    items: [
      { label: "Related contact/account", key: "related" },
      { label: "Company / Account", key: "company" },
    ],
  },
];

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [, setFilters] = useState<FilterMap>({});

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<Meeting[] | { results: Meeting[] }>("/meetings/", { method: "GET" });
      if (Array.isArray(data)) {
        setMeetings(data);
      } else if (data && typeof data === "object" && Array.isArray((data as { results: Meeting[] }).results)) {
        setMeetings((data as { results: Meeting[] }).results);
      } else {
        setMeetings([]);
      }
    } catch (err) {
      console.error("Failed to load meetings:", err);
      setError(err instanceof Error ? err.message : "Unable to load meetings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  function formatDate(dateString?: string) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US") + " " + date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-6 py-6">
          <p className="text-sm text-slate-600">Loading meetings...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="px-6 py-6">
          <p className="text-sm text-rose-600">Error: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Meetings</h1>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50 ${
                filterOpen ? "bg-slate-100 shadow-sm" : "bg-white"
              }`}
            >
              <Filter size={16} />
              <span>Filters</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/meetings/create")}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Create Meeting
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          {filterOpen && (
            <FilterSidebar
              title="Filter Meetings by"
              sections={MEETING_FILTER_SECTIONS}
              onApply={(activeFilters) => setFilters(activeFilters)}
              onClear={() => setFilters({})}
            />
          )}

          <div className="flex-1">
            {meetings.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm font-medium text-slate-500">No meetings found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Title</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">From</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">To</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Location</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Related To</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Contact</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map((meeting) => (
                      <tr
                        key={meeting.id}
                        className="border-b transition hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/meetings/${meeting.id}`)}
                      >
                        <td className="px-6 py-4 text-sm text-blue-600 hover:underline font-medium">
                          {meeting.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(meeting.start_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(meeting.end_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {meeting.location || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {meeting.account_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {meeting.contact_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            meeting.status === "Completed" ? "bg-green-100 text-green-800" :
                            meeting.status === "Cancelled" ? "bg-red-100 text-red-800" :
                            meeting.status === "Rescheduled" ? "bg-yellow-100 text-yellow-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {meeting.status || "Scheduled"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
