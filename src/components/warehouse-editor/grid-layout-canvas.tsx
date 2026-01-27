"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import type { PlacedElement, ElementTemplate } from "@/server/db/schema"
import { getTemplateElements, drawMultiShapeElement } from "@/lib/element-utils"
import {
  GRID_CELL_SIZE,
  worldToGrid,
  gridToWorldCorner,
} from "@/lib/grid-config"

const CANVAS_PADDING = 20

// Resize handle positions
type ResizeHandle = "nw" | "ne" | "sw" | "se" // corners only for grid-snapped resizing

interface GridLayoutCanvasProps {
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
  gridColumns: number
  gridRows: number
  originalGridRows?: number // For calculating visual offset during preview
  selectedTemplateId: string | null
  selectedElementId: string | null
  onCellClick: (col: number, row: number) => void
  onBatchPlace?: (cells: { col: number; row: number }[]) => void
  onElementClick: (elementId: string) => void
  onElementDelete: (elementId: string) => void
  onElementMove?: (elementId: string, newCol: number, newRow: number) => void
  onElementResize?: (
    elementId: string,
    newCol: number,
    newRow: number,
    newWidthCells: number,
    newHeightCells: number
  ) => void
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
  onBatchPlace,
  onElementClick,
  onElementDelete,
  onElementMove,
  onElementResize,
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

  // Drag state for moving elements
  const [dragState, setDragState] = useState<{
    elementId: string
    element: PlacedElement
    startCell: { col: number; row: number }
    currentCell: { col: number; row: number }
  } | null>(null)
  const isDragging = dragState !== null

  // Resize state for resizing elements
  const [resizeState, setResizeState] = useState<{
    elementId: string
    element: PlacedElement
    handle: ResizeHandle
    startCol: number
    startRow: number
    startWidthCells: number
    startHeightCells: number
    currentCol: number
    currentRow: number
    currentWidthCells: number
    currentHeightCells: number
  } | null>(null)
  const isResizing = resizeState !== null

  // Placement drag state for placing multiple elements in a line
  const [placementDragState, setPlacementDragState] = useState<{
    startCell: { col: number; row: number }
    currentCell: { col: number; row: number }
  } | null>(null)
  const isPlacementDragging = placementDragState !== null

  // Track which resize handle is being hovered (for cursor feedback)
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle | null>(null)

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

