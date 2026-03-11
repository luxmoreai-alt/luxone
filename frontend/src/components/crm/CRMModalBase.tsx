import type { ReactNode } from "react";

type CRMModalBaseProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  maxWidthClassName?: string;
};

export default function CRMModalBase({
  open,
  title,
  children,
  footer,
  maxWidthClassName = "max-w-2xl",
}: CRMModalBaseProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className={`w-full ${maxWidthClassName} rounded-xl border border-slate-200 bg-white p-5 shadow-xl`}>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4">{children}</div>
        <div className="mt-5 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
