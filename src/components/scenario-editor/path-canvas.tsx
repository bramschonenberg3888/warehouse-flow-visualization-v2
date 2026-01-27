"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import type { PlacedElement, ElementTemplate, Path } from "@/server/db/schema"
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

interface PathCanvasProps {
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  paths: Path[]
  selectedPath: Path | undefined
  onStopClick: (stopId: string) => void
  gridColumns: number
  gridRows: number
}

export function PathCanvas({
  placedElements,
  templates,
  paths,
  selectedPath,
  onStopClick,
  gridColumns,
  gridRows,
}: PathCanvasProps) {
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

  // Build placed element lookup map for O(1) lookups
  const placedElementMap = useMemo(() => {
    const map = new Map<string, PlacedElement>()
    for (const element of placedElements) {
      map.set(element.id, element)
    }
    return map
  }, [placedElements])

  // Build sequence set for quick lookup (selected path only)
  const selectedStopsSet = useMemo(
    () => new Set(selectedPath?.stops ?? []),
    [selectedPath?.stops]
  )

  // Build sequence index map for badges (selected path only)
  const selectedStopsIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    selectedPath?.stops.forEach((id, index) => map.set(id, index))
    return map
  }, [selectedPath?.stops])

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

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const cellId = findGridCellAtPosition(canvasX, canvasY)
      onStopClick(cellId)
    },
    [findGridCellAtPosition, onStopClick]
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

  // Get center point for a stop item
  const getStopCenter = useCallback(
    (id: string): Point | null => {
      const gridCell = parseGridCellId(id)
      if (gridCell) {
        return gridToWorld(gridCell)
      }
      const element = placedElementMap.get(id)
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

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
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
        const cellId = gridCellId(col, row)
        const worldPos = {
          x: col * GRID_CELL_SIZE,
          y: row * GRID_CELL_SIZE,
        }
        const canvasPos = worldToCanvas(worldPos)

        const isHovered = cellId === hoveredCellId
        const isInSelectedPath = selectedStopsSet.has(cellId)

        // Draw cell background
        if (isInSelectedPath && selectedPath) {
          ctx.fillStyle = selectedPath.color
          ctx.globalAlpha = 0.2
          ctx.fillRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)
          ctx.globalAlpha = 1
        } else if (isHovered && selectedPath) {
          ctx.fillStyle = selectedPath.color
          ctx.globalAlpha = 0.1
          ctx.fillRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)
          ctx.globalAlpha = 1
        }

        // Draw cell border
        ctx.strokeStyle =
          (isInSelectedPath || isHovered) && selectedPath
            ? selectedPath.color
            : "#e2e8f0"
        ctx.lineWidth = isInSelectedPath || isHovered ? 2 : 1
        ctx.strokeRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)
      }
    }

    // Draw all paths (inactive paths in background)
    for (const path of paths) {
      if (path.id === selectedPath?.id) continue // Draw selected path last
      if (path.stops.length < 2) continue

      const points: Point[] = []
      for (const id of path.stops) {
        const center = getStopCenter(id)
        if (center) points.push(center)
      }

      if (points.length >= 2) {
        const pathLine = generateMultiPath(points)
        drawPath(ctx, pathLine, path.color, worldToCanvas, 0.3)
      }
    }

    // Draw selected path
    if (selectedPath && selectedPath.stops.length >= 2) {
      const points: Point[] = []
      for (const id of selectedPath.stops) {
        const center = getStopCenter(id)
        if (center) points.push(center)
      }

      if (points.length >= 2) {
        const pathLine = generateMultiPath(points)
        drawPath(ctx, pathLine, selectedPath.color, worldToCanvas, 0.8)
      }
    }

    // Draw sequence badges for selected path
    if (selectedPath) {
      for (const [id, index] of selectedStopsIndexMap) {
        const gridCell = parseGridCellId(id)
        if (!gridCell) continue

        const center = gridToWorld(gridCell)
        const canvasCenter = worldToCanvas(center)

        // Badge background
        ctx.beginPath()
        ctx.arc(canvasCenter.x, canvasCenter.y, BADGE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = selectedPath.color
        ctx.fill()

        // Badge border
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Badge number
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 11px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(String(index + 1), canvasCenter.x, canvasCenter.y)
      }
    }

    // Draw placed elements on top
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
  }, [
    canvasSize,
    placedElements,
    templates,
    paths,
    selectedPath,
    hoveredCellId,
    viewTransform,
    worldToCanvas,
    templateMap,
    selectedStopsSet,
    selectedStopsIndexMap,
    gridBounds,
    getStopCenter,
  ])

  return (
    <div ref={containerRef} className="relative flex-1 min-h-[400px]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ width: "100%", height: "100%" }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCellId(null)}
      />
      {!selectedPath && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded">
            Select a path to start building
          </p>
        </div>
      )}
      {selectedPath && selectedPath.stops.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded">
            Click on grid cells to add stops to this path
          </p>
        </div>
      )}
    </div>
  )
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
