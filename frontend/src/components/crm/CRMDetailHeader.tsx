type CRMDetailHeaderProps = {
  title: string;
  subtitle: string;
  avatar: string;
  actions: string[];
  onBack: () => void;
};

export default function CRMDetailHeader({ title, subtitle, avatar, actions, onBack }: CRMDetailHeaderProps) {
  return (
    <header className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {avatar}
          </div>
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-2 rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
