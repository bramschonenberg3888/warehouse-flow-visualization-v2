"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import type {
  PlacedElement,
  ElementTemplate,
  Warehouse,
} from "@/server/db/schema"
import type { ExcalidrawElementType } from "@/components/editor/excalidraw-wrapper"
import type {
  ScenarioVisualizationState,
  ScenarioPalletState,
} from "@/hooks/use-scenario-visualization"
import type {
  Scenario,
  FlowDefinition,
  LocationNode,
} from "@/lib/scenario-engine/types"
import { generatePath, type Point } from "@/lib/pathfinding"
import { getTemplateElements, drawMultiShapeElement } from "@/lib/element-utils"

// Rendering configuration
const PALLET_SIZE = 24
const PATH_LINE_WIDTH = 3
const PATH_DASH_PATTERN = [10, 5]
const CANVAS_PADDING = 50

interface ScenarioVisualizationCanvasProps {
  warehouse: Warehouse | undefined
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  scenario: Scenario | null
  simulationState: ScenarioVisualizationState
}

export function ScenarioVisualizationCanvas({
  warehouse,
  placedElements,
  templates,
  scenario,
  simulationState,
}: ScenarioVisualizationCanvasProps) {
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

  // Build set of excalidrawIds that are tracked as placedElements
  const trackedGroupIds = useMemo(() => {
    return new Set(placedElements.map((pe) => pe.excalidrawId))
  }, [placedElements])

  // Extract and filter orphan elements from warehouse canvasState
  const filteredOrphanElements = useMemo(() => {
    const canvasElements =
      (warehouse?.canvasState?.["elements"] as
        | ExcalidrawElementType[]
        | undefined) ?? []
    return canvasElements.filter((el) => {
      if (el.isDeleted) return false
      const groupIds = el.groupIds || []
      return !groupIds.some((gid: string) => trackedGroupIds.has(gid))
    })
  }, [warehouse?.canvasState, trackedGroupIds])

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

  // Calculate view transform to fit all elements (including orphans)
  const viewTransform = useMemo(() => {
    // Calculate bounds
    let minX = 0,
      minY = 0,
      maxX = 800,
      maxY = 600

    const hasElements =
      placedElements.length > 0 || filteredOrphanElements.length > 0

    if (hasElements) {
      minX = Infinity
      minY = Infinity
      maxX = -Infinity
      maxY = -Infinity

      // Include placed elements in bounds
      for (const element of placedElements) {
        minX = Math.min(minX, element.positionX)
        minY = Math.min(minY, element.positionY)
        maxX = Math.max(maxX, element.positionX + element.width)
        maxY = Math.max(maxY, element.positionY + element.height)
      }

      // Include orphan elements in bounds
      for (const element of filteredOrphanElements) {
        minX = Math.min(minX, element.x)
        minY = Math.min(minY, element.y)
        maxX = Math.max(maxX, element.x + element.width)
        maxY = Math.max(maxY, element.y + element.height)
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
  }, [canvasSize, placedElements, filteredOrphanElements])

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

  // Get element center
  const getElementCenter = useCallback(
    (elementId: string): Point | null => {
      const element = elementMap.get(elementId)
      if (!element) return null
      return {
        x: element.positionX + element.width / 2,
        y: element.positionY + element.height / 2,
      }
    },
    [elementMap]
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
      const templateElements = getTemplateElements(
        template?.excalidrawData,
        template?.defaultWidth ?? element.width,
        template?.defaultHeight ?? element.height
      )

      const pos = worldToCanvas({ x: element.positionX, y: element.positionY })
      const width = element.width * viewTransform.scale
      const height = element.height * viewTransform.scale

      // Calculate scale factors for placed element vs template default size
      const scaleX = element.width / (template?.defaultWidth ?? element.width)
      const scaleY =
        element.height / (template?.defaultHeight ?? element.height)

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

      // Draw all shapes in the template
      drawMultiShapeElement(
        ctx,
        templateElements,
        pos.x,
        pos.y,
        viewTransform.scale,
        scaleX,
        scaleY
      )

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

    // Draw orphan elements (elements drawn directly on canvas, not from templates)
    for (const element of filteredOrphanElements) {
      const pos = worldToCanvas({ x: element.x, y: element.y })
      const width = element.width * viewTransform.scale
      const height = element.height * viewTransform.scale

      ctx.save()

      // Apply rotation around element center
      if (element.angle && element.angle !== 0) {
        const centerX = pos.x + width / 2
        const centerY = pos.y + height / 2
        ctx.translate(centerX, centerY)
        ctx.rotate(element.angle)
        ctx.translate(-centerX, -centerY)
      }

      // Draw element background
      ctx.fillStyle = element.backgroundColor || "#6b7280"
      ctx.globalAlpha = (element.opacity ?? 100) / 100

      const hasRoundness = element.roundness?.type && element.roundness.type > 0
      const radius = hasRoundness ? Math.min(width, height) * 0.1 : 0

      if (radius > 0) {
        drawRoundedRect(ctx, pos.x, pos.y, width, height, radius)
        ctx.fill()
      } else {
        ctx.fillRect(pos.x, pos.y, width, height)
      }

      // Draw element stroke
      ctx.globalAlpha = 1
      ctx.strokeStyle = element.strokeColor || "#374151"
      ctx.lineWidth = (element.strokeWidth || 2) * viewTransform.scale

      if (element.strokeStyle === "dashed") {
        ctx.setLineDash([8, 4])
      } else if (element.strokeStyle === "dotted") {
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
    }

    // Draw flow paths from scenario
    if (scenario) {
      for (const flow of scenario.flows) {
        if (!flow.isActive) continue
        drawFlowPaths(ctx, flow, getElementCenter, worldToCanvas)
      }
    }
  }, [
    canvasSize,
    placedElements,
    templates,
    scenario,
    warehouse?.canvasState?.viewBackgroundColor,
    viewTransform,
    worldToCanvas,
    templateMap,
    getElementCenter,
    filteredOrphanElements,
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
      drawScenarioPallet(ctx, pallet, viewTransform.scale, worldToCanvas)
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

// Helper function to draw flow paths based on scenario nodes and edges
function drawFlowPaths(
  ctx: CanvasRenderingContext2D,
  flow: FlowDefinition,
  getElementCenter: (elementId: string) => Point | null,
  worldToCanvas: (p: Point) => Point
) {
  // Build node position map
  const nodePositions = new Map<string, Point>()

  for (const node of flow.nodes) {
    if (node.type === "location") {
      const locationNode = node as LocationNode
      if (locationNode.target.type === "fixed") {
        const pos = getElementCenter(locationNode.target.elementId)
        if (pos) {
          nodePositions.set(node.id, pos)
        }
      }
    }
  }

  // Draw edges
  for (const edge of flow.edges) {
    const fromPos = nodePositions.get(edge.from)
    const toPos = nodePositions.get(edge.to)

    if (fromPos && toPos) {
      const path = generatePath(fromPos, toPos)
      drawPath(ctx, path, flow.color, worldToCanvas)
    }
  }
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

// Helper function to draw scenario pallet with state indication
function drawScenarioPallet(
  ctx: CanvasRenderingContext2D,
  pallet: ScenarioPalletState,
  scale: number,
  worldToCanvas: (p: Point) => Point
) {
  const screenPos = worldToCanvas({ x: pallet.x, y: pallet.y })
  const size = PALLET_SIZE * scale

  // Draw glow effect - different based on state
  ctx.shadowColor = pallet.color
  ctx.shadowBlur = pallet.state === "moving" ? 15 : 8
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Draw pallet square
  ctx.fillStyle = pallet.color
  ctx.fillRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size)

  // Reset shadow
  ctx.shadowBlur = 0

  // Draw border - different based on state
  if (pallet.state === "dwelling") {
    // Pulsing border for dwelling
    ctx.strokeStyle = "#ffff00"
    ctx.lineWidth = 3
  } else if (pallet.state === "waiting") {
    // Red border for waiting
    ctx.strokeStyle = "#ff0000"
    ctx.lineWidth = 3
  } else {
    // White border for moving
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
  }

  ctx.strokeRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size)

  // Draw state indicator
  if (pallet.state === "dwelling") {
    // Small circle in corner for dwelling
    ctx.fillStyle = "#ffff00"
    ctx.beginPath()
    ctx.arc(
      screenPos.x + size / 2 - 4,
      screenPos.y - size / 2 + 4,
      3,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }
}
