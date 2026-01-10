"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import type {
  Flow,
  PlacedElement,
  ElementTemplate,
  Warehouse,
} from "@/server/db/schema"
import type { VisualizationState, PalletState } from "@/hooks/use-visualization"
import {
  generateMultiPath,
  getElementCenter,
  type Point,
} from "@/lib/pathfinding"

// Default colors when template data is missing
const DEFAULT_COLORS = { bg: "#6b7280", stroke: "#374151" }

// Rendering configuration
const PALLET_SIZE = 24
const PATH_LINE_WIDTH = 3
const PATH_DASH_PATTERN = [10, 5]
const CANVAS_PADDING = 50

interface VisualizationCanvasProps {
  warehouse: Warehouse | undefined
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  flows: Flow[]
  simulationState: VisualizationState
}

export function VisualizationCanvas({
  warehouse,
  placedElements,
  templates,
  flows,
  simulationState,
}: VisualizationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationCanvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Build template lookup map
  const templateMap = useMemo(() => {
    const map = new Map<string, ElementTemplate>()
    for (const template of templates) {
      map.set(template.id, template)
    }
    return map
  }, [templates])

  // Build element lookup map
  const elementMap = useMemo(() => {
    const map = new Map<string, PlacedElement>()
    for (const element of placedElements) {
      map.set(element.id, element)
    }
    return map
  }, [placedElements])

  // Resize handler
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ width, height })
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // Calculate view transform to fit all elements
  const viewTransform = useMemo(() => {
    // Calculate bounds
    let minX = 0,
      minY = 0,
      maxX = 800,
      maxY = 600
    if (placedElements.length > 0) {
      minX = Infinity
      minY = Infinity
      maxX = -Infinity
      maxY = -Infinity
      for (const element of placedElements) {
        minX = Math.min(minX, element.positionX)
        minY = Math.min(minY, element.positionY)
        maxX = Math.max(maxX, element.positionX + element.width)
        maxY = Math.max(maxY, element.positionY + element.height)
      }
    }

    const contentWidth = maxX - minX + CANVAS_PADDING * 2
    const contentHeight = maxY - minY + CANVAS_PADDING * 2

    const scaleX = canvasSize.width / contentWidth
    const scaleY = canvasSize.height / contentHeight
    const scale = Math.min(scaleX, scaleY, 1) // Don't zoom in beyond 1:1

    const offsetX =
      -minX + CANVAS_PADDING + (canvasSize.width / scale - contentWidth) / 2
    const offsetY =
      -minY + CANVAS_PADDING + (canvasSize.height / scale - contentHeight) / 2

    return { offsetX, offsetY, scale }
  }, [canvasSize, placedElements])

  // Transform world coordinates to canvas coordinates
  const worldToCanvas = useCallback(
    (point: Point): Point => {
      return {
        x: (point.x + viewTransform.offsetX) * viewTransform.scale,
        y: (point.y + viewTransform.offsetY) * viewTransform.scale,
      }
    },
    [viewTransform]
  )

  // Draw the static warehouse layout (background canvas)
  useEffect(() => {
    const canvas = backgroundCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Clear canvas with background color
    ctx.fillStyle = warehouse?.canvasState?.viewBackgroundColor ?? "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw each placed element
    for (const element of placedElements) {
      const template = templateMap.get(element.elementTemplateId)
      const data = template?.excalidrawData

      const pos = worldToCanvas({ x: element.positionX, y: element.positionY })
      const width = element.width * viewTransform.scale
      const height = element.height * viewTransform.scale

      // Save context for rotation
      ctx.save()

      // Apply rotation around element center
      if (element.rotation !== 0) {
        const centerX = pos.x + width / 2
        const centerY = pos.y + height / 2
        ctx.translate(centerX, centerY)
        ctx.rotate(element.rotation)
        ctx.translate(-centerX, -centerY)
      }

      // Draw element background
      ctx.fillStyle = data?.backgroundColor ?? DEFAULT_COLORS.bg
      ctx.globalAlpha = (data?.opacity ?? 80) / 100

      // Draw based on shape type (simplified - just rectangles for now)
      // Roundness type > 0 means the element is rounded, use a proportional radius
      const hasRoundness = data?.roundness?.type && data.roundness.type > 0
      const radius = hasRoundness ? Math.min(width, height) * 0.1 : 0
      if (radius > 0) {
        drawRoundedRect(ctx, pos.x, pos.y, width, height, radius)
        ctx.fill()
      } else {
        ctx.fillRect(pos.x, pos.y, width, height)
      }

      // Draw element stroke
      ctx.globalAlpha = 1
      ctx.strokeStyle = data?.strokeColor ?? DEFAULT_COLORS.stroke
      ctx.lineWidth = (data?.strokeWidth ?? 2) * viewTransform.scale

      if (data?.strokeStyle === "dashed") {
        ctx.setLineDash([8, 4])
      } else if (data?.strokeStyle === "dotted") {
        ctx.setLineDash([2, 2])
      } else {
        ctx.setLineDash([])
      }

      if (radius > 0) {
        drawRoundedRect(ctx, pos.x, pos.y, width, height, radius)
        ctx.stroke()
      } else {
        ctx.strokeRect(pos.x, pos.y, width, height)
      }

      ctx.setLineDash([])
      ctx.restore()

      // Draw element label
      if (element.label) {
        ctx.fillStyle = "#000000"
        ctx.font = `${12 * viewTransform.scale}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(element.label, pos.x + width / 2, pos.y + height / 2)
      }
    }

    // Draw flow paths
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
        drawPath(ctx, path, flow.color, worldToCanvas)
      }
    }
  }, [
    canvasSize,
    placedElements,
    templates,
    flows,
    warehouse?.canvasState?.viewBackgroundColor,
    viewTransform,
    worldToCanvas,
    templateMap,
    elementMap,
  ])

  // Draw animated pallets (animation canvas)
  useEffect(() => {
    const canvas = animationCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw pallets
    for (const pallet of simulationState.pallets) {
      drawPallet(ctx, pallet, viewTransform.scale, worldToCanvas)
    }
  }, [canvasSize, simulationState.pallets, viewTransform.scale, worldToCanvas])

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
      <canvas
        ref={backgroundCanvasRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />
      <canvas
        ref={animationCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}

// Helper function to draw rounded rectangle
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

// Helper function to draw flow path
function drawPath(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  color: string,
  worldToCanvas: (p: Point) => Point
) {
  if (path.length < 2) return

  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = PATH_LINE_WIDTH
  ctx.setLineDash(PATH_DASH_PATTERN)
  ctx.globalAlpha = 0.7

  const first = path[0]
  if (!first) return

  const start = worldToCanvas(first)
  ctx.moveTo(start.x, start.y)

  for (let i = 1; i < path.length; i++) {
    const pathPoint = path[i]
    if (!pathPoint) continue
    const point = worldToCanvas(pathPoint)
    ctx.lineTo(point.x, point.y)
  }

  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
}

// Helper function to draw pallet
function drawPallet(
  ctx: CanvasRenderingContext2D,
  pallet: PalletState,
  scale: number,
  worldToCanvas: (p: Point) => Point
) {
  const screenPos = worldToCanvas({ x: pallet.x, y: pallet.y })
  const size = PALLET_SIZE * scale

  // Draw glow effect
  ctx.shadowColor = pallet.color
  ctx.shadowBlur = 15
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Draw pallet square
  ctx.fillStyle = pallet.color
  ctx.fillRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size)

  // Reset shadow
  ctx.shadowBlur = 0

  // Draw border
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 2
  ctx.strokeRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size)
}
