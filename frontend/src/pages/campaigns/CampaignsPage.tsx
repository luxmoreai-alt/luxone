import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCampaigns } from "../../lib/api/campaignsApi";

type CampaignRow = {
  id: number;
  campaign_name: string;
  type?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCampaigns();
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden bg-[#f5f7fb]">
        <div className="border-b border-[#d9e1ef] bg-[#f7f9fc] px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[18px] font-semibold text-[#1f2d3d]">Campaigns</h1>
            <button
              type="button"
              onClick={() => navigate("/campaigns/create")}
              className="rounded-[6px] bg-gradient-to-b from-[#4d76ff] to-[#365eea] px-4 py-2 text-[14px] font-medium text-white"
            >
              Create Campaign
            </button>
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
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={5}>
                        No campaigns found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{row.campaign_name}</td>
                        <td className="px-4 py-3">{row.type || "-"}</td>
                        <td className="px-4 py-3">{row.status || "-"}</td>
                        <td className="px-4 py-3">{row.start_date || "-"}</td>
                        <td className="px-4 py-3">{row.end_date || "-"}</td>
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