  // Build a map of cell positions to elements for collision detection
  const cellToElementMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const el of placedElements) {
      const startCol = Math.floor(el.positionX / GRID_CELL_SIZE)
      const startRow = Math.floor(el.positionY / GRID_CELL_SIZE)
      const endCol = startCol + Math.ceil(el.width / GRID_CELL_SIZE)
      const endRow = startRow + Math.ceil(el.height / GRID_CELL_SIZE)
      for (let col = startCol; col < endCol; col++) {
        for (let row = startRow; row < endRow; row++) {
          map.set(`${col}:${row}`, el.id)
        }
      }
    }
    return map
  }, [placedElements])

  // Check if an element can be placed at a position (no collisions except with itself)
  const canPlaceElement = useCallback(
    (
      col: number,
      row: number,
      widthCells: number,
      heightCells: number,
      excludeElementId?: string
    ): boolean => {
      // Check bounds
      if (col < 0 || row < 0) return false
      if (col + widthCells > gridColumns || row + heightCells > gridRows)
        return false

      // Check for collisions
      for (let c = col; c < col + widthCells; c++) {
        for (let r = row; r < row + heightCells; r++) {
          const occupyingId = cellToElementMap.get(`${c}:${r}`)
          if (occupyingId && occupyingId !== excludeElementId) {
            return false
          }
        }
      }
      return true
    },
    [cellToElementMap, gridColumns, gridRows]
  )

  // Calculate cells along a horizontal or vertical line, spaced by element size
  const calculateLineCells = useCallback(
    (
      start: { col: number; row: number },
      end: { col: number; row: number },
      widthCells: number,
      heightCells: number
    ): { col: number; row: number }[] => {
      const colDiff = Math.abs(end.col - start.col)
      const rowDiff = Math.abs(end.row - start.row)

      const cells: { col: number; row: number }[] = []

      if (colDiff >= rowDiff) {
        // Horizontal line - space by element width
        const minCol = Math.min(start.col, end.col)
        const maxCol = Math.max(start.col, end.col)
        for (let col = minCol; col <= maxCol; col += widthCells) {
          cells.push({ col, row: start.row })
        }
      } else {
        // Vertical line - space by element height
        const minRow = Math.min(start.row, end.row)
        const maxRow = Math.max(start.row, end.row)
        for (let row = minRow; row <= maxRow; row += heightCells) {
          cells.push({ col: start.col, row })
        }
      }

      return cells
    },
    []
  )

  // Get valid placement cells (not occupied) from a line
  const getValidPlacementCells = useCallback(
    (
      cells: { col: number; row: number }[],
      widthCells: number,
      heightCells: number
    ): { col: number; row: number }[] => {
      return cells.filter((cell) =>
        canPlaceElement(cell.col, cell.row, widthCells, heightCells)
      )
    },
    [canPlaceElement]
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

  // Find if mouse is over a resize handle of the selected element
  const findResizeHandle = useCallback(
    (
      worldX: number,
      worldY: number
    ): { element: PlacedElement; handle: ResizeHandle } | null => {
      if (!selectedElementId) return null

      const element = placedElements.find((el) => el.id === selectedElementId)
      if (!element) return null

      const visualY = element.positionY + elementYOffset
      const handleSize = 12 / viewTransform.scale // Handle hit area in world coords

      // Define handle positions
      const handles: { handle: ResizeHandle; x: number; y: number }[] = [
        { handle: "nw", x: element.positionX, y: visualY },
        { handle: "ne", x: element.positionX + element.width, y: visualY },
        {
          handle: "sw",
          x: element.positionX,
          y: visualY + element.height,
        },
        {
          handle: "se",
          x: element.positionX + element.width,
          y: visualY + element.height,
        },
      ]

      for (const { handle, x, y } of handles) {
        if (
          worldX >= x - handleSize / 2 &&
          worldX <= x + handleSize / 2 &&
          worldY >= y - handleSize / 2 &&
          worldY <= y + handleSize / 2
        ) {
          return { element, handle }
        }
      }

      return null
    },
    [selectedElementId, placedElements, elementYOffset, viewTransform.scale]
  )

  // Handle mouse down - start resize, drag, or placement drag
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const world = canvasToWorld(canvasX, canvasY)
      const cell = worldToGrid(world.x, world.y)

      // If in placement mode, start placement drag
      if (selectedTemplateId) {
        if (
          cell.col >= 0 &&
          cell.col < gridColumns &&
          cell.row >= 0 &&
          cell.row < gridRows
        ) {
          setPlacementDragState({
            startCell: { col: cell.col, row: cell.row },
            currentCell: { col: cell.col, row: cell.row },
          })
          event.preventDefault()
        }
        return
      }

      // First check for resize handles on selected element
      const resizeHit = findResizeHandle(world.x, world.y)
      if (resizeHit && onElementResize) {
        const { element, handle } = resizeHit
        const startCol = Math.floor(element.positionX / GRID_CELL_SIZE)
        const startRow = Math.floor(element.positionY / GRID_CELL_SIZE)
        const startWidthCells = Math.ceil(element.width / GRID_CELL_SIZE)
        const startHeightCells = Math.ceil(element.height / GRID_CELL_SIZE)

        setResizeState({
          elementId: element.id,
          element,
          handle,
          startCol,
          startRow,
          startWidthCells,
          startHeightCells,
          currentCol: startCol,
          currentRow: startRow,
          currentWidthCells: startWidthCells,
          currentHeightCells: startHeightCells,
        })
        event.preventDefault()
        return
      }

      // Then check for dragging elements
      const clickedElement = findElementAtPosition(world.x, world.y)

      if (clickedElement && onElementMove) {
        // Start dragging this element
        const startCol = Math.floor(clickedElement.positionX / GRID_CELL_SIZE)
        const startRow = Math.floor(clickedElement.positionY / GRID_CELL_SIZE)
        setDragState({
          elementId: clickedElement.id,
          element: clickedElement,
          startCell: { col: startCol, row: startRow },
          currentCell: { col: startCol, row: startRow },
        })
        onElementClick(clickedElement.id)
        event.preventDefault()
      }
    },
    [
      canvasToWorld,
      findElementAtPosition,
      findResizeHandle,
      gridColumns,
      gridRows,
      onElementClick,
      onElementMove,
      onElementResize,
      selectedTemplateId,
    ]
  )

  // Handle mouse move for hover effect, drag preview, and resize preview
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top

      const world = canvasToWorld(canvasX, canvasY)
      const cell = worldToGrid(world.x, world.y)

      // Clamp cell to grid bounds
      const clampedCell = {
        col: Math.max(0, Math.min(cell.col, gridColumns - 1)),
        row: Math.max(0, Math.min(cell.row, gridRows - 1)),
      }

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

      // Update resize if resizing
      if (resizeState) {
        const {
          handle,
          startCol,
          startRow,
          startWidthCells,
          startHeightCells,
        } = resizeState

        let newCol = startCol
        let newRow = startRow
        let newWidthCells = startWidthCells
        let newHeightCells = startHeightCells

        // Calculate new dimensions based on which handle is being dragged
        switch (handle) {
          case "se": // Bottom-right: change width and height
            newWidthCells = Math.max(1, clampedCell.col - startCol + 1)
            newHeightCells = Math.max(1, clampedCell.row - startRow + 1)
            break
          case "sw": // Bottom-left: change col, width, and height
            newCol = Math.min(clampedCell.col, startCol + startWidthCells - 1)
            newWidthCells = startCol + startWidthCells - newCol
            newHeightCells = Math.max(1, clampedCell.row - startRow + 1)
            break
          case "ne": // Top-right: change row, width, and height
            newRow = Math.min(clampedCell.row, startRow + startHeightCells - 1)
            newWidthCells = Math.max(1, clampedCell.col - startCol + 1)
            newHeightCells = startRow + startHeightCells - newRow
            break
          case "nw": // Top-left: change col, row, width, and height
            newCol = Math.min(clampedCell.col, startCol + startWidthCells - 1)
            newRow = Math.min(clampedCell.row, startRow + startHeightCells - 1)
            newWidthCells = startCol + startWidthCells - newCol
            newHeightCells = startRow + startHeightCells - newRow
            break
        }

        // Ensure element stays within grid bounds
        if (newCol + newWidthCells > gridColumns) {
          newWidthCells = gridColumns - newCol
        }
        if (newRow + newHeightCells > gridRows) {
          newHeightCells = gridRows - newRow
        }

        // Ensure minimum size of 1x1
        newWidthCells = Math.max(1, newWidthCells)
        newHeightCells = Math.max(1, newHeightCells)

        setResizeState((prev) =>
          prev
            ? {
                ...prev,
                currentCol: newCol,
                currentRow: newRow,
                currentWidthCells: newWidthCells,
                currentHeightCells: newHeightCells,
              }
            : null
        )
        return
      }

      // Update drag position if dragging
      if (dragState) {
        const widthCells = Math.ceil(dragState.element.width / GRID_CELL_SIZE)
        const heightCells = Math.ceil(dragState.element.height / GRID_CELL_SIZE)

        // Clamp to keep element in bounds
        const maxCol = gridColumns - widthCells
        const maxRow = gridRows - heightCells
        const newCol = Math.max(0, Math.min(clampedCell.col, maxCol))
        const newRow = Math.max(0, Math.min(clampedCell.row, maxRow))

        setDragState((prev) =>
          prev ? { ...prev, currentCell: { col: newCol, row: newRow } } : null
        )
        return
      }

      // Update placement drag position
      if (placementDragState) {
        setPlacementDragState((prev) =>
          prev ? { ...prev, currentCell: clampedCell } : null
        )
        return
      }

      // Check if hovering over a resize handle (for cursor feedback)
      const handleHit = findResizeHandle(world.x, world.y)
      setHoveredHandle(handleHit?.handle ?? null)
    },
    [
      canvasToWorld,
      gridColumns,
      gridRows,
      dragState,
      resizeState,
      placementDragState,
      findResizeHandle,
    ]
  )

  // Handle mouse up - complete resize, drag, or handle click
  const handleMouseUp = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      // Handle resize completion
      if (resizeState) {
        const {
          elementId,
          startCol,
          startRow,
          startWidthCells,
          startHeightCells,
          currentCol,
          currentRow,
          currentWidthCells,
          currentHeightCells,
        } = resizeState

        // Check if size or position changed
        if (
          startCol !== currentCol ||
          startRow !== currentRow ||
          startWidthCells !== currentWidthCells ||
          startHeightCells !== currentHeightCells
        ) {
          // Check if new size/position is valid
          if (
            canPlaceElement(
              currentCol,
              currentRow,
              currentWidthCells,
              currentHeightCells,
              elementId
            )
          ) {
            onElementResize?.(
              elementId,
              currentCol,
              currentRow,
              currentWidthCells,
              currentHeightCells
            )
          }
        }

        setResizeState(null)
        return
      }

      // Handle drag completion
      if (dragState) {
        const { elementId, element, startCell, currentCell } = dragState

        // Check if position changed
        if (
          startCell.col !== currentCell.col ||
          startCell.row !== currentCell.row
        ) {
          const widthCells = Math.ceil(element.width / GRID_CELL_SIZE)
          const heightCells = Math.ceil(element.height / GRID_CELL_SIZE)

          // Check if new position is valid
          if (
            canPlaceElement(
              currentCell.col,
              currentCell.row,
              widthCells,
              heightCells,
              elementId
            )
          ) {
            onElementMove?.(elementId, currentCell.col, currentCell.row)
          }
        }

        setDragState(null)
        return
      }

      // Handle placement drag completion
      if (placementDragState && selectedTemplate) {
        const { startCell, currentCell } = placementDragState
        const widthCells = Math.ceil(
          selectedTemplate.defaultWidth / GRID_CELL_SIZE
        )
        const heightCells = Math.ceil(
          selectedTemplate.defaultHeight / GRID_CELL_SIZE
        )
        const lineCells = calculateLineCells(
          startCell,
          currentCell,
          widthCells,
          heightCells
        )

        // If only one cell (click, not drag), use normal cell click for label dialog
        if (lineCells.length === 1) {
          setPlacementDragState(null)
          onCellClick(startCell.col, startCell.row)
          return
        }

        // Multiple cells - batch place without labels
        const validCells = getValidPlacementCells(
          lineCells,
          widthCells,
          heightCells
        )

        if (validCells.length > 0 && onBatchPlace) {
          onBatchPlace(validCells)
        }

        setPlacementDragState(null)
        return
      }

      // If not dragging or resizing, handle as regular click
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
      resizeState,
      dragState,
      placementDragState,
      selectedTemplate,
      calculateLineCells,
      getValidPlacementCells,
      onBatchPlace,
      canPlaceElement,
      onElementResize,
      onElementMove,
      canvasToWorld,
      findElementAtPosition,
      onElementClick,
      onCellClick,
      gridColumns,
      gridRows,
    ]
  )

  // Cancel drag/resize/placement if mouse leaves canvas
  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null)
    setHoveredHandle(null)
    if (dragState) {
      setDragState(null)
    }
    if (resizeState) {
      setResizeState(null)
    }
    if (placementDragState) {
      setPlacementDragState(null)
    }
  }, [dragState, resizeState, placementDragState])

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

    // Draw template preview on hover or placement drag
    if (selectedTemplate) {
      const templateElements = getTemplateElements(
        selectedTemplate.excalidrawData,
        selectedTemplate.defaultWidth,
        selectedTemplate.defaultHeight
      )
      const width = selectedTemplate.defaultWidth * viewTransform.scale
      const height = selectedTemplate.defaultHeight * viewTransform.scale
      const widthCells = Math.ceil(
        selectedTemplate.defaultWidth / GRID_CELL_SIZE
      )
      const heightCells = Math.ceil(
        selectedTemplate.defaultHeight / GRID_CELL_SIZE
      )

      if (placementDragState) {
        // Draw preview along drag line
        const lineCells = calculateLineCells(
          placementDragState.startCell,
          placementDragState.currentCell,
          widthCells,
          heightCells
        )

        for (const cell of lineCells) {
          const worldPos = gridToWorldCorner(cell)
          const canvasPos = worldToCanvas(worldPos.x, worldPos.y)
          const isValid = canPlaceElement(
            cell.col,
            cell.row,
            widthCells,
            heightCells
          )

          ctx.save()
          ctx.globalAlpha = 0.5
          if (isValid) {
            // Draw multi-shape template preview
            drawMultiShapeElement(
              ctx,
              templateElements,
              canvasPos.x,
              canvasPos.y,
              viewTransform.scale,
              1,
              1
            )
          } else {
            // Draw invalid indicator (red rectangle)
            ctx.fillStyle = "#fecaca"
            ctx.fillRect(canvasPos.x, canvasPos.y, width, height)
            ctx.strokeStyle = "#ef4444"
            ctx.lineWidth = 2
            ctx.strokeRect(canvasPos.x, canvasPos.y, width, height)
          }
          ctx.restore()
        }
      } else if (hoveredCell) {
        // Draw single preview on hover with multi-shape support
        const worldPos = gridToWorldCorner(hoveredCell)
        const canvasPos = worldToCanvas(worldPos.x, worldPos.y)

        ctx.save()
        ctx.globalAlpha = 0.5
        drawMultiShapeElement(
          ctx,
          templateElements,
          canvasPos.x,
          canvasPos.y,
          viewTransform.scale,
          1,
          1
        )
        ctx.restore()
      }
    }

    // Draw placed elements (with visual offset for grid preview)
    for (const element of placedElements) {
      const template = templateMap.get(element.elementTemplateId)
      const templateElements = getTemplateElements(
        template?.excalidrawData,
        template?.defaultWidth ?? element.width,
        template?.defaultHeight ?? element.height
      )

      // Check if this element is being dragged or resized
      const isBeingDragged = dragState?.elementId === element.id
      const isBeingResized = resizeState?.elementId === element.id

      // Calculate validity for drag/resize operations
      const isDragValid = isBeingDragged
        ? canPlaceElement(
            dragState.currentCell.col,
            dragState.currentCell.row,
            Math.ceil(element.width / GRID_CELL_SIZE),
            Math.ceil(element.height / GRID_CELL_SIZE),
            element.id
          )
        : true

      const isResizeValid = isBeingResized
        ? canPlaceElement(
            resizeState.currentCol,
            resizeState.currentRow,
            resizeState.currentWidthCells,
            resizeState.currentHeightCells,
            element.id
          )
        : true

      // Calculate position and size - use drag/resize state if applicable
      let posX = element.positionX
      let posY = element.positionY + elementYOffset
      let elemWidth = element.width
      let elemHeight = element.height

      if (isBeingDragged) {
        posX = dragState.currentCell.col * GRID_CELL_SIZE
        posY = dragState.currentCell.row * GRID_CELL_SIZE + elementYOffset
      } else if (isBeingResized) {
        posX = resizeState.currentCol * GRID_CELL_SIZE
        posY = resizeState.currentRow * GRID_CELL_SIZE + elementYOffset
        elemWidth = resizeState.currentWidthCells * GRID_CELL_SIZE
        elemHeight = resizeState.currentHeightCells * GRID_CELL_SIZE
      }

      const pos = worldToCanvas(posX, posY)
      const width = elemWidth * viewTransform.scale
      const height = elemHeight * viewTransform.scale

      const isSelected = element.id === selectedElementId

      // Calculate scale factors for placed element vs template default size
      const scaleX = elemWidth / (template?.defaultWidth ?? element.width)
      const scaleY = elemHeight / (template?.defaultHeight ?? element.height)

      ctx.save()

      // Apply rotation around element center
      if (element.rotation !== 0) {
        const centerX = pos.x + width / 2
        const centerY = pos.y + height / 2
        ctx.translate(centerX, centerY)
        ctx.rotate(element.rotation)
        ctx.translate(-centerX, -centerY)
      }

      const isInvalidOperation =
        (isBeingDragged && !isDragValid) || (isBeingResized && !isResizeValid)

      if (isInvalidOperation) {
        // Draw red tint for invalid drag/resize
        ctx.globalAlpha = 0.4
        ctx.fillStyle = "#fecaca"
        ctx.fillRect(pos.x, pos.y, width, height)
        ctx.globalAlpha = 1
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 3
        ctx.strokeRect(pos.x, pos.y, width, height)
      } else {
        // Draw all shapes in the template
        ctx.globalAlpha = isBeingDragged || isBeingResized ? 0.7 : 1
        drawMultiShapeElement(
          ctx,
          templateElements,
          pos.x,
          pos.y,
          viewTransform.scale,
          scaleX,
          scaleY
        )
        ctx.globalAlpha = 1
      }

      // Draw selection border on top
      if (isSelected && !isInvalidOperation) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 3
        ctx.strokeRect(pos.x, pos.y, width, height)
      }

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
    dragState,
    resizeState,
    placementDragState,
    canPlaceElement,
    calculateLineCells,
  ])

  // Determine cursor style based on current operation or handle being hovered
  const getResizeCursor = (handle: ResizeHandle): string => {
    switch (handle) {
      case "nw":
      case "se":
        return "cursor-nwse-resize"
      case "ne":
      case "sw":
        return "cursor-nesw-resize"
    }
  }

  const cursorClass = isResizing
    ? getResizeCursor(resizeState.handle)
    : isDragging
      ? "cursor-grabbing"
      : hoveredHandle
        ? getResizeCursor(hoveredHandle)
        : selectedTemplateId
          ? "cursor-crosshair"
          : "cursor-pointer"

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${cursorClass}`}
        style={{ width: "100%", height: "100%" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {selectedElementId && !isDragging && !isResizing && (
        <div className="absolute top-2 right-2 bg-background/90 px-3 py-1.5 rounded-md border text-sm">
          Drag to move | Corners to resize |{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Delete</kbd>{" "}
          to remove
        </div>
      )}
      {isDragging && (
        <div className="absolute top-2 right-2 bg-blue-500/90 text-white px-3 py-1.5 rounded-md text-sm">
          Release to place element
        </div>
      )}
      {isResizing && (
        <div className="absolute top-2 right-2 bg-blue-500/90 text-white px-3 py-1.5 rounded-md text-sm">
          Release to resize element
        </div>
      )}
      {isPlacementDragging && (
        <div className="absolute top-2 right-2 bg-blue-500/90 text-white px-3 py-1.5 rounded-md text-sm">
          Release to place elements along line
        </div>
      )}
      {selectedTemplateId && !selectedElementId && !isPlacementDragging && (
        <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-3 py-1.5 rounded-md text-sm">
          Click to place | Drag for line
        </div>
      )}
    </div>
  )
}
