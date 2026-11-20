import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * PopoverForm —— 单条复利点旁的「记一句偏差/洞察」快捷浮层。
 * 克制版：无动画库依赖，短促淡入淡出，点击外部关闭。
 */
export function PopoverForm({
  trigger,
  title,
  placeholder,
  initial,
  onSubmit,
  align = "end",
}: {
  trigger: React.ReactNode;
  title: string;
  placeholder: string;
  initial?: string;
  onSubmit: (text: string) => void;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="contents"
      >
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-72 rounded-lg border border-zinc-200/80 bg-white p-3 shadow-sm",
            align === "end" ? "right-0" : "left-0"
          )}
          style={{ animation: "motion-safe(0.18s ease)" }}
        >
          <div className="text-[11px] font-medium text-zinc-500 mb-2">{title}</div>
          <textarea
            autoFocus
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-950 outline-none motion-safe-trans placeholder:text-zinc-400 focus:border-zinc-400"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2.5 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                onSubmit(text.trim());
                setOpen(false);
              }}
              className="rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-50 motion-safe-trans hover:bg-zinc-700"
            >
              记下
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
