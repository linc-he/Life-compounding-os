import { cn } from "@/lib/utils";

/**
 * TextureCard —— KPI 卡与结账卡的基底。
 * 极简克制的纸质感：白底、发丝边、极淡纹理。禁重阴影。
 */
export function TextureCard({
  label,
  pill,
  className,
  children,
}: {
  label?: string;
  pill?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/80 bg-white p-5",
        className
      )}
    >
      {(label || pill) && (
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-zinc-400" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {label}
            </span>
          </div>
          {pill && <div className="text-[11px] tnum text-zinc-400">{pill}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
