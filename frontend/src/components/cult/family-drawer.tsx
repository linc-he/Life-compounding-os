import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * FamilyDrawer —— 两步抽屉（新增复利点 / 毕业-中止移除）。
 * 自研等价于 Cult UI FamilyDrawer：右侧滑出、两步视图、步骤指示。
 */
export function FamilyDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: (step: { step: number; next: () => void; back: () => void; reset: () => void }) => React.ReactNode;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-zinc-950/20"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-zinc-200/80 bg-white motion-safe-trans"
        style={{
          animation: "drawer-in 0.2s ease",
        }}
      >
        <style>{`@keyframes drawer-in { from { transform: translateX(16px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }`}</style>
        <header className="flex items-center justify-between border-b border-zinc-200/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-zinc-500 tnum">
              {step === 0 ? "1/2" : "2/2"}
            </span>
            <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 motion-safe-trans hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="关闭"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children({
            step,
            next: () => setStep((s) => Math.min(1, s + 1)),
            back: () => setStep((s) => Math.max(0, s - 1)),
            reset: () => setStep(0),
          })}
        </div>
      </aside>
    </div>
  );
}

/** 抽屉内嵌块 */
export function DrawerBlock({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg bg-zinc-50 border border-zinc-200/60 p-3.5", className)}>
      <div className="mb-1.5 text-[11px] font-medium text-zinc-500">{label}</div>
      {children}
    </div>
  );
}
