"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type {
  Path,
  PlacedElement,
  Scenario,
  ElementTemplate,
} from "@/server/db/schema"
import { PathEngine, type Pallet } from "@/lib/path-engine/engine"

const FRAME_INTERVAL = 33 // ~30fps throttle

export interface PathVisualizationState {
  pallets: Pallet[]
  simulationTime: number
  isRunning: boolean
}

export interface PathVisualizationControls {
  start: () => void
  stop: () => void
  reset: () => void
  setSpeed: (speed: number) => void
}

export function usePathVisualization(
  scenario: Scenario | null,
  paths: Path[],
  placedElements: PlacedElement[],
  templates: ElementTemplate[] = []
): {
  state: PathVisualizationState
  controls: PathVisualizationControls
  speed: number
} {
  // Speed state
  const [speed, setSpeedState] = useState(scenario?.speedMultiplier ?? 1.0)
  const speedRef = useRef(scenario?.speedMultiplier ?? 1.0)

  // Animation state
  const [state, setState] = useState<PathVisualizationState>({
    pallets: [],
    simulationTime: 0,
    isRunning: false,
  })

  // Refs for animation loop
  const engineRef = useRef<PathEngine | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const speedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRunningRef = useRef(false)
  const lastTimeRef = useRef<number>(0)
  const lastUpdateRef = useRef<number>(0)

  // Build/rebuild engine
  const buildEngine = useCallback(() => {
    if (!scenario || paths.length === 0) {
      engineRef.current = null
      return
    }

    engineRef.current = new PathEngine(paths, placedElements, templates, {
      speedMultiplier: speedRef.current,
      maxDuration: scenario.duration ?? undefined,
    })
  }, [scenario, paths, placedElements, templates])

  // Initialize engine on mount and when dependencies change
  useEffect(() => {
    buildEngine()
  }, [buildEngine])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (speedTimeoutRef.current !== null) {
        clearTimeout(speedTimeoutRef.current)
        speedTimeoutRef.current = null
      }
    }
  }, [])

  // Animation loop - runs continuously, checks isRunningRef internally
  useEffect(() => {
    let frameId: number | null = null

    const tick = (timestamp: number) => {
      // Always schedule next frame first to keep loop alive
      frameId = requestAnimationFrame(tick)

      // Skip processing if not running or no engine
      if (!isRunningRef.current || !engineRef.current) {
        lastTimeRef.current = 0
        return
      }

      const deltaTime = lastTimeRef.current
        ? timestamp - lastTimeRef.current
        : 16
      lastTimeRef.current = timestamp

      engineRef.current.tick(deltaTime)

      // Throttle state updates
      if (timestamp - lastUpdateRef.current > FRAME_INTERVAL) {
        setState({
          pallets: engineRef.current.getPallets(),
          simulationTime: engineRef.current.getSimulationTime(),
          isRunning: true,
        })
        lastUpdateRef.current = timestamp
      }
    }

    frameId = requestAnimationFrame(tick)

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, []) // No dependencies - loop runs forever, controlled by isRunningRef

  // Start animation
  const start = useCallback(() => {
    if (isRunningRef.current || !engineRef.current) return

    isRunningRef.current = true
    lastTimeRef.current = 0
    lastUpdateRef.current = 0
    setState((prev) => ({ ...prev, isRunning: true }))
  }, [])

  // Stop animation
  const stop = useCallback(() => {
    isRunningRef.current = false

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setState((prev) => ({ ...prev, isRunning: false }))
  }, [])

  // Reset simulation
  const reset = useCallback(() => {
    stop()
    if (engineRef.current) {
      engineRef.current.reset()
    }
    setState({
      pallets: [],
      simulationTime: 0,
      isRunning: false,
    })
  }, [stop])

  // Update speed
  const setSpeed = useCallback(
    (newSpeed: number) => {
      speedRef.current = newSpeed
      setSpeedState(newSpeed)

      // Rebuild engine with new speed
      const wasRunning = isRunningRef.current
      stop()
      buildEngine()
      setState((prev) => ({ ...prev, pallets: [], simulationTime: 0 }))

      if (wasRunning) {
        // Small delay to ensure state updates before restarting
        speedTimeoutRef.current = setTimeout(() => {
          if (engineRef.current) {
            isRunningRef.current = true
            lastTimeRef.current = 0
            lastUpdateRef.current = 0
            setState((prev) => ({ ...prev, isRunning: true }))
          }
        }, 0)
      }
    },
    [stop, buildEngine]
  )

  return {
    state,
    controls: {
      start,
      stop,
      reset,
      setSpeed,
    },
    speed,
  }
}
