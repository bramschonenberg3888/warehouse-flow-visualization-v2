"use client"

import { useMemo } from "react"
import { GripVertical, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Path, PlacedElement, PathElementType } from "@/server/db/schema"
import { cn } from "@/lib/utils"

interface PathSettingsProps {
  path: Path
  placedElements: PlacedElement[]
  onUpdate: (updates: Partial<Path>) => void
}

export function PathSettings({
  path,
  placedElements,
  onUpdate,
}: PathSettingsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Build element label map
  const elementLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const el of placedElements) {
      map.set(el.id, el.label || `Element ${el.id.slice(0, 8)}`)
    }
    return map
  }, [placedElements])

  // Get label for a stop
  const getStopLabel = (stopId: string): string => {
    if (stopId.startsWith("grid:")) {
      const parts = stopId.split(":")
      return `Cell (${parts[1]}, ${parts[2]})`
    }
    return elementLabels.get(stopId) || stopId.slice(0, 8)
  }

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = path.stops.indexOf(active.id as string)
    const newIndex = path.stops.indexOf(over.id as string)

    if (oldIndex !== -1 && newIndex !== -1) {
      onUpdate({ stops: arrayMove(path.stops, oldIndex, newIndex) })
    }
  }

  // Handle remove stop
  const handleRemoveStop = (stopId: string) => {
    onUpdate({ stops: path.stops.filter((id) => id !== stopId) })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-medium mb-1">Path Settings</h3>
        <p className="text-sm text-muted-foreground">Configure {path.name}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="path-name">Name</Label>
            <Input
              id="path-name"
              value={path.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
            />
          </div>

          {/* Element Type */}
          <div className="space-y-2">
            <Label>Element Type</Label>
            <Select
              value={path.elementType}
              onValueChange={(value: PathElementType) =>
                onUpdate({ elementType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pallet">Pallet</SelectItem>
                <SelectItem value="forklift">Forklift</SelectItem>
                <SelectItem value="cart">Cart</SelectItem>
                <SelectItem value="person">Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Spawn Interval */}
          <div className="space-y-2">
            <Label>
              Spawn Interval: {(path.spawnInterval / 1000).toFixed(1)}s
            </Label>
            <Slider
              value={[path.spawnInterval]}
              onValueChange={([v]) => v && onUpdate({ spawnInterval: v })}
              min={500}
              max={30000}
              step={500}
            />
            <p className="text-xs text-muted-foreground">
              Time between spawning new elements
            </p>
          </div>

          {/* Dwell Time */}
          <div className="space-y-2">
            <Label>Dwell Time: {(path.dwellTime / 1000).toFixed(1)}s</Label>
            <Slider
              value={[path.dwellTime]}
              onValueChange={([v]) =>
                v !== undefined && onUpdate({ dwellTime: v })
              }
              min={0}
              max={10000}
              step={500}
            />
            <p className="text-xs text-muted-foreground">
              Time to wait at each stop
            </p>
          </div>

          {/* Speed */}
          <div className="space-y-2">
            <Label>Speed: {path.speed.toFixed(1)}x</Label>
            <Slider
              value={[path.speed]}
              onValueChange={([v]) => v && onUpdate({ speed: v })}
              min={0.1}
              max={3}
              step={0.1}
            />
          </div>

          {/* Max Active */}
          <div className="space-y-2">
            <Label>Max Active: {path.maxActive}</Label>
            <Slider
              value={[path.maxActive]}
              onValueChange={([v]) => v && onUpdate({ maxActive: v })}
              min={1}
              max={20}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Maximum concurrent elements on this path
            </p>
          </div>

          {/* Stops */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Stops</Label>
              <Badge variant="secondary">{path.stops.length}</Badge>
            </div>

            {path.stops.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Click on the canvas to add stops
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={path.stops}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {path.stops.map((stopId, index) => (
                      <SortableStopItem
                        key={stopId}
                        id={stopId}
                        index={index}
                        label={getStopLabel(stopId)}
                        onRemove={() => handleRemoveStop(stopId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

interface SortableStopItemProps {
  id: string
  index: number
  label: string
  onRemove: () => void
}

function SortableStopItem({
  id,
  index,
  label,
  onRemove,
}: SortableStopItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 bg-muted/50 rounded border",
        isDragging && "opacity-50"
      )}
    >
      <button className="cursor-grab touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Badge variant="outline" className="shrink-0">
        {index + 1}
      </Badge>
      <span className="flex-1 text-sm truncate">{label}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
