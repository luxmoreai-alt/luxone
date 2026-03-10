import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CRMRowAction } from "../../lib/shared/crmTypes";

type CRMRowMoreOptionsMenuProps = {
  actions: CRMRowAction[];
  onClickAction: (key: string) => void;
};

export default function CRMRowMoreOptionsMenu({ actions, onClickAction }: CRMRowMoreOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [openNested, setOpenNested] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
        setOpenNested(null);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
      >
        <MoreHorizontal size={16} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-[60] mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {actions.map((action) =>
            action.children?.length ? (
              <div key={action.key} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenNested((prev) => (prev === action.key ? null : action.key))}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span>{action.label}</span>
                  <ChevronRight size={14} className={openNested === action.key ? "rotate-90" : ""} />
                </button>
                {openNested === action.key ? (
                  <div className="absolute left-full top-0 z-[70] ml-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {action.children.map((child) => (
                      <button
                        key={child.key}
                        type="button"
                        onClick={() => {
                          onClickAction(child.key);
                          setOpen(false);
                          setOpenNested(null);
                        }}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                key={action.key}
                type="button"
                onClick={() => {
                  onClickAction(action.key);
                  setOpen(false);
                  setOpenNested(null);
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 ${action.destructive ? "text-rose-600" : "text-slate-700"}`}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
