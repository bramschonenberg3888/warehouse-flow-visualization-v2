"use client"

import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import type { PlacedElement, ElementTemplate, Path } from "@/server/db/schema"
import type { Pallet } from "@/lib/path-engine/engine"
import { generateMultiPath, type Point } from "@/lib/pathfinding"
import { getTemplateVisualProperties } from "@/lib/element-utils"
import { GRID_CELL_SIZE, gridToWorld, type GridCell } from "@/lib/grid-config"

const CANVAS_PADDING = 50
const PALLET_SIZE = 16
const PATH_LINE_WIDTH = 2

function parseGridCellId(id: string): GridCell | null {
  if (!id.startsWith("grid:")) return null
  const parts = id.split(":")
  if (parts.length !== 3) return null
  const col = parseInt(parts[1]!, 10)
  const row = parseInt(parts[2]!, 10)
  if (isNaN(col) || isNaN(row)) return null
  return { col, row }
}

interface PathVisualizationCanvasProps {
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  paths: Path[]
  pallets: Pallet[]
  gridColumns: number
  gridRows: number
}

export function PathVisualizationCanvas({
  placedElements,
  templates,
  paths,
  pallets,
  gridColumns,
  gridRows,
}: PathVisualizationCanvasProps) {
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

  // Build element lookup for stop positions
  const placedElementMap = useMemo(() => {
    const map = new Map<string, PlacedElement>()
    for (const el of placedElements) {
      map.set(el.id, el)
    }
    return map
  }, [placedElements])

  // Grid bounds
  const gridBounds = useMemo(
    () => ({
      minCol: 0,
      minRow: 0,
      maxCol: gridColumns,
      maxRow: gridRows,
    }),
    [gridColumns, gridRows]
  )

  // Calculate view transform to fit the grid
  const viewTransform = useMemo(() => {
    const gridWidth =
      (gridBounds.maxCol - gridBounds.minCol + 1) * GRID_CELL_SIZE
    const gridHeight =
      (gridBounds.maxRow - gridBounds.minRow + 1) * GRID_CELL_SIZE

    const contentWidth = gridWidth + CANVAS_PADDING * 2
    const contentHeight = gridHeight + CANVAS_PADDING * 2

    const scaleX = canvasSize.width / contentWidth
    const scaleY = canvasSize.height / contentHeight
    const scale = Math.min(scaleX, scaleY, 1)

    const worldMinX = gridBounds.minCol * GRID_CELL_SIZE
    const worldMinY = gridBounds.minRow * GRID_CELL_SIZE

    const offsetX =
      -worldMinX +
      CANVAS_PADDING +
      (canvasSize.width / scale - contentWidth) / 2
    const offsetY =
      -worldMinY +
      CANVAS_PADDING +
      (canvasSize.height / scale - contentHeight) / 2

    return { offsetX, offsetY, scale }
  }, [canvasSize, gridBounds])

  // Transform world coordinates to canvas coordinates
  const worldToCanvas = useCallback(
    (point: Point): Point => ({
      x: (point.x + viewTransform.offsetX) * viewTransform.scale,
      y: (point.y + viewTransform.offsetY) * viewTransform.scale,
    }),
    [viewTransform]
  )

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

  // Resolve stop position
  const resolveStopPosition = useCallback(
    (stopId: string): Point | null => {
      const gridCell = parseGridCellId(stopId)
      if (gridCell) {
        return gridToWorld(gridCell)
      }
      const element = placedElementMap.get(stopId)
      if (element) {
        return {
          x: element.positionX + element.width / 2,
          y: element.positionY + element.height / 2,
        }
      }
      return null
    },
    [placedElementMap]
  )

  // Draw background canvas (static content)
  useEffect(() => {
    const canvas = backgroundCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Clear canvas
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const scaledCellSize = GRID_CELL_SIZE * viewTransform.scale

    // Draw grid cells
    for (let col = gridBounds.minCol; col <= gridBounds.maxCol; col++) {
      for (let row = gridBounds.minRow; row <= gridBounds.maxRow; row++) {
        const worldPos = {
          x: col * GRID_CELL_SIZE,
          y: row * GRID_CELL_SIZE,
        }
        const canvasPos = worldToCanvas(worldPos)

        // Draw cell border
        ctx.strokeStyle = "#e2e8f0"
        ctx.lineWidth = 1
        ctx.strokeRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)
      }
    }

    // Draw path lines
    for (const path of paths) {
      if (!path.isActive || path.stops.length < 2) continue

      const points: Point[] = []
      for (const stopId of path.stops) {
        const pos = resolveStopPosition(stopId)
        if (pos) points.push(pos)
      }

      if (points.length >= 2) {
        const pathLine = generateMultiPath(points)
        drawPath(ctx, pathLine, path.color, worldToCanvas, 0.4)
      }
    }

    // Draw placed elements
    for (const element of placedElements) {
      const template = templateMap.get(element.elementTemplateId)
      const visualProps = getTemplateVisualProperties(template?.excalidrawData)

      const pos = worldToCanvas({ x: element.positionX, y: element.positionY })
      const width = element.width * viewTransform.scale
      const height = element.height * viewTransform.scale

      ctx.save()

      if (element.rotation !== 0) {
        const centerX = pos.x + width / 2
        const centerY = pos.y + height / 2
        ctx.translate(centerX, centerY)
        ctx.rotate(element.rotation)
        ctx.translate(-centerX, -centerY)
      }

      // Draw element background
      ctx.fillStyle = visualProps.backgroundColor
      ctx.globalAlpha = visualProps.opacity / 100

      const hasRoundness =
        visualProps.roundness?.type && visualProps.roundness.type > 0
      const radius = hasRoundness ? Math.min(width, height) * 0.1 : 0

      if (radius > 0) {
        drawRoundedRect(ctx, pos.x, pos.y, width, height, radius)
        ctx.fill()
      } else {
        ctx.fillRect(pos.x, pos.y, width, height)
      }

      // Draw element stroke
      ctx.globalAlpha = 1
      ctx.strokeStyle = visualProps.strokeColor
      ctx.lineWidth = visualProps.strokeWidth * viewTransform.scale

      if (visualProps.strokeStyle === "dashed") {
        ctx.setLineDash([8, 4])
      } else if (visualProps.strokeStyle === "dotted") {
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
  }, [
    canvasSize,
    placedElements,
    templates,
    paths,
    viewTransform,
    worldToCanvas,
    templateMap,
    gridBounds,
    resolveStopPosition,
  ])

  // Draw animation canvas (pallets)
  useEffect(() => {
    const canvas = animationCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw pallets
    for (const pallet of pallets) {
      const canvasPos = worldToCanvas({ x: pallet.x, y: pallet.y })
      const size = PALLET_SIZE * viewTransform.scale

      // Draw pallet
      ctx.fillStyle = pallet.color
      ctx.globalAlpha = pallet.state === "dwelling" ? 0.7 : 1

      ctx.beginPath()
      ctx.arc(canvasPos.x, canvasPos.y, size / 2, 0, Math.PI * 2)
      ctx.fill()

      // Draw border
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw state indicator for dwelling
      if (pallet.state === "dwelling") {
        ctx.strokeStyle = pallet.color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(canvasPos.x, canvasPos.y, size / 2 + 3, 0, Math.PI * 2)
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.globalAlpha = 1
    }
  }, [canvasSize, pallets, viewTransform, worldToCanvas])

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
      {pallets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded">
            Press Play to start the simulation
          </p>
        </div>
      )}
    </div>
  )
}

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

function drawPath(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  color: string,
  worldToCanvas: (p: Point) => Point,
  alpha: number
) {
  if (path.length < 2) return

  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = PATH_LINE_WIDTH
  ctx.setLineDash([])
  ctx.globalAlpha = alpha

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
  ctx.globalAlpha = 1
}
