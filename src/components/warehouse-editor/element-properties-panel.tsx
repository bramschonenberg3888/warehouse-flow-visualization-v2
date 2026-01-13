"use client"

import { useState } from "react"
import { Save, Loader2, Trash2, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PlacedElement, ElementTemplate } from "@/server/db/schema"
import { GRID_CELL_SIZE } from "@/lib/grid-config"

interface ElementPropertiesPanelProps {
  element: PlacedElement
  template: ElementTemplate | undefined
  gridRows: number
  onUpdate: (updates: {
    label?: string
    width?: number
    height?: number
    rotation?: number
  }) => Promise<void>
  onDelete: () => Promise<void>
  isUpdating: boolean
  isDeleting: boolean
}

export function ElementPropertiesPanel({
  element,
  template,
  gridRows,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: ElementPropertiesPanelProps) {
  // Use element.id as key to reset state when element changes
  const elementKey = element.id

  // Initialize state based on current element
  const initialLabel = element.label ?? ""
  const initialWidthCells = Math.round(element.width / GRID_CELL_SIZE)
  const initialHeightCells = Math.round(element.height / GRID_CELL_SIZE)

  const [label, setLabel] = useState(initialLabel)
  const [widthCells, setWidthCells] = useState(initialWidthCells)
  const [heightCells, setHeightCells] = useState(initialHeightCells)
  const [lastElementKey, setLastElementKey] = useState(elementKey)

  // Reset state when element changes (using a pattern that avoids useEffect with setState)
  if (elementKey !== lastElementKey) {
    setLastElementKey(elementKey)
    setLabel(element.label ?? "")
    setWidthCells(Math.round(element.width / GRID_CELL_SIZE))
    setHeightCells(Math.round(element.height / GRID_CELL_SIZE))
  }

  // Calculate display position (1-based, origin at bottom-left)
  const col = Math.floor(element.positionX / GRID_CELL_SIZE) + 1
  const row = gridRows - Math.floor(element.positionY / GRID_CELL_SIZE)

  const hasChanges =
    label !== (element.label ?? "") ||
    widthCells !== Math.round(element.width / GRID_CELL_SIZE) ||
    heightCells !== Math.round(element.height / GRID_CELL_SIZE)

  const handleSave = async () => {
    await onUpdate({
      label: label.trim() || undefined,
      width: widthCells * GRID_CELL_SIZE,
      height: heightCells * GRID_CELL_SIZE,
    })
  }

  const handleRotate = async () => {
    const newRotation = ((element.rotation ?? 0) + 90) % 360
    await onUpdate({ rotation: newRotation })
  }

  return (
    <div className="w-64 border-l bg-card p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Element Properties</h3>
        <p className="text-xs text-muted-foreground">
          {template?.name ?? "Unknown"}
        </p>
      </div>

      {/* Position (read-only, for reference) */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Position</Label>
        <p className="text-sm">
          Column {col}, Row {row}
        </p>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label htmlFor="element-label" className="text-xs">
          Label
        </Label>
        <Input
          id="element-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Rack A1"
          className="h-8 text-sm"
        />
      </div>

      {/* Dimensions */}
      <div className="space-y-1.5">
        <Label className="text-xs">Size (in grid cells)</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label
              htmlFor="element-width"
              className="text-[10px] text-muted-foreground"
            >
              Width
            </Label>
            <Input
              id="element-width"
              type="number"
              min={1}
              max={20}
              value={widthCells}
              onChange={(e) => setWidthCells(parseInt(e.target.value) || 1)}
              className="h-8 text-sm"
            />
          </div>
          <span className="pt-4 text-muted-foreground">×</span>
          <div className="flex-1">
            <Label
              htmlFor="element-height"
              className="text-[10px] text-muted-foreground"
            >
              Height
            </Label>
            <Input
              id="element-height"
              type="number"
              min={1}
              max={20}
              value={heightCells}
              onChange={(e) => setHeightCells(parseInt(e.target.value) || 1)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {widthCells * GRID_CELL_SIZE} × {heightCells * GRID_CELL_SIZE} pixels
        </p>
      </div>

      {/* Rotation */}
      <div className="space-y-1.5">
        <Label className="text-xs">Rotation</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm">{element.rotation ?? 0}°</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
            disabled={isUpdating}
          >
            <RotateCw className="h-3 w-3 mr-1" />
            +90°
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t">
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full"
            size="sm"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-3 w-3" />
                Save Changes
              </>
            )}
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isDeleting}
          className="w-full"
          size="sm"
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-3 w-3" />
              Delete Element
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
