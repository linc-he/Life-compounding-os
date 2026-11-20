import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer grid h-4 w-4 shrink-0 place-content-center rounded-[5px] border border-black/20 bg-white shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#007AFF]/20 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[#1D1D1F] data-[state=checked]:bg-[#1D1D1F] data-[state=checked]:text-white dark:border-white/20 dark:bg-white/[0.06] dark:data-[state=checked]:border-zinc-100 dark:data-[state=checked]:bg-zinc-100 dark:data-[state=checked]:text-zinc-950",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
