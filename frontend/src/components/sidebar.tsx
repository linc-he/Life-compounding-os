import { Plus, SlidersHorizontal } from "lucide-react";
import type { AppState } from "@/types";
import { cn } from "@/lib/utils";
import { activeQuota, categoryQuota, sortedCategories } from "@/lib/store";
import { ColorDot } from "@/components/color-dot";
import { Button } from "@/components/ui/button";
import {
  Sidebar as ShadSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function Sidebar({
  state,
  selectedCategory,
  onSelectCategory,
  onAdd,
  onManage,
  persistence,
}: {
  state: AppState;
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  onAdd: () => void;
  onManage: () => void;
  persistence: "loading" | "sqlite" | "local";
}) {
  const quota = activeQuota(state);
  const categories = sortedCategories(state);
  const globalHot = quota.count >= quota.globalLimit;

  return (
    <ShadSidebar collapsible="icon" className="border-black/[0.06] dark:border-white/[0.08]">
      <SidebarHeader className="px-2 pb-1 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="知行 · 人生复利系统" className="hover:bg-transparent">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1D1D1F] text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:bg-zinc-100 dark:text-zinc-950">
                知
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold tracking-tight text-foreground">知行</span>
                <span className="truncate text-[10px] tracking-wide text-[var(--ink-tertiary)]">
                  Life Compounding
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-3">
          <SidebarGroupLabel className="h-7 text-[11px] font-semibold tracking-normal text-[var(--ink-tertiary)]">
            复利分类
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={selectedCategory == null}
                tooltip="全部复利点"
                className="pr-14"
                onClick={() => onSelectCategory(null)}
              >
                <span className="inline-block size-1.5 shrink-0 rounded-full bg-[#86868B]" />
                <span className="truncate">全部复利点</span>
              </SidebarMenuButton>
              <SidebarMenuBadge
                className={cn(
                  "font-mono text-[10px] text-[var(--ink-tertiary)]",
                  globalHot && "text-amber-800 dark:text-amber-200"
                )}
              >
                {quota.count}/{quota.globalLimit}
              </SidebarMenuBadge>
            </SidebarMenuItem>
            {categories.map((category, index) => {
              const q = categoryQuota(state, category.id);
              const hot = q.count >= q.limit;
              return (
                <SidebarMenuItem key={category.id}>
                  <SidebarMenuButton
                    isActive={selectedCategory === category.id}
                    tooltip={`${category.name} · ${category.description || "未写定位"} · ${q.count}/${q.limit}`}
                    className="pr-14"
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <ColorDot token={category.colorToken} name={category.name} index={index} />
                    <span className="truncate">{category.name}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge
                    className={cn(
                      "font-mono text-[10px] text-[var(--ink-tertiary)]",
                      hot && "text-amber-800 dark:text-amber-200"
                    )}
                  >
                    {q.count}/{q.limit}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 border-t border-black/[0.06] p-2 dark:border-white/[0.08]">
        <Button
          type="button"
          title="新增复利点"
          className="h-8 w-full justify-start gap-2 rounded-lg bg-[#1D1D1F] text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.12)] hover:bg-[#2C2C2E] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={onAdd}
        >
          <Plus className="size-3.5" />
          <span className="group-data-[collapsible=icon]:hidden">新增复利点</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          title="管理复利分类"
          className="h-8 w-full justify-start gap-2 rounded-lg text-xs text-[var(--ink-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={onManage}
        >
          <SlidersHorizontal className="size-3.5" />
          <span className="group-data-[collapsible=icon]:hidden">管理复利分类</span>
        </Button>
        <div
          title={persistence === "sqlite" ? "数据已保存到 SQLite" : "后端暂不可用，数据暂存在本地；恢复连接后会同步"}
          aria-label={persistence === "sqlite" ? "数据已连接 SQLite" : "SQLite 不可用，数据暂存在本地"}
          className="mt-1 flex items-center gap-1.5 px-2 text-[10px] text-[var(--ink-tertiary)] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", persistence === "sqlite" ? "bg-emerald-500/80" : "bg-amber-500/80")} />
          <span className="group-data-[collapsible=icon]:hidden">{persistence === "sqlite" ? "已同步 SQLite" : "仅本地保存"}</span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </ShadSidebar>
  );
}
