import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import { ChevronDown } from "lucide-react";
import { Country, State } from "country-state-city";

export type CRMCreateFieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "checkbox"
  | "select"
  | "currency"
  | "country"
  | "state"
  | "owner"
  | "name-composite";

export type CRMCreateField = {
  name: string;
  label: string;
  type: CRMCreateFieldType;
  options?: string[];
  secondaryName?: string;
  placeholder?: string;
  rows?: number;
};

export type CRMCreateSection = {
  title: string;
  cardStyle?: "default" | "boxed";
  cardTitle?: string;
  widthClassName?: string;
  fields: CRMCreateField[];
};

type CRMCreatePageProps<T extends Record<string, unknown>> = {
  title: string;
  initialValues: T;
  sections: CRMCreateSection[];
  backPath: string;
  onSubmit: (values: T) => Promise<void>;
};

const inputClass =
  "h-[34px] w-full rounded-[4px] border border-[#cfd7e6] bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-[#6d8dff]";

const selectClass =
  "h-[34px] w-full appearance-none rounded-[4px] border border-[#cfd7e6] bg-white px-3 pr-8 text-[14px] text-slate-700 outline-none transition focus:border-[#6d8dff]";

const labelClass =
  "pr-4 text-right text-[14px] font-normal text-[#4e6485]";

function SelectField({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select name={name} value={value} onChange={onChange} className={selectClass}>
        {options.map((option) => (
          <option key={option} value={option === "-None-" ? "" : option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

export default function CRMCreatePage<T extends Record<string, unknown>>({
  title,
  initialValues,
  sections,
  backPath,
  onSubmit,
}: CRMCreatePageProps<T>) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<T>(initialValues);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const countryOptions = [
    "-None-",
    ...Country.getAllCountries().map((country) => country.name),
  ];

  const selectedCountry = Country.getAllCountries().find(
    (country) => country.name === String(formData.country ?? "")
  );

  const stateOptions = selectedCountry
    ? ["-None-", ...State.getStatesOfCountry(selectedCountry.isoCode).map((state) => state.name)]
    : ["-None-"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      e.target instanceof HTMLInputElement ? e.target.checked : false;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData(initialValues);
  };

  const handleSave = async (goToNew = false) => {
    try {
      setSaving(true);
      setErrorMsg(null);
      await onSubmit(formData);

      if (goToNew) {
        resetForm();
        return;
      }

      navigate(backPath);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save. Please try again.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: CRMCreateField) => {
    const value = String(formData[field.name] ?? "");

    if (field.type === "textarea") {
      return (
        <textarea
          name={field.name}
          value={value}
          onChange={handleChange}
          rows={field.rows ?? 4}
          placeholder={field.placeholder ?? ""}
          className="min-h-[34px] w-full rounded-[4px] border border-[#cfd7e6] bg-white px-3 py-2 text-[14px] text-slate-700 outline-none focus:border-[#6d8dff]"
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            name={field.name}
            checked={Boolean(formData[field.name])}
            onChange={handleChange}
            className="h-4 w-4 rounded border-[#cfd7e6]"
          />
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <SelectField
          name={field.name}
          value={value}
          onChange={handleChange}
          options={field.options ?? ["-None-"]}
        />
      );
    }

    if (field.type === "country") {
      return (
        <SelectField
          name={field.name}
          value={value}
          onChange={(e) => {
            const country = e.target.value;
            setFormData((prev) => ({
              ...prev,
              country,
              state: "",
            }));
          }}
          options={countryOptions}
        />
      );
    }

    if (field.type === "state") {
      return (
        <SelectField
          name={field.name}
          value={value}
          onChange={handleChange}
          options={stateOptions}
        />
      );
    }

    if (field.type === "owner") {
      return (
        <input
          name={field.name}
          value={value}
          onChange={handleChange}
          className={inputClass}
          placeholder={field.placeholder ?? ""}
        />
      );
    }

    if (field.type === "name-composite") {
      return (
        <div className="grid grid-cols-[94px_minmax(0,1fr)]">
          <SelectField
            name={field.name}
            value={value}
            onChange={handleChange}
            options={field.options ?? ["-None-"]}
          />
          <input
            name={field.secondaryName!}
            value={String(formData[field.secondaryName!] ?? "")}
            onChange={handleChange}
            className="h-[34px] w-full rounded-r-[4px] border border-l-0 border-[#cfd7e6] bg-white px-3 text-[14px] text-slate-700 outline-none"
            placeholder={field.placeholder ?? ""}
          />
        </div>
      );
    }

    if (field.type === "currency") {
      return (
        <div className="relative">
          <input
            name={field.name}
            value={value}
            onChange={handleChange}
            className={`${inputClass} pr-4 pl-11`}
            placeholder={field.placeholder ?? ""}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-600">
            Rs.
          </span>
        </div>
      );
    }

    return (
      <input
        type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
        name={field.name}
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder ?? ""}
        className={inputClass}
      />
    );
  };

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden bg-[#f3f5f9]">
        <div className="border-b border-[#d9e1ef] bg-[#f7f9fc] px-7 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-[16px] font-semibold text-[#1f2d3d]">{title}</h1>
              
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(backPath)}
                disabled={saving}
                className="h-[32px] rounded-[6px] border border-[#cfd7e6] bg-white px-6 text-[14px] text-[#334155] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave(true)}
                disabled={saving}
                className="h-[32px] rounded-[6px] border border-[#cfd7e6] bg-white px-6 text-[14px] text-[#334155] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save and New"}
              </button>
              <button
                type="button"
                onClick={() => void handleSave(false)}
                disabled={saving}
                className="h-[32px] rounded-[6px] bg-gradient-to-b from-[#4d76ff] to-[#365eea] px-8 text-[14px] font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div className="h-[calc(100%-57px)] overflow-y-auto px-3 py-3">
          {errorMsg && (
            <div className="mb-3 rounded-[6px] border border-red-300 bg-red-50 px-4 py-2 text-[13px] text-red-700">
              {errorMsg}
            </div>
          )}
          <div className="bg-white">
            <div className="px-3 pt-4">
              {sections.map((section) => (
                <div key={section.title} className="mb-8">
                  <div className="mb-5 text-[13px] font-semibold text-[#1f2d3d]">
                    {section.title}
                  </div>

                  {section.cardStyle === "boxed" ? (
                    <div
                      className={`${section.widthClassName ?? "w-[48%]"} rounded-[10px] border border-[#cfd7e6] px-4 pb-4 pt-2`}
                    >
                      {section.cardTitle && (
                        <div className="mb-4 text-[13px] text-[#4e6485]">
                          {section.cardTitle}
                        </div>
                      )}

                      <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-y-5">
                        {section.fields.map((field) => (
                          <div key={field.name} className="contents">
                            <label className={labelClass}>{field.label}</label>
                            {renderField(field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                      <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-y-5">
                        {section.fields
                          .filter((_, index) => index % 2 === 0)
                          .map((field) => (
                            <div key={field.name} className="contents">
                              <label className={labelClass}>{field.label}</label>
                              {renderField(field)}
                            </div>
                          ))}
                      </div>

                      <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-y-5">
                        {section.fields
                          .filter((_, index) => index % 2 === 1)
                          .map((field) => (
                            <div key={field.name} className="contents">
                              <label className={labelClass}>{field.label}</label>
                              {renderField(field)}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}