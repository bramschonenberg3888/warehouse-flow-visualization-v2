"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  ScenarioEngine,
  type Scenario,
  type Pallet,
  type PlacedElementInfo,
} from "@/lib/scenario-engine"
import type { PlacedElement, ElementTemplate } from "@/server/db/schema"

// Configuration
const MIN_SPEED = 0.5
const MAX_SPEED = 3.0
const DEFAULT_SPEED = 1.0
const RENDER_INTERVAL = 33 // ~30fps for React state updates

export interface ScenarioPalletState {
  id: string
  flowId: string
  x: number
  y: number
  state: Pallet["state"]
  color: string
}

export interface ScenarioVisualizationState {
  isRunning: boolean
  pallets: ScenarioPalletState[]
  simulationTime: number
}

export interface UseScenarioVisualizationResult {
  state: ScenarioVisualizationState
  start: () => void
  stop: () => void
  reset: () => void
  speed: number
  setSpeed: (speed: number) => void
}

/**
 * Convert PlacedElement to PlacedElementInfo for the engine
 */
function toPlacedElementInfo(
  element: PlacedElement,
  templateMap: Map<string, ElementTemplate>
): PlacedElementInfo {
  const template = templateMap.get(element.elementTemplateId)
  return {
    id: element.id,
    categoryId: template?.categoryId ?? null,
    positionX: element.positionX,
    positionY: element.positionY,
    width: element.width,
    height: element.height,
    metadata: element.metadata ?? undefined,
  }
}

/**
 * Hook for running scenario-based visualizations using the ScenarioEngine
 */
export function useScenarioVisualization(
  scenario: Scenario | null,
  placedElements: PlacedElement[] | undefined,
  templates: ElementTemplate[] | undefined
): UseScenarioVisualizationResult {
  // Build template lookup map
  const templateMap = useRef<Map<string, ElementTemplate>>(new Map())
  if (templates) {
    templateMap.current.clear()
    for (const template of templates) {
      templateMap.current.set(template.id, template)
    }
  }
  // Speed state
  const [speed, setSpeedState] = useState(DEFAULT_SPEED)
  const speedRef = useRef(DEFAULT_SPEED)

  const setSpeed = useCallback((newSpeed: number) => {
    const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed))
    speedRef.current = clampedSpeed
    setSpeedState(clampedSpeed)

    // Update engine settings if running
    if (engineRef.current) {
      engineRef.current.updateSettings({ speedMultiplier: clampedSpeed })
    }
  }, [])

  // Engine and animation refs
  const engineRef = useRef<ScenarioEngine | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const lastTickTimeRef = useRef<number>(0)
  const lastRenderTimeRef = useRef<number>(0)

  // Build flow color map
  const flowColorMap = useRef<Map<string, string>>(new Map())

  const [state, setState] = useState<ScenarioVisualizationState>({
    isRunning: false,
    pallets: [],
    simulationTime: 0,
  })

  // Track scenario ID to detect actual changes (not just reference changes)
  const lastScenarioIdRef = useRef<string | null>(null)

  // Create engine instance
  const createEngine = useCallback(
    (currentScenario: Scenario, elements: PlacedElementInfo[]) => {
      // Build color map
      flowColorMap.current.clear()
      for (const flow of currentScenario.flows) {
        flowColorMap.current.set(flow.id, flow.color)
      }

      // Create engine with current speed
      const fullScenario: Scenario = {
        ...currentScenario,
        settings: {
          ...currentScenario.settings,
          speedMultiplier: speedRef.current,
        },
      }

      return new ScenarioEngine(fullScenario, {
        elements,
        events: {
          onPalletSpawned: (pallet) => {
            console.log("Pallet spawned:", pallet.id)
          },
          onPalletCompleted: (pallet) => {
            console.log("Pallet completed:", pallet.id)
          },
        },
      })
    },
    []
  )

  // Initialize engine - only creates new engine if scenario ID changes
  const initializeEngine = useCallback(
    (forceRecreate = false) => {
      if (!scenario || !placedElements) {
        return false
      }

      // Skip if engine exists and scenario hasn't changed (by ID)
      const scenarioId = scenario.flows[0]?.id ?? "unknown"
      if (
        !forceRecreate &&
        engineRef.current &&
        lastScenarioIdRef.current === scenarioId
      ) {
        return true
      }

      const elements = placedElements.map((el) =>
        toPlacedElementInfo(el, templateMap.current)
      )
      // eslint-disable-next-line react-hooks/immutability
      engineRef.current = createEngine(scenario, elements)
      lastScenarioIdRef.current = scenarioId
      return true
    },
    [scenario, placedElements, createEngine]
  )

  // Animation loop
  useEffect(() => {
    if (!state.isRunning || !engineRef.current) return

    const animate = (timestamp: number) => {
      if (!isRunningRef.current || !engineRef.current) return

      // Calculate delta time
      if (lastTickTimeRef.current === 0) {
        lastTickTimeRef.current = timestamp
      }
      const deltaTime = timestamp - lastTickTimeRef.current
      lastTickTimeRef.current = timestamp

      // Tick the engine
      engineRef.current.tick(deltaTime)

      // Throttle React state updates to ~30fps
      if (timestamp - lastRenderTimeRef.current >= RENDER_INTERVAL) {
        lastRenderTimeRef.current = timestamp

        const enginePallets = engineRef.current.getPallets()
        const pallets: ScenarioPalletState[] = enginePallets.map((pallet) => ({
          id: pallet.id,
          flowId: pallet.flowId,
          x: pallet.position.x,
          y: pallet.position.y,
          state: pallet.state,
          color: flowColorMap.current.get(pallet.flowId) ?? "#3b82f6",
        }))

        setState({
          isRunning: true,
          pallets,
          simulationTime: engineRef.current.getSimulationTime(),
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
    if (!scenario || !placedElements) return

    // Initialize engine if needed
    if (!engineRef.current) {
      initializeEngine()
    }

    if (!engineRef.current) return

    isRunningRef.current = true
    lastTickTimeRef.current = 0
    lastRenderTimeRef.current = 0

    setState({
      isRunning: true,
      pallets: [],
      simulationTime: 0,
    })
  }, [scenario, placedElements, initializeEngine])

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

    // Reset the engine
    if (engineRef.current) {
      engineRef.current.reset()
    } else {
      initializeEngine(true) // Force recreate if needed
    }

    setState({
      isRunning: false,
      pallets: [],
      simulationTime: 0,
    })
  }, [stop, initializeEngine])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Re-initialize when scenario or elements change (but only if scenario ID changes)
  useEffect(() => {
    if (scenario && placedElements) {
      // initializeEngine already checks if scenario ID changed
      initializeEngine()
    } else {
      // Clear engine when data is missing
      // eslint-disable-next-line react-hooks/immutability
      engineRef.current = null
      lastScenarioIdRef.current = null
    }
  }, [scenario, placedElements, initializeEngine])

  return { state, start, stop, reset, speed, setSpeed }
}
