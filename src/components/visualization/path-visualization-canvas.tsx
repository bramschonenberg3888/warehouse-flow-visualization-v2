"use client"

import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import type { PlacedElement, ElementTemplate } from "@/server/db/schema"
import type { Pallet } from "@/lib/path-engine/engine"
import type { Point } from "@/lib/pathfinding"
import { getTemplateElements, drawMultiShapeElement } from "@/lib/element-utils"
import { GRID_CELL_SIZE } from "@/lib/grid-config"

const CANVAS_PADDING = 50
const PALLET_SIZE = 16

interface PathVisualizationCanvasProps {
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  pallets: Pallet[]
  gridColumns: number
  gridRows: number
}

export function PathVisualizationCanvas({
  placedElements,
  templates,
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

    // Draw placed elements
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
    viewTransform,
    worldToCanvas,
    templateMap,
    gridBounds,
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

      // Get template if available
      const template = pallet.elementTemplateId
        ? templateMap.get(pallet.elementTemplateId)
        : null

      // Use template size or default
      const width = template?.defaultWidth ?? PALLET_SIZE
      const height = template?.defaultHeight ?? PALLET_SIZE

      ctx.save()

      // Apply rotation if template has rotateWithMovement enabled
      if (template?.rotateWithMovement && pallet.rotation !== 0) {
        ctx.translate(canvasPos.x, canvasPos.y)
        ctx.rotate(pallet.rotation)
        ctx.translate(-canvasPos.x, -canvasPos.y)
      }

      if (template) {
        // Get all template shapes for multi-shape rendering
        const templateElements = getTemplateElements(
          template.excalidrawData,
          width,
          height
        )

        // Position is centered on pallet, so offset to top-left corner
        const x = canvasPos.x - (width * viewTransform.scale) / 2
        const y = canvasPos.y - (height * viewTransform.scale) / 2

        // Draw all shapes in the template
        drawMultiShapeElement(
          ctx,
          templateElements,
          x,
          y,
          viewTransform.scale,
          1,
          1
        )
      } else {
        // Fallback: Draw as colored circle
        const size = PALLET_SIZE * viewTransform.scale

        ctx.fillStyle = pallet.color
        ctx.beginPath()
        ctx.arc(canvasPos.x, canvasPos.y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        // Draw border
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      ctx.restore()
    }
  }, [canvasSize, pallets, viewTransform, worldToCanvas, templateMap])

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
