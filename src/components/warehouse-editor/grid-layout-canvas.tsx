"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import type { PlacedElement, ElementTemplate } from "@/server/db/schema"
import { getTemplateVisualProperties } from "@/lib/element-utils"
import {
  GRID_CELL_SIZE,
  worldToGrid,
  gridToWorldCorner,
} from "@/lib/grid-config"

const CANVAS_PADDING = 20

interface GridLayoutCanvasProps {
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  gridColumns: number
  gridRows: number
  originalGridRows?: number // For calculating visual offset during preview
  selectedTemplateId: string | null
  selectedElementId: string | null
  onCellClick: (col: number, row: number) => void
  onElementClick: (elementId: string) => void
  onElementDelete: (elementId: string) => void
}

export function GridLayoutCanvas({
  placedElements,
  templates,
  gridColumns,
  gridRows,
  originalGridRows,
  selectedTemplateId,
  selectedElementId,
  onCellClick,
  onElementClick,
  onElementDelete,
}: GridLayoutCanvasProps) {
  // Calculate visual Y offset for elements when grid rows change
  // This makes elements appear to stay in place (anchored to bottom) during preview
  const rowDiff =
    originalGridRows !== undefined ? gridRows - originalGridRows : 0
  const elementYOffset = rowDiff * GRID_CELL_SIZE
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [hoveredCell, setHoveredCell] = useState<{
    col: number
    row: number
  } | null>(null)

  // Build template lookup map
  const templateMap = useMemo(() => {
    const map = new Map<string, ElementTemplate>()
    for (const template of templates) {
      map.set(template.id, template)
    }
    return map
  }, [templates])

  // Get selected template
  const selectedTemplate = selectedTemplateId
    ? templateMap.get(selectedTemplateId)
    : null

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
    const gridWidth = gridColumns * GRID_CELL_SIZE
    const gridHeight = gridRows * GRID_CELL_SIZE

    const contentWidth = gridWidth + CANVAS_PADDING * 2
    const contentHeight = gridHeight + CANVAS_PADDING * 2

    const scaleX = canvasSize.width / contentWidth
    const scaleY = canvasSize.height / contentHeight
    const scale = Math.min(scaleX, scaleY, 1.5) // Allow slight zoom in

    const offsetX =
      CANVAS_PADDING + (canvasSize.width / scale - contentWidth) / 2
    const offsetY =
      CANVAS_PADDING + (canvasSize.height / scale - contentHeight) / 2

    return { offsetX, offsetY, scale }
  }, [canvasSize, gridColumns, gridRows])

  // Transform world coordinates to canvas coordinates
  const worldToCanvas = useCallback(
    (x: number, y: number) => ({
      x: (x + viewTransform.offsetX) * viewTransform.scale,
      y: (y + viewTransform.offsetY) * viewTransform.scale,
    }),
    [viewTransform]
  )

  // Transform canvas coordinates to world coordinates
  const canvasToWorld = useCallback(
    (canvasX: number, canvasY: number) => ({
      x: canvasX / viewTransform.scale - viewTransform.offsetX,
      y: canvasY / viewTransform.scale - viewTransform.offsetY,
    }),
    [viewTransform]
  )

  // Find element at position (accounting for visual offset during grid preview)
  const findElementAtPosition = useCallback(
    (worldX: number, worldY: number): PlacedElement | null => {
      // Check in reverse order (top elements first)
      for (let i = placedElements.length - 1; i >= 0; i--) {
        const el = placedElements[i]!
        // Apply visual offset for preview
        const visualY = el.positionY + elementYOffset
        if (
          worldX >= el.positionX &&
          worldX <= el.positionX + el.width &&
          worldY >= visualY &&
          worldY <= visualY + el.height
        ) {
          return el
        }
      }
      return null
    },
    [placedElements, elementYOffset]
  )

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const world = canvasToWorld(canvasX, canvasY)

      // First check if clicking on an existing element
      const clickedElement = findElementAtPosition(world.x, world.y)
      if (clickedElement) {
        onElementClick(clickedElement.id)
        return
      }

      // Otherwise, check if clicking on a valid grid cell
      const cell = worldToGrid(world.x, world.y)
      if (
        cell.col >= 0 &&
        cell.col < gridColumns &&
        cell.row >= 0 &&
        cell.row < gridRows
      ) {
        onCellClick(cell.col, cell.row)
      }
    },
    [
      canvasToWorld,
      findElementAtPosition,
      onElementClick,
      onCellClick,
      gridColumns,
      gridRows,
    ]
  )

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const world = canvasToWorld(canvasX, canvasY)
      const cell = worldToGrid(world.x, world.y)

      if (
        cell.col >= 0 &&
        cell.col < gridColumns &&
        cell.row >= 0 &&
        cell.row < gridRows
      ) {
        setHoveredCell(cell)
      } else {
        setHoveredCell(null)
      }
    },
    [canvasToWorld, gridColumns, gridRows]
  )

  // Handle keyboard for delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedElementId
      ) {
        onElementDelete(selectedElementId)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedElementId, onElementDelete])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Clear canvas with background
    ctx.fillStyle = "#f1f5f9"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const scaledCellSize = GRID_CELL_SIZE * viewTransform.scale

    // Draw grid cells
    for (let col = 0; col < gridColumns; col++) {
      for (let row = 0; row < gridRows; row++) {
        const worldPos = gridToWorldCorner({ col, row })
        const canvasPos = worldToCanvas(worldPos.x, worldPos.y)

        const isHovered =
          hoveredCell && hoveredCell.col === col && hoveredCell.row === row

        // Draw cell background
        ctx.fillStyle = isHovered && selectedTemplateId ? "#dbeafe" : "#ffffff"
        ctx.fillRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)

        // Draw cell border
        ctx.strokeStyle =
          isHovered && selectedTemplateId ? "#3b82f6" : "#e2e8f0"
        ctx.lineWidth = isHovered && selectedTemplateId ? 2 : 1
        ctx.strokeRect(canvasPos.x, canvasPos.y, scaledCellSize, scaledCellSize)
      }
    }

    // Draw grid boundary
    const boundaryPos = worldToCanvas(0, 0)
    ctx.strokeStyle = "#94a3b8"
    ctx.lineWidth = 2
    ctx.strokeRect(
      boundaryPos.x,
      boundaryPos.y,
      gridColumns * scaledCellSize,
      gridRows * scaledCellSize
    )

    // Draw template preview on hover
    if (hoveredCell && selectedTemplate) {
      const worldPos = gridToWorldCorner(hoveredCell)
      const canvasPos = worldToCanvas(worldPos.x, worldPos.y)
      const visualProps = getTemplateVisualProperties(
        selectedTemplate.excalidrawData
      )

      const width = selectedTemplate.defaultWidth * viewTransform.scale
      const height = selectedTemplate.defaultHeight * viewTransform.scale

      ctx.globalAlpha = 0.5
      ctx.fillStyle = visualProps.backgroundColor
      ctx.fillRect(canvasPos.x, canvasPos.y, width, height)
      ctx.strokeStyle = visualProps.strokeColor
      ctx.lineWidth = visualProps.strokeWidth * viewTransform.scale
      ctx.strokeRect(canvasPos.x, canvasPos.y, width, height)
      ctx.globalAlpha = 1
    }

    // Draw placed elements (with visual offset for grid preview)
    for (const element of placedElements) {
      const template = templateMap.get(element.elementTemplateId)
      const visualProps = getTemplateVisualProperties(template?.excalidrawData)

      // Apply visual offset to Y position during grid preview
      const visualY = element.positionY + elementYOffset
      const pos = worldToCanvas(element.positionX, visualY)
      const width = element.width * viewTransform.scale
      const height = element.height * viewTransform.scale

      const isSelected = element.id === selectedElementId

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
      ctx.strokeStyle = isSelected ? "#3b82f6" : visualProps.strokeColor
      ctx.lineWidth = isSelected
        ? 3
        : visualProps.strokeWidth * viewTransform.scale

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

      // Draw selection handles if selected
      if (isSelected) {
        const handleSize = 8
        ctx.fillStyle = "#3b82f6"
        // Corners
        ctx.fillRect(
          pos.x - handleSize / 2,
          pos.y - handleSize / 2,
          handleSize,
          handleSize
        )
        ctx.fillRect(
          pos.x + width - handleSize / 2,
          pos.y - handleSize / 2,
          handleSize,
          handleSize
        )
        ctx.fillRect(
          pos.x - handleSize / 2,
          pos.y + height - handleSize / 2,
          handleSize,
          handleSize
        )
        ctx.fillRect(
          pos.x + width - handleSize / 2,
          pos.y + height - handleSize / 2,
          handleSize,
          handleSize
        )
      }

      ctx.restore()

      // Draw element label
      if (element.label) {
        ctx.fillStyle = "#1f2937"
        ctx.font = `bold ${Math.max(10, 12 * viewTransform.scale)}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(element.label, pos.x + width / 2, pos.y + height / 2)
      }
    }

    // Draw coordinate labels on edges (1-based, origin at bottom-left)
    ctx.fillStyle = "#64748b"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Column labels (bottom) - 1-based
    for (let col = 0; col < gridColumns; col++) {
      const worldPos = gridToWorldCorner({ col, row: gridRows - 1 })
      const canvasPos = worldToCanvas(
        worldPos.x + GRID_CELL_SIZE / 2,
        worldPos.y + GRID_CELL_SIZE + 10
      )
      ctx.fillText(String(col + 1), canvasPos.x, canvasPos.y)
    }

    // Row labels (left) - 1-based, bottom-to-top
    for (let row = 0; row < gridRows; row++) {
      const worldPos = gridToWorldCorner({ col: 0, row })
      const canvasPos = worldToCanvas(
        worldPos.x - 10,
        worldPos.y + GRID_CELL_SIZE / 2
      )
      // Display row 1 at bottom, row N at top
      const displayRow = gridRows - row
      ctx.fillText(String(displayRow), canvasPos.x, canvasPos.y)
    }
  }, [
    canvasSize,
    placedElements,
    gridColumns,
    gridRows,
    hoveredCell,
    selectedTemplateId,
    selectedTemplate,
    selectedElementId,
    viewTransform,
    worldToCanvas,
    templateMap,
    elementYOffset,
  ])

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${selectedTemplateId ? "cursor-crosshair" : "cursor-pointer"}`}
        style={{ width: "100%", height: "100%" }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCell(null)}
      />
      {selectedElementId && (
        <div className="absolute top-2 right-2 bg-background/90 px-3 py-1.5 rounded-md border text-sm">
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Delete</kbd>{" "}
          to remove
        </div>
      )}
      {selectedTemplateId && !selectedElementId && (
        <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-3 py-1.5 rounded-md text-sm">
          Click on grid to place element
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
