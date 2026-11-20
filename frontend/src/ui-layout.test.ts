import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("frosted family drawer stays readable", () => {
  const css = read("index.css");
  const drawer = read("components/ui/family-drawer.tsx");

  it("paints overlays with vibrancy and keeps content cards high opacity", () => {
    expect(css).toMatch(/\.material-chrome\s*\{[^}]*backdrop-filter:\s*blur\(40px\)/);
    expect(css).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.72\)/);
    expect(css).toMatch(/\.material-card\s*\{[^}]*rgba\(255,\s*255,\s*255,\s*0\.92\)/);
    expect(drawer).toContain("material-chrome");
    expect(drawer).toMatch(/fixed inset-0 z-50 bg-black\/30/);
    expect(read("components/category-drawer.tsx")).toContain("<FamilyDrawerOverlay");
    expect(read("components/item-drawers.tsx")).toContain("<FamilyDrawerOverlay");
  });
});

describe("main column fills the sidebar inset", () => {
  const tabs = read("components/ui/direction-aware-tabs.tsx");
  const app = read("app.tsx");

  it("stretches tab content while the segmented control sits centered in the toolbar", () => {
    expect(tabs).toContain('className="flex w-full min-w-0 flex-col"');
    expect(tabs).toContain("mx-auto flex w-fit max-w-full");
    expect(tabs).toContain('"relative h-full w-full min-w-0"');
    expect(tabs).toContain("createPortal(bar, barContainer)");
    expect(app).toContain("barContainer={toolbarSlot}");
    expect(app).toContain("min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto");
    expect(app).not.toMatch(/DirectionAwareTabs[\s\S]{0,120}max-w-/);
  });

  it("lets every primary view grow up to one shared, centered reading width", () => {
    const views = ["views/today.tsx", "views/panorama.tsx", "views/principles.tsx"].map(read);
    for (const source of views) {
      expect(source).toMatch(/className="mx-auto w-full min-w-0 max-w-\[1080px\] space-y-/);
      expect(source).not.toMatch(/max-w-(4|5|6|7)xl/);
    }
  });
});

describe("dark mode stays legible", () => {
  it("drives the heatmap from theme tokens instead of light-only hex", () => {
    const css = read("index.css");
    const store = read("lib/store.ts");
    expect(store).toContain('"var(--heat-0)"');
    expect(css.match(/\.dark\s*\{[^}]+\}/)?.[0] ?? "").toMatch(/--heat-0:/);
  });

  it("keeps popover success icons theme-aware", () => {
    expect(read("components/ui/popover-form.tsx")).not.toContain("#09090B");
  });
});

describe("category manager dialog fits its actions", () => {
  const drawer = read("components/category-drawer.tsx");

  it("grows on desktop without exceeding a narrow viewport", () => {
    expect(drawer).toContain("w-[min(calc(100vw-2rem),44rem)]");
    expect(drawer).toContain("md:w-[min(calc(100vw-2rem),44rem)]");
    expect(drawer).not.toContain("max-w-[560px]");
  });

  it("keeps the create button on one line and uses lucide", () => {
    expect(drawer).toContain('from "lucide-react"');
    expect(drawer).toContain("<Plus");
    expect(drawer).toContain("whitespace-nowrap");
    expect(drawer).toContain("min-[420px]:w-auto");
    expect(read("components/ui/family-drawer.tsx")).toContain('from "lucide-react"');
    expect(read("components/ui/family-drawer.tsx")).toContain("<X");
  });
});
