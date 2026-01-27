"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import type { PlacedElement, ElementTemplate } from "@/server/db/schema"
import type { ExcalidrawElementType } from "@/components/editor/excalidraw-wrapper"
import { generateMultiPath, type Point } from "@/lib/pathfinding"
import { getTemplateElements, drawMultiShapeElement } from "@/lib/element-utils"
import {
  GRID_CELL_SIZE,
  worldToGrid,
  gridToWorld,
  type GridCell,
} from "@/lib/grid-config"

const CANVAS_PADDING = 50
const BADGE_RADIUS = 12
const PATH_LINE_WIDTH = 3

// Grid cell ID format: "grid:{col}:{row}"
function gridCellId(col: number, row: number): string {
  return `grid:${col}:${row}`
}

function parseGridCellId(id: string): GridCell | null {
  if (!id.startsWith("grid:")) return null
  const parts = id.split(":")
  if (parts.length !== 3) return null
  const col = parseInt(parts[1]!, 10)
  const row = parseInt(parts[2]!, 10)
  if (isNaN(col) || isNaN(row)) return null
  return { col, row }
}

interface FlowEditorCanvasProps {
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  orphanElements?: ExcalidrawElementType[]
  sequence: string[]
  flowColor: string
  onElementClick: (elementId: string) => void
  gridColumns: number
  gridRows: number
}

