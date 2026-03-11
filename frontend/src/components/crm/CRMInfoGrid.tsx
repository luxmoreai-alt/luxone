import type { CRMDetailField, CRMRecord } from "../../lib/shared/crmTypes";

type CRMInfoGridProps<T extends CRMRecord> = {
  record: T;
  fields: CRMDetailField<T>[];
};

export default function CRMInfoGrid<T extends CRMRecord>({
  record,
  fields,
}: CRMInfoGridProps<T>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => {
        const value = record[field.key];

        return (
          <div key={field.key} className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{field.label}</p>
            <p className="mt-1 truncate text-sm text-slate-800">{String(value || "-")}</p>
          </div>
        );
      })}
    </div>
  );
}
