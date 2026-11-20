import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "index.css"), "utf8");

describe("theme tokens", () => {
  it("uses an apple cool-gray canvas, dark void, and restrained semantic micro color", () => {
    expect(css).toMatch(/--background:\s*240\s+11%\s+96\.5%/);
    expect(css).toMatch(/--canvas:\s*#f5f5f7/);
    expect(css).toMatch(/--ink:\s*#1d1d1f/);
    expect(css).toMatch(/--ink-secondary:\s*#6e6e73/);
    const dark = css.match(/\.dark\s*\{[^}]+\}/)?.[0] ?? "";
    expect(dark).toMatch(/--background:\s*240\s+8%\s+4\.7%/);
    expect(dark).toMatch(/--canvas:\s*#0b0b0d/);
    for (const hex of ["#007aff", "#d97706", "#059669", "#6366f1", "#e11d48", "#18181b"]) {
      expect(css).toContain(hex);
    }
    expect(css).toContain("canvas-ambient");
    expect(css).toMatch(/\.material-chrome\s*\{[^}]*backdrop-filter:\s*blur\(40px\)/);
    expect(css).toMatch(/\.material-card\s*\{[^}]*rgba\(255,\s*255,\s*255,\s*0\.92\)/);
  });
});