export function FlowEditorCanvas({
  placedElements,
  templates,
  orphanElements = [],
  sequence,
  flowColor,
  onElementClick,
  gridColumns,
  gridRows,
}: FlowEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null)

  // Build template lookup map
  const templateMap = useMemo(() => {
    const map = new Map<string, ElementTemplate>()
    for (const template of templates) {
      map.set(template.id, template)
    }
    return map
  }, [templates])

  // Build set of excalidrawIds that are tracked as placedElements
  const trackedGroupIds = useMemo(() => {
    return new Set(placedElements.map((pe) => pe.excalidrawId))
  }, [placedElements])

  // Filter orphan elements to only include those not tracked as placedElements
  const filteredOrphanElements = useMemo(() => {
    return orphanElements.filter((el) => {
      if (el.isDeleted) return false
      const groupIds = el.groupIds || []
      return !groupIds.some((gid: string) => trackedGroupIds.has(gid))
    })
  }, [orphanElements, trackedGroupIds])

  // Build sequence set for quick lookup
  const sequenceSet = useMemo(() => new Set(sequence), [sequence])

  // Build sequence index map for badges
  const sequenceIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    sequence.forEach((id, index) => map.set(id, index))
    return map
  }, [sequence])

  // Use warehouse grid dimensions
  const gridBounds = useMemo(() => {
    return {
      minCol: 0,
      minRow: 0,
      maxCol: gridColumns,
      maxRow: gridRows,
    }
  }, [gridColumns, gridRows])

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

    // Offset to center the grid
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

  // Transform canvas coordinates to world coordinates
  const canvasToWorld = useCallback(
    (canvasX: number, canvasY: number): Point => ({
      x: canvasX / viewTransform.scale - viewTransform.offsetX,
      y: canvasY / viewTransform.scale - viewTransform.offsetY,
    }),
    [viewTransform]
  )

  // Find grid cell at canvas position
  const findGridCellAtPosition = useCallback(
    (canvasX: number, canvasY: number): string => {
      const world = canvasToWorld(canvasX, canvasY)
      const cell = worldToGrid(world.x, world.y)
      return gridCellId(cell.col, cell.row)
    },
    [canvasToWorld]
  )

  // Handle canvas click - click on grid cell
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const cellId = findGridCellAtPosition(canvasX, canvasY)
      onElementClick(cellId)
    },
    [findGridCellAtPosition, onElementClick]
  )

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const cellId = findGridCellAtPosition(canvasX, canvasY)
      setHoveredCellId(cellId)
    },
    [findGridCellAtPosition]
  )

  // Get center point for a sequence item (grid cell or placed element)
  const getSequenceItemCenter = useCallback(
    (id: string): Point | null => {
      const gridCell = parseGridCellId(id)
      if (gridCell) {
        return gridToWorld(gridCell)
      }
      // Legacy: support placed element IDs
      const element = placedElements.find((e) => e.id === id)
      if (element) {
        return {
          x: element.positionX + element.width / 2,
          y: element.positionY + element.height / 2,
        }
      }
      return null
    },
    [placedElements]
  )

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Clear canvas with background
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const scaledCellSize = GRID_CELL_SIZE * viewTransform.scale

    // Draw grid cells
    for (let col = gridBounds.minCol; col <= gridBounds.maxCol; col++) {
      for (let row = gridBounds.minRow; row <= gridBounds.maxRow; row++) {
        const cellId = gridCellId(col, row)
        const worldPos = {
          x: col * GRID_CELL_SIZE,
          y: row * GRID_CELL_SIZE,
        }
        const canvasPos = worldToCanvas(worldPos)

        const isHovered = cellId === hoveredCellId
        const isInSequence = sequenceSet.has(cellId)

        // Draw cell background
        if (isInSequence) {
          ctx.fillStyle = flowColor
          ctx.globalAlpha = 0.2
          ctx.fillRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)
          ctx.globalAlpha = 1
        } else if (isHovered) {
          ctx.fillStyle = flowColor
          ctx.globalAlpha = 0.1
          ctx.fillRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)
          ctx.globalAlpha = 1
        }

        // Draw cell border
        ctx.strokeStyle = isInSequence || isHovered ? flowColor : "#e2e8f0"
        ctx.lineWidth = isInSequence || isHovered ? 2 : 1
        ctx.strokeRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)
      }
    }

    // Draw flow path preview
    if (sequence.length >= 2) {
      const points: Point[] = []
      for (const id of sequence) {
        const center = getSequenceItemCenter(id)
        if (center) {
          points.push(center)
        }
      }

      if (points.length >= 2) {
        const path = generateMultiPath(points)
        drawPath(ctx, path, flowColor, worldToCanvas)
      }
    }

    // Draw sequence badges on grid cells
    for (const [id, index] of sequenceIndexMap) {
      const gridCell = parseGridCellId(id)
      if (!gridCell) continue

      const center = gridToWorld(gridCell)
      const canvasCenter = worldToCanvas(center)

      // Badge background
      ctx.beginPath()
      ctx.arc(canvasCenter.x, canvasCenter.y, BADGE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = flowColor
      ctx.fill()

      // Badge border
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Badge number
      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${11}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(String(index + 1), canvasCenter.x, canvasCenter.y)
    }

    // Draw placed elements on top of the grid
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

    // Draw orphan elements
    for (const element of filteredOrphanElements) {
      const pos = worldToCanvas({ x: element.x, y: element.y })
      const width = element.width * viewTransform.scale
      const height = element.height * viewTransform.scale

      ctx.save()

      if (element.angle && element.angle !== 0) {
        const centerX = pos.x + width / 2
        const centerY = pos.y + height / 2
        ctx.translate(centerX, centerY)
        ctx.rotate(element.angle)
        ctx.translate(-centerX, -centerY)
      }

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
  }, [
    canvasSize,
    placedElements,
    templates,
    sequence,
    flowColor,
    hoveredCellId,
    viewTransform,
    worldToCanvas,
    templateMap,
    sequenceSet,
    sequenceIndexMap,
    filteredOrphanElements,
    gridBounds,
    getSequenceItemCenter,
  ])

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ width: "100%", height: "100%" }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCellId(null)}
      />
      {placedElements.length === 0 && filteredOrphanElements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded">
            No elements in this warehouse. Add elements in the warehouse editor
            first.
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
  worldToCanvas: (p: Point) => Point
) {
  if (path.length < 2) return

  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = PATH_LINE_WIDTH
  ctx.setLineDash([])
  ctx.globalAlpha = 0.8

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
