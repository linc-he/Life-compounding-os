import { COLOR_TOKENS, type ColorToken } from "@/types";

export const COLOR_TOKEN_STYLES: Record<
  ColorToken,
  { label: string; hex: string; dot: string; badge: string; bar: string }
> = {
  cobalt: {
    label: "钴蓝",
    hex: "#007AFF",
    dot: "bg-[#007AFF]",
    badge: "bg-[#007AFF]/10 text-[#0A4D99] dark:text-[#8ECAFF]",
    bar: "bg-[#007AFF]",
  },
  amber: {
    label: "琥珀",
    hex: "#D97706",
    dot: "bg-[#D97706]",
    badge: "bg-[#D97706]/10 text-[#92400E] dark:text-[#F6C27A]",
    bar: "bg-[#D97706]",
  },
  emerald: {
    label: "翡翠",
    hex: "#059669",
    dot: "bg-[#059669]",
    badge: "bg-[#059669]/10 text-[#047857] dark:text-[#6EE7B7]",
    bar: "bg-[#059669]",
  },
  indigo: {
    label: "靛紫",
    hex: "#6366F1",
    dot: "bg-[#6366F1]",
    badge: "bg-[#6366F1]/10 text-[#4338CA] dark:text-[#C7D2FE]",
    bar: "bg-[#6366F1]",
  },
  rose: {
    label: "玫瑰",
    hex: "#E11D48",
    dot: "bg-[#E11D48]",
    badge: "bg-[#E11D48]/10 text-[#9F1239] dark:text-[#FDA4AF]",
    bar: "bg-[#E11D48]",
  },
  graphite: {
    label: "石墨",
    hex: "#18181B",
    dot: "bg-[#18181B] dark:bg-zinc-100",
    badge: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-200",
    bar: "bg-[#18181B] dark:bg-zinc-100",
  },
};

const NAME_COLORS: Record<string, ColorToken> = {
  学习与输入: "cobalt",
  投资与决策: "amber",
  生活与精力: "emerald",
};

export function isColorToken(value: unknown): value is ColorToken {
  return typeof value === "string" && (COLOR_TOKENS as readonly string[]).includes(value);
}

export function defaultColorToken(name: string, index = 0): ColorToken {
  return NAME_COLORS[name] ?? COLOR_TOKENS[Math.abs(index) % COLOR_TOKENS.length];
}

export function colorStyle(token: ColorToken | undefined, name = "", index = 0) {
  return COLOR_TOKEN_STYLES[isColorToken(token) ? token : defaultColorToken(name, index)];
}
