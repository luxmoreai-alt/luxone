type CRMPageHeaderProps = {
  title: string;
  subtitle: string;
  primaryActionLabel: string;
};

export default function CRMPageHeader({ title, subtitle, primaryActionLabel }: CRMPageHeaderProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Sort</button>
          <button className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">{primaryActionLabel}</button>
        </div>
      </div>
    </section>
  );
}
