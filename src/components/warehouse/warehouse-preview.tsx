"use client"

import { useRef, useEffect, useMemo } from "react"
import type { PlacedElement, ElementTemplate } from "@/server/db/schema"
import { getTemplateElements, drawMultiShapeElement } from "@/lib/element-utils"
import { GRID_CELL_SIZE } from "@/lib/grid-config"

interface WarehousePreviewProps {
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  gridColumns: number
  gridRows: number
  width?: number
  height?: number
}

export function WarehousePreview({
  placedElements,
  templates,
  gridColumns,
  gridRows,
  width = 400,
  height = 200,
}: WarehousePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Build template lookup map
  const templateMap = useMemo(() => {
    const map = new Map<string, ElementTemplate>()
    for (const template of templates) {
      map.set(template.id, template)
    }
    return map
  }, [templates])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Calculate scale to fit the warehouse in the canvas
    const gridWidth = gridColumns * GRID_CELL_SIZE
    const gridHeight = gridRows * GRID_CELL_SIZE
    const padding = 10

    const availableWidth = width - padding * 2
    const availableHeight = height - padding * 2

    const scaleX = availableWidth / gridWidth
    const scaleY = availableHeight / gridHeight
    const scale = Math.min(scaleX, scaleY)

    const offsetX = padding + (availableWidth - gridWidth * scale) / 2
    const offsetY = padding + (availableHeight - gridHeight * scale) / 2

    // Clear canvas
    ctx.fillStyle = "#f1f5f9"
    ctx.fillRect(0, 0, width, height)

    // Draw grid background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(offsetX, offsetY, gridWidth * scale, gridHeight * scale)

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 0.5

    for (let col = 0; col <= gridColumns; col++) {
      const x = offsetX + col * GRID_CELL_SIZE * scale
      ctx.beginPath()
      ctx.moveTo(x, offsetY)
      ctx.lineTo(x, offsetY + gridHeight * scale)
      ctx.stroke()
    }

    for (let row = 0; row <= gridRows; row++) {
      const y = offsetY + row * GRID_CELL_SIZE * scale
      ctx.beginPath()
      ctx.moveTo(offsetX, y)
      ctx.lineTo(offsetX + gridWidth * scale, y)
      ctx.stroke()
    }

    // Draw grid boundary
    ctx.strokeStyle = "#94a3b8"
    ctx.lineWidth = 1
    ctx.strokeRect(offsetX, offsetY, gridWidth * scale, gridHeight * scale)

    // Draw placed elements
    for (const element of placedElements) {
      const template = templateMap.get(element.elementTemplateId)
      const templateElements = getTemplateElements(
        template?.excalidrawData,
        template?.defaultWidth ?? element.width,
        template?.defaultHeight ?? element.height
      )

      const x = offsetX + element.positionX * scale
      const y = offsetY + element.positionY * scale
      const elWidth = element.width * scale
      const elHeight = element.height * scale

      // Calculate scale factors for placed element vs template default size
      const scaleX = element.width / (template?.defaultWidth ?? element.width)
      const scaleY =
        element.height / (template?.defaultHeight ?? element.height)

      ctx.save()

      // Apply rotation around element center
      if (element.rotation !== 0) {
        const centerX = x + elWidth / 2
        const centerY = y + elHeight / 2
        ctx.translate(centerX, centerY)
        ctx.rotate((element.rotation * Math.PI) / 180)
        ctx.translate(-centerX, -centerY)
      }

      // Draw all shapes in the template
      drawMultiShapeElement(ctx, templateElements, x, y, scale, scaleX, scaleY)

      ctx.restore()
    }
  }, [
    placedElements,
    templates,
    gridColumns,
    gridRows,
    width,
    height,
    templateMap,
  ])

  if (placedElements.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-muted/50 rounded-lg"
        style={{ width, height }}
      >
        <p className="text-sm text-muted-foreground">No elements placed</p>
      </div>
    )
  }

  return (
    <canvas ref={canvasRef} className="rounded-lg" style={{ width, height }} />
  )
}
