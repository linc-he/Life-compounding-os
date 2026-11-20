import type { ColorToken } from "@/types";
import { cn } from "@/lib/utils";
import { colorStyle } from "@/lib/palette";

export function ColorDot({
  token,
  name = "",
  index = 0,
  className,
}: {
  token?: ColorToken;
  name?: string;
  index?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 shrink-0 rounded-full", colorStyle(token, name, index).dot, className)}
    />
  );
}
