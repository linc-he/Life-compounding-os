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

  it("stretches tab content while the tab bar itself stays centered", () => {
    expect(tabs).toContain('className="flex w-full min-w-0 flex-col"');
    expect(tabs).toContain("mx-auto flex w-fit max-w-full");
    expect(tabs).toContain('"relative h-full w-full min-w-0"');
    expect(app).toContain('className="mx-auto mt-4 w-fit max-w-full"');
    expect(app).toContain("min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto");
    expect(app).not.toMatch(/DirectionAwareTabs[\s\S]{0,120}max-w-(4|5|6|7)xl/);
  });

  it("lets every primary view grow with the remaining width", () => {
    const views = ["views/today.tsx", "views/panorama.tsx", "views/principles.tsx"].map(read);
    for (const source of views) {
      expect(source).toMatch(/className="w-full min-w-0 space-y-/);
      expect(source).not.toMatch(/max-w-(4|5|6|7)xl/);
    }
  });
});
