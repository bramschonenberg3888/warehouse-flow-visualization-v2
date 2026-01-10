"use client"

import { useRef, useEffect, useCallback } from "react"
import type { Flow, PlacedElement } from "@/server/db/schema"
import type {
  FlowSimulationState,
  FlowPalletState,
} from "@/hooks/use-flow-simulation"
import {
  generateMultiPath,
  getElementCenter,
  type Point,
} from "@/lib/pathfinding"

// Pallet rendering configuration
const PALLET_SIZE = 20
const PATH_LINE_WIDTH = 2
const PATH_DASH_PATTERN = [8, 4]

interface CanvasState {
  scrollX: number
  scrollY: number
  zoom: { value: number }
  width: number
  height: number
}

interface FlowCanvasOverlayProps {
  flows: Flow[] | undefined
  placedElements: PlacedElement[] | undefined
  canvasState: CanvasState | null
  simulationState: FlowSimulationState
  showPaths: boolean
  buildingSequence?: string[]
  buildingColor?: string
}

export function FlowCanvasOverlay({
  flows,
  placedElements,
  canvasState,
  simulationState,
  showPaths,
  buildingSequence,
  buildingColor = "#3b82f6",
}: FlowCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Build element lookup map
  const getElementMap = useCallback(() => {
    const map = new Map<string, PlacedElement>()
    if (placedElements) {
      for (const element of placedElements) {
        map.set(element.id, element)
      }
    }
    return map
  }, [placedElements])

  // Transform world coordinates to screen coordinates
  const transformToScreen = useCallback(
    (point: Point): Point => {
      if (!canvasState) return point
      return {
        x: (point.x + canvasState.scrollX) * canvasState.zoom.value,
        y: (point.y + canvasState.scrollY) * canvasState.zoom.value,
      }
    },
    [canvasState]
  )

  // Draw a path on the canvas
  const drawPath = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      path: Point[],
      color: string,
      isDashed: boolean = true
    ) => {
      if (path.length < 2) return

      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = PATH_LINE_WIDTH
      if (isDashed) {
        ctx.setLineDash(PATH_DASH_PATTERN)
      } else {
        ctx.setLineDash([])
      }

      const firstPoint = path[0]
      if (!firstPoint) return
      const start = transformToScreen(firstPoint)
      ctx.moveTo(start.x, start.y)

      for (let i = 1; i < path.length; i++) {
        const pathPoint = path[i]
        if (!pathPoint) continue
        const point = transformToScreen(pathPoint)
        ctx.lineTo(point.x, point.y)
      }

      ctx.stroke()
      ctx.setLineDash([])
    },
    [transformToScreen]
  )

  // Draw a pallet (animated marker)
  const drawPallet = useCallback(
    (ctx: CanvasRenderingContext2D, pallet: FlowPalletState) => {
      const screenPos = transformToScreen({ x: pallet.x, y: pallet.y })
      const size = PALLET_SIZE * (canvasState?.zoom.value ?? 1)

      // Draw glow effect
      ctx.shadowColor = pallet.color
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Draw pallet rectangle
      ctx.fillStyle = pallet.color
      ctx.fillRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size)

      // Reset shadow
      ctx.shadowBlur = 0

      // Draw border
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.strokeRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size)
    },
    [transformToScreen, canvasState?.zoom.value]
  )

  // Draw sequence number badges on elements during flow building
  const drawSequenceBadges = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      sequence: string[],
      elementMap: Map<string, PlacedElement>
    ) => {
      sequence.forEach((elementId, index) => {
        const element = elementMap.get(elementId)
        if (!element) return

        const center = getElementCenter(element)
        const screenPos = transformToScreen(center)
        const radius = 12 * (canvasState?.zoom.value ?? 1)

        // Draw badge circle
        ctx.beginPath()
        ctx.arc(
          screenPos.x,
          screenPos.y -
            (element.height / 2) * (canvasState?.zoom.value ?? 1) -
            radius -
            5,
          radius,
          0,
          Math.PI * 2
        )
        ctx.fillStyle = "#3b82f6"
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw number
        ctx.fillStyle = "#ffffff"
        ctx.font = `bold ${12 * (canvasState?.zoom.value ?? 1)}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(
          (index + 1).toString(),
          screenPos.x,
          screenPos.y -
            (element.height / 2) * (canvasState?.zoom.value ?? 1) -
            radius -
            5
        )
      })
    },
    [transformToScreen, canvasState?.zoom.value]
  )

  // Main render effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasState) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match Excalidraw
    canvas.width = canvasState.width
    canvas.height = canvasState.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const elementMap = getElementMap()

    // Draw flow paths if enabled
    if (showPaths && flows) {
      const activeFlows = flows.filter((f) => f.isActive)
      for (const flow of activeFlows) {
        const points: Point[] = []
        for (const elementId of flow.elementSequence) {
          const element = elementMap.get(elementId)
          if (element) {
            points.push(getElementCenter(element))
          }
        }

        if (points.length >= 2) {
          const path = generateMultiPath(points)
          drawPath(ctx, path, flow.color, true)
        }
      }
    }

    // Draw building sequence preview path
    if (buildingSequence && buildingSequence.length >= 2) {
      const points: Point[] = []
      for (const elementId of buildingSequence) {
        const element = elementMap.get(elementId)
        if (element) {
          points.push(getElementCenter(element))
        }
      }

      if (points.length >= 2) {
        const path = generateMultiPath(points)
        drawPath(ctx, path, buildingColor, false)
      }
    }

    // Draw sequence badges during building
    if (buildingSequence && buildingSequence.length > 0) {
      drawSequenceBadges(ctx, buildingSequence, elementMap)
    }

    // Draw animated pallets
    if (simulationState.isRunning) {
      for (const pallet of simulationState.pallets) {
        drawPallet(ctx, pallet)
      }
    }
  }, [
    flows,
    placedElements,
    canvasState,
    simulationState,
    showPaths,
    buildingSequence,
    buildingColor,
    getElementMap,
    drawPath,
    drawPallet,
    drawSequenceBadges,
  ])

  if (!canvasState) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      style={{
        width: canvasState.width,
        height: canvasState.height,
      }}
    />
  )
}
