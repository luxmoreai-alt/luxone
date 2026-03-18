import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCampaigns, type CampaignRecord } from "../../lib/api/campaignsApi";

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CampaignRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCampaigns({ search });
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [search]);

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden bg-[#f5f7fb]">
        <div className="border-b border-[#d9e1ef] bg-[#f7f9fc] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-semibold text-[#1f2d3d]">Campaigns</h1>
              <p className="text-sm text-slate-500">Manage sales campaigns from live CRM data.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search campaigns"
                className="h-[38px] w-[240px] rounded-[6px] border border-[#cfd7e6] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#6d8dff]"
              />
              <button
                type="button"
                onClick={() => navigate("/campaigns/create")}
                className="rounded-[6px] bg-gradient-to-b from-[#4d76ff] to-[#365eea] px-4 py-2 text-[14px] font-medium text-white"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>

        <div className="h-[calc(100%-57px)] p-4">
          {loading ? (
            <div className="rounded-[10px] border border-[#d9e1ef] bg-white p-4 text-sm text-slate-600">
              Loading campaigns...
            </div>
          ) : error ? (
            <div className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-[#d9e1ef] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Campaign Name</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={6}>
                        No campaigns found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{row.campaignName}</td>
                        <td className="px-4 py-3">{row.campaignOwnerEmail || "-"}</td>
                        <td className="px-4 py-3">{row.type || "-"}</td>
                        <td className="px-4 py-3">{row.status || "-"}</td>
                        <td className="px-4 py-3">{row.startDate || "-"}</td>
                        <td className="px-4 py-3">{row.endDate || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

