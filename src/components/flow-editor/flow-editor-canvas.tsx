"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import type { PlacedElement, ElementTemplate } from "@/server/db/schema"
import {
  generateMultiPath,
  getElementCenter,
  type Point,
} from "@/lib/pathfinding"
import { getTemplateVisualProperties } from "@/lib/element-utils"
const CANVAS_PADDING = 50
const BADGE_RADIUS = 14
const PATH_LINE_WIDTH = 3

interface FlowEditorCanvasProps {
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  sequence: string[]
  flowColor: string
  onElementClick: (elementId: string) => void
}

export function FlowEditorCanvas({
  placedElements,
  templates,
  sequence,
  flowColor,
  onElementClick,
}: FlowEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)

  // Build template lookup map
  const templateMap = useMemo(() => {
    const map = new Map<string, ElementTemplate>()
    for (const template of templates) {
      map.set(template.id, template)
    }
    return map
  }, [templates])

  // Build sequence set for quick lookup
  const sequenceSet = useMemo(() => new Set(sequence), [sequence])

  // Build sequence index map for badges
  const sequenceIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    sequence.forEach((id, index) => map.set(id, index))
    return map
  }, [sequence])

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
    const scale = Math.min(scaleX, scaleY, 1)

    const offsetX =
      -minX + CANVAS_PADDING + (canvasSize.width / scale - contentWidth) / 2
    const offsetY =
      -minY + CANVAS_PADDING + (canvasSize.height / scale - contentHeight) / 2

    return { offsetX, offsetY, scale }
  }, [canvasSize, placedElements])

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

  // Find element at position
  const findElementAtPosition = useCallback(
    (canvasX: number, canvasY: number): PlacedElement | null => {
      const world = canvasToWorld(canvasX, canvasY)

      // Check elements in reverse order (top-most first)
      for (const element of [...placedElements].reverse()) {
        if (
          world.x >= element.positionX &&
          world.x <= element.positionX + element.width &&
          world.y >= element.positionY &&
          world.y <= element.positionY + element.height
        ) {
          return element
        }
      }
      return null
    },
    [placedElements, canvasToWorld]
  )

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const element = findElementAtPosition(canvasX, canvasY)
      if (element) {
        onElementClick(element.id)
      }
    },
    [findElementAtPosition, onElementClick]
  )

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const element = findElementAtPosition(canvasX, canvasY)
      setHoveredElementId(element?.id ?? null)
    },
    [findElementAtPosition]
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

    // Draw grid pattern
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    const gridSize = 40 * viewTransform.scale
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw flow path preview
    if (sequence.length >= 2) {
      const points: Point[] = []
      for (const elementId of sequence) {
        const element = placedElements.find((e) => e.id === elementId)
        if (element) {
          points.push(getElementCenter(element))
        }
      }

      if (points.length >= 2) {
        const path = generateMultiPath(points)
        drawPath(ctx, path, flowColor, worldToCanvas)
      }
    }

    // Draw each placed element
    for (const element of placedElements) {
      const template = templateMap.get(element.elementTemplateId)
      const visualProps = getTemplateVisualProperties(template?.excalidrawData)
      const isHovered = element.id === hoveredElementId
      const isInSequence = sequenceSet.has(element.id)

      const pos = worldToCanvas({ x: element.positionX, y: element.positionY })
      const width = element.width * viewTransform.scale
      const height = element.height * viewTransform.scale

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
      ctx.strokeStyle = isHovered
        ? flowColor
        : isInSequence
          ? flowColor
          : visualProps.strokeColor
      ctx.lineWidth =
        (isHovered || isInSequence ? 3 : visualProps.strokeWidth) *
        viewTransform.scale

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

      // Draw sequence badge if element is in sequence
      const sequenceIndex = sequenceIndexMap.get(element.id)
      if (sequenceIndex !== undefined) {
        const badgeX = pos.x + width / 2
        const badgeY = pos.y - BADGE_RADIUS - 4

        // Badge background
        ctx.beginPath()
        ctx.arc(badgeX, badgeY, BADGE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = flowColor
        ctx.fill()

        // Badge border
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Badge number
        ctx.fillStyle = "#ffffff"
        ctx.font = `bold ${12}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(String(sequenceIndex + 1), badgeX, badgeY)
      }
    }
  }, [
    canvasSize,
    placedElements,
    templates,
    sequence,
    flowColor,
    hoveredElementId,
    viewTransform,
    worldToCanvas,
    templateMap,
    sequenceSet,
    sequenceIndexMap,
  ])

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer"
        style={{ width: "100%", height: "100%" }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredElementId(null)}
      />
      {placedElements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">
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
