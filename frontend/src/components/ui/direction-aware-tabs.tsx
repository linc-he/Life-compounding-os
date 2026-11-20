import { ReactNode, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, MotionConfig } from "motion/react"
import useMeasure from "react-use-measure"

import { cn } from "@/lib/utils"

type Tab = {
  id: number
  label: string
  content: ReactNode
}

interface OgImageSectionProps {
  tabs: Tab[]
  className?: string
  /** Outer container radius (e.g. `rounded-lg`) */
  rounded?: string
  /** Inner tab/bubble radius — should be outer radius minus container padding (~3px) */
  roundedInner?: string
  /** Controlled tab id. Omit to let the component own selection. */
  activeId?: number
  onChange?: (id: number) => void
  /**
   * Render the segmented control inside another element (e.g. the window toolbar).
   * `undefined` keeps it inline above the content; `null` means the target is not mounted yet.
   */
  barContainer?: HTMLElement | null
}

function DirectionAwareTabs({
  tabs,
  className,
  rounded,
  roundedInner,
  activeId,
  onChange,
  barContainer,
}: OgImageSectionProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState(tabs[0]?.id ?? 0)
  const activeTab = activeId ?? uncontrolledTab
  const [direction, setDirection] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [ref, bounds] = useMeasure()
  const [prevActive, setPrevActive] = useState(activeTab)
  if (activeTab !== prevActive) {
    setPrevActive(activeTab)
    setDirection(activeTab > prevActive ? 1 : -1)
  }

  const content = useMemo(() => {
    const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content
    return activeTabContent || null
  }, [activeTab, tabs])

  const handleTabClick = (newTabId: number) => {
    if (newTabId !== activeTab && !isAnimating) {
      setDirection(newTabId > activeTab ? 1 : -1)
      if (activeId === undefined) setUncontrolledTab(newTabId)
      onChange?.(newTabId)
    }
  }

  const variants = {
    initial: (direction: number) => ({
      x: 28 * direction,
      opacity: 0,
    }),
    active: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: -28 * direction,
      opacity: 0,
    }),
  }

  const inToolbar = barContainer !== undefined

  const bar = (
      <div
        role="tablist"
        className={cn(
          // macOS segmented control: one recessed trough, one raised white thumb.
          "mx-auto flex w-fit max-w-full cursor-pointer gap-0.5 overflow-x-auto rounded-[10px] border border-black/[0.05] bg-black/[0.045] p-[3px] shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.07]",
          !inToolbar && "material-chrome sticky top-0 z-30",
          className,
          rounded
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-[7px] px-3 py-1 text-[12.5px] font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:px-4",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              rounded ? roundedInner : undefined
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId="bubble"
                className={cn(
                  "absolute inset-0 z-10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.04)] dark:bg-zinc-700/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                  rounded ? roundedInner : "rounded-[7px]"
                )}
                transition={{ type: "spring", bounce: 0, duration: 0.28 }}
              />
            )}

            <span className="relative z-20">{tab.label}</span>
          </button>
        ))}
      </div>
  )

  return (
    <div className="flex w-full min-w-0 flex-col">
      {inToolbar ? (barContainer ? createPortal(bar, barContainer) : null) : bar}
      <MotionConfig transition={{ duration: 0.28, type: "spring", bounce: 0 }}>
        <motion.div
          className={cn(
            "relative h-full w-full min-w-0",
            isAnimating ? "overflow-hidden" : "overflow-visible"
          )}
          initial={false}
          animate={{ height: bounds.height }}
        >
          <div className="w-full min-w-0 p-1" ref={ref}>
            <AnimatePresence
              custom={direction}
              mode="popLayout"
              onExitComplete={() => setIsAnimating(false)}
            >
              <motion.div
                key={activeTab}
                variants={variants}
                initial="initial"
                animate="active"
                exit="exit"
                custom={direction}
                onAnimationStart={() => setIsAnimating(true)}
                onAnimationComplete={() => setIsAnimating(false)}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  )
}
export { DirectionAwareTabs }
