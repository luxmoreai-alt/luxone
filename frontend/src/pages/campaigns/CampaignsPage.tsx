import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";

export default function CampaignsPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden bg-[#f5f7fb]">
        <div className="border-b border-[#d9e1ef] bg-[#f7f9fc] px-4 py-3">
          <h1 className="text-[18px] font-semibold text-[#1f2d3d]">Campaigns</h1>
        </div>

        <div className="h-[calc(100%-57px)] p-4">
          <div className="flex h-full items-center justify-center rounded-[14px] border border-[#d9e1ef] bg-white">
            <div className="text-center">
              <h2 className="text-[20px] font-semibold text-[#1f2d3d]">
                Plan Campaigns
              </h2>

              <p className="mt-2 text-[15px] text-[#4e6485]">
                Campaigns are marketing efforts planned, executed, and monitored
                from within your CRM.
              </p>

              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate("/campaigns/create")}
                    className="rounded-[6px] bg-gradient-to-b from-[#4d76ff] to-[#365eea] px-6 py-2 text-[14px] font-medium text-white"
                    >
                    Create Campaign
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/campaigns/import")}
                  className="rounded-[6px] bg-gradient-to-b from-[#4d76ff] to-[#365eea] px-6 py-2 text-[14px] font-medium text-white"
                >
                  Import Campaigns
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}