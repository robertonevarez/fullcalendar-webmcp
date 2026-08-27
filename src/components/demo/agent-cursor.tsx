"use client"

import { useEffect, useRef } from "react"
import { motion, useSpring } from "motion/react"

import { DefaultCursorSVG } from "@/components/ui/smooth-cursor"
import { cn } from "@/lib/utils"

const DEFAULT_SPRING = {
  damping: 45,
  stiffness: 400,
  mass: 1,
  restDelta: 0.001,
} as const

const REDUCED_MOTION_SPRING = {
  damping: 100,
  stiffness: 1000,
  mass: 1,
  restDelta: 0.001,
} as const

type AgentCursorProps = {
  visible: boolean
  x: number
  y: number
  reducedMotion?: boolean
  className?: string
}

export function AgentCursor({
  visible,
  x,
  y,
  reducedMotion = false,
  className,
}: AgentCursorProps) {
  const springConfig = reducedMotion ? REDUCED_MOTION_SPRING : DEFAULT_SPRING
  const lastPos = useRef({ x, y })
  const previousAngle = useRef(0)
  const accumulatedRotation = useRef(0)
  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cursorX = useSpring(x, springConfig)
  const cursorY = useSpring(y, springConfig)
  const rotation = useSpring(0, {
    ...springConfig,
    damping: reducedMotion ? 100 : 60,
    stiffness: reducedMotion ? 1000 : 300,
  })
  const scale = useSpring(1, {
    ...springConfig,
    stiffness: reducedMotion ? 1000 : 500,
    damping: reducedMotion ? 100 : 35,
  })

  useEffect(() => {
    cursorX.set(x)
    cursorY.set(y)

    const dx = x - lastPos.current.x
    const dy = y - lastPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    lastPos.current = { x, y }

    if (reducedMotion || distance < 1) {
      return
    }

    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    let angleDiff = currentAngle - previousAngle.current
    if (angleDiff > 180) angleDiff -= 360
    if (angleDiff < -180) angleDiff += 360
    accumulatedRotation.current += angleDiff
    rotation.set(accumulatedRotation.current)
    previousAngle.current = currentAngle

    scale.set(0.95)
    if (settleTimeout.current) {
      clearTimeout(settleTimeout.current)
    }
    settleTimeout.current = setTimeout(() => {
      scale.set(1)
    }, 150)
  }, [cursorX, cursorY, reducedMotion, rotation, scale, x, y])

  useEffect(() => {
    return () => {
      if (settleTimeout.current) {
        clearTimeout(settleTimeout.current)
      }
    }
  }, [])

  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-40 hidden md:block",
        className
      )}
      style={{
        left: cursorX,
        top: cursorY,
        translateX: "-18%",
        translateY: "-12%",
        rotate: rotation,
        scale,
        willChange: "transform",
      }}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: reducedMotion ? 0.05 : 0.15 }}
    >
      <div className="relative">
        <DefaultCursorSVG />
        <span className="absolute left-6 top-4 rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-md">
          Agent
        </span>
      </div>
    </motion.div>
  )
}
