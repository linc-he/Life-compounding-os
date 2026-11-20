import { cn } from "@/lib/utils";

/**
 * WidgetCard —— minimal-cards 设计语言的基础卡片。
 *
 * 规范（来自 skill 指导）：
 * - 白底 22px 圆角，发丝描边 + 柔和长影
 * - 统一头部：5px accent 圆点 + 灰色小标签（左），可选灰胶囊（右）
 * - 大数字使用 tabular figures，防止跳动
 * - 留白充足，保持"干净整洁"的舞台感
 */

export function WidgetCard({
  label,
  pill,
  className,
  children,
}: {
  label: string;
  pill?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "material-card rounded-2xl p-5 transition-shadow duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            {label}
          </span>
        </div>
        {pill && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {pill}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * NumberStat —— 数字卡片主体。
 * 大数字 Inter 600 + tabular figures；变化时轻微上滚。
 */
export function NumberStat({
  value,
  suffix,
  hint,
  className,
}: {
  value: string | number;
  suffix?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="font-sans font-semibold text-3xl leading-none tracking-tight tabular-nums">
        {value}
        {suffix && <span className="text-base text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
      {hint && <div className="text-xs text-muted-foreground mt-1.5">{hint}</div>}
    </div>
  );
}
