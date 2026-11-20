import { useMemo } from "react";
import type { AppState } from "@/types";
import { cn } from "@/lib/utils";
import { ColorDot } from "@/components/color-dot";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandK({
  open,
  onClose,
  state,
  onSelectItem,
  onSelectDate,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  onSelectItem: (itemId: string) => void;
  onSelectDate: (date: string) => void;
}) {
  const items = useMemo(
    () =>
      [...state.items].sort((a, b) => a.title.localeCompare(b.title, "zh")),
    [state.items]
  );
  const diaries = useMemo(
    () =>
      Object.values(state.checkIns)
        .filter((c) => c.sealed || c.summary)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state.checkIns]
  );

  return (
    <CommandDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <CommandInput placeholder="搜索复利点、日期或封存总结…" />
      <CommandList>
        <CommandEmpty>无匹配结果</CommandEmpty>
        <CommandGroup heading="复利点">
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.title} ${item.knowledge} ${item.action} ${item.id}`}
              onSelect={() => {
                onSelectItem(item.id);
                onClose();
              }}
            >
              <ColorDot
                token={state.categories.find((c) => c.id === item.categoryId)?.colorToken}
                name={state.categories.find((c) => c.id === item.categoryId)?.name}
              />
              <span className="truncate">{item.title}</span>
              <span
                className={cn(
                  "ml-auto shrink-0 pl-3 font-mono text-[10px]",
                  item.status === "graduated" ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                )}
              >
                {item.status === "active" ? "活跃" : item.status === "graduated" ? "毕业" : "中止"}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="封存日记">
          {diaries.map((diary) => (
            <CommandItem
              key={diary.date}
              value={`${diary.date} ${diary.summary}`}
              onSelect={() => {
                onSelectDate(diary.date);
                onClose();
              }}
            >
              <span className="font-mono text-[11px]">{diary.date}</span>
              <span className="ml-3 truncate text-muted-foreground">
                {diary.summary || "（无总结）"}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
