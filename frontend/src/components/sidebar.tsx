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
}: {
  state: AppState;
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  onAdd: () => void;
  onManage: () => void;
}) {
  const quota = activeQuota(state);
  const categories = sortedCategories(state);
  const globalHot = quota.count >= quota.globalLimit;

  return (
    <ShadSidebar collapsible="icon" className="border-black/[0.06] dark:border-white/[0.08]">
      <SidebarHeader className="border-b border-black/[0.06] dark:border-white/[0.08]">
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
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
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

      <SidebarFooter className="gap-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
        <Button type="button" className="h-8 w-full justify-start rounded-lg text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" onClick={onAdd}>
          <span className="group-data-[collapsible=icon]:hidden">+ 新增复利点</span>
          <span className="hidden font-mono group-data-[collapsible=icon]:inline">+</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-full justify-start rounded-lg text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={onManage}
        >
          <span className="group-data-[collapsible=icon]:hidden">管理复利分类</span>
          <span className="hidden text-[10px] group-data-[collapsible=icon]:inline">类</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </ShadSidebar>
  );
}
