import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import { FileText, Users } from "lucide-react";

type CRMImportPageProps = {
  pageTitle: string;
  moduleLabel: string;
  mode: "module" | "notes";
  backPath: string;
};

export default function CRMImportPage({
  pageTitle,
  moduleLabel,
  mode,
  backPath,
}: CRMImportPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedSourceCrm, setSelectedSourceCrm] = useState("");

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  const handleNext = () => {
    console.log("Selected file:", selectedFileName);
    console.log("Selected CRM:", selectedSourceCrm);

    // TODO: later connect your import API here
  };

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden bg-[#f5f7fb]">
        <div className="border-b border-[#d9e1ef] bg-[#f7f9fc] px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[16px] font-semibold text-[#1f2d3d]">
              {moduleLabel}
            </h1>

            <button
              type="button"
              className="text-[14px] text-slate-600 hover:text-slate-800"
            >
              Help
            </button>
          </div>
        </div>

        <div className="h-[calc(100%-57px)] overflow-y-auto">
          <div className="px-8 py-6">
            <h2 className="mb-6 text-[18px] font-semibold text-[#1f2d3d]">
              {pageTitle}
            </h2>

            <div
              className={`mx-auto mt-10 flex ${
                mode === "module" ? "max-w-[920px] gap-10" : "max-w-[380px]"
              }`}
            >
              <div className="flex-1 rounded-[6px] border border-[#d7dff0] bg-white px-8 py-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#49c37d] text-[#49c37d]">
                    <FileText size={18} />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#1f2d3d]">
                    From File
                  </h3>
                </div>

                <div className="text-center">
                  <p className="mb-2 text-[14px] text-slate-600">
                    Drag and drop your file here.
                  </p>
                  <p className="mb-2 text-[14px] text-slate-500">or</p>

                  <button
                    type="button"
                    onClick={handleBrowseClick}
                    className="rounded-[6px] bg-gradient-to-b from-[#4d76ff] to-[#365eea] px-8 py-2 text-[14px] font-medium text-white"
                  >
                    Browse
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xls,.xlsx,.vcf"
                    onChange={handleFileChange}
                  />

                  {selectedFileName && (
                    <p className="mt-3 text-[13px] text-slate-700">
                      {selectedFileName}
                    </p>
                  )}

                  <p className="mt-10 text-[14px] text-slate-600">
                    Download sample file{" "}
                    <button
                      type="button"
                      className="text-[#4d76ff] hover:underline"
                    >
                      CSV
                    </button>{" "}
                    or{" "}
                    <button
                      type="button"
                      className="text-[#4d76ff] hover:underline"
                    >
                      XLSX
                    </button>
                  </p>

                  <p className="mx-auto mt-24 max-w-[320px] text-[13px] leading-6 text-slate-600">
                    You can import up to 5000 records through an .xls, .xlsx,
                    .vcf or .csv file. To import more than 5000 records at a
                    time, use a .csv file.
                  </p>
                </div>
              </div>

              {mode === "module" && (
                <>
                  <div className="flex items-center justify-center text-[18px] text-slate-500">
                    or
                  </div>

                  <div className="flex-1 rounded-[6px] border border-[#d7dff0] bg-white px-8 py-7">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#49c37d] text-[#49c37d]">
                        <Users size={18} />
                      </div>
                      <h3 className="text-[16px] font-semibold text-[#1f2d3d]">
                        From other CRMs
                      </h3>
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        className="mt-24 text-[14px] text-[#4d76ff] hover:underline"
                        onClick={() => setSelectedSourceCrm("Selected CRM")}
                      >
                        Which CRM are you coming from?
                      </button>

                      <p className="mx-auto mt-24 max-w-[320px] text-[13px] leading-6 text-slate-600">
                        Choose a CRM from which you would like to import.
                        Importing data from other CRMs is made easy.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(backPath)}
                className="rounded-[6px] border border-[#cfd7e6] bg-white px-8 py-2 text-[14px] text-slate-700"
                >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!selectedFileName && !selectedSourceCrm}
                className="rounded-[6px] bg-[#a9b7f7] px-8 py-2 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-80"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}