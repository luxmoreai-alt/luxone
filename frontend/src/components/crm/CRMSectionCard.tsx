import type { ReactNode } from "react";

type CRMSectionCardProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function CRMSectionCard({ title, action, children }: CRMSectionCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
