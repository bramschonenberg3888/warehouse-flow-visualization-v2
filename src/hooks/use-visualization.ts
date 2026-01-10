"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { Flow, PlacedElement } from "@/server/db/schema"
import {
  generateMultiPath,
  getPositionAlongPath,
  getPathDuration,
  getElementCenter,
  type Point,
} from "@/lib/pathfinding"

// Configuration
const MIN_SPEED = 0.5
const MAX_SPEED = 3.0
const DEFAULT_SPEED = 1.0
const RENDER_INTERVAL = 33 // ~30fps for React state updates

export interface PalletState {
  flowId: string
  x: number
  y: number
  progress: number
  color: string
}

export interface VisualizationState {
  isRunning: boolean
  pallets: PalletState[]
}

interface FlowAnimationState {
  flowId: string
  path: Point[]
  duration: number
  startTime: number
  color: string
}

export interface UseVisualizationResult {
  state: VisualizationState
  start: () => void
  stop: () => void
  reset: () => void
  speed: number
  setSpeed: (speed: number) => void
}

export function useVisualization(
  flows: Flow[] | undefined,
  placedElements: PlacedElement[] | undefined
): UseVisualizationResult {
  // Speed state
  const [speed, setSpeedState] = useState(DEFAULT_SPEED)
  const speedRef = useRef(DEFAULT_SPEED)

  const setSpeed = useCallback((newSpeed: number) => {
    const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed))
    speedRef.current = clampedSpeed
    setSpeedState(clampedSpeed)
  }, [])

  // Animation refs
  const animationFrameRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const flowAnimationsRef = useRef<Map<string, FlowAnimationState>>(new Map())
  const lastRenderTimeRef = useRef<number>(0)

  const [state, setState] = useState<VisualizationState>({
    isRunning: false,
    pallets: [],
  })

  // Build flow animations from current data
  const buildAnimations = useCallback(() => {
    flowAnimationsRef.current.clear()

    if (!flows || !placedElements) return []

    // Build element lookup map
    const elementMap = new Map<string, PlacedElement>()
    for (const element of placedElements) {
      elementMap.set(element.id, element)
    }

    const pallets: PalletState[] = []

    for (const flow of flows) {
      const points: Point[] = []
      for (const elementId of flow.elementSequence) {
        const element = elementMap.get(elementId)
        if (element) {
          points.push(getElementCenter(element))
        }
      }

      if (points.length >= 2) {
        const path = generateMultiPath(points)
        flowAnimationsRef.current.set(flow.id, {
          flowId: flow.id,
          path,
          duration: getPathDuration(path, speedRef.current),
          startTime: 0,
          color: flow.color,
        })

        const firstPoint = points[0]
        if (firstPoint) {
          pallets.push({
            flowId: flow.id,
            x: firstPoint.x,
            y: firstPoint.y,
            progress: 0,
            color: flow.color,
          })
        }
      }
    }

    return pallets
  }, [flows, placedElements])

  // Animation loop
  useEffect(() => {
    if (!state.isRunning) return

    const animate = (timestamp: number) => {
      if (!isRunningRef.current) return

      const pallets: PalletState[] = []

      flowAnimationsRef.current.forEach((anim) => {
        // Initialize start time if not set
        if (anim.startTime === 0) {
          anim.startTime = timestamp
        }

        // Recalculate duration based on current speed
        anim.duration = getPathDuration(anim.path, speedRef.current)

        const elapsed = timestamp - anim.startTime
        // Loop the animation
        const loopedElapsed = elapsed % anim.duration
        const progress = anim.duration > 0 ? loopedElapsed / anim.duration : 0

        const position = getPositionAlongPath(anim.path, progress)

        pallets.push({
          flowId: anim.flowId,
          x: position.x,
          y: position.y,
          progress,
          color: anim.color,
        })
      })

      // Throttle React state updates to ~30fps
      if (timestamp - lastRenderTimeRef.current >= RENDER_INTERVAL) {
        lastRenderTimeRef.current = timestamp
        setState({
          isRunning: true,
          pallets,
        })
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [state.isRunning])

  const start = useCallback(() => {
    if (isRunningRef.current) return

    // Build animations when starting
    const pallets = buildAnimations()
    if (flowAnimationsRef.current.size === 0) return

    isRunningRef.current = true

    // Reset start times
    flowAnimationsRef.current.forEach((anim) => {
      anim.startTime = 0
    })

    setState({
      isRunning: true,
      pallets,
    })
  }, [buildAnimations])

  const stop = useCallback(() => {
    isRunningRef.current = false

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setState((prev) => ({
      ...prev,
      isRunning: false,
    }))
  }, [])

  const reset = useCallback(() => {
    stop()

    // Rebuild and reset pallets to starting positions
    const pallets = buildAnimations()
    setState({ isRunning: false, pallets })
  }, [stop, buildAnimations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return { state, start, stop, reset, speed, setSpeed }
}
