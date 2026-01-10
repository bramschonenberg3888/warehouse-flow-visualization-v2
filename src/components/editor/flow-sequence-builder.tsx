"use client"

import { MousePointer2, X, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { PlacedElement } from "@/server/db/schema"

interface FlowSequenceBuilderProps {
  placedElements: PlacedElement[] | undefined
  sequence: string[]
  onSequenceChange: (sequence: string[]) => void
  isBuilding: boolean
  onStartBuilding: () => void
  onStopBuilding: () => void
}

export function FlowSequenceBuilder({
  placedElements,
  sequence,
  onSequenceChange,
  isBuilding,
  onStartBuilding,
  onStopBuilding,
}: FlowSequenceBuilderProps) {
  // Build element lookup map
  const elementMap = new Map<string, PlacedElement>()
  if (placedElements) {
    for (const element of placedElements) {
      elementMap.set(element.id, element)
    }
  }

  const handleRemove = (index: number) => {
    const newSequence = [...sequence]
    newSequence.splice(index, 1)
    onSequenceChange(newSequence)
  }

  const handleClear = () => {
    onSequenceChange([])
  }

  const handleMove = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === sequence.length - 1) return

    const newSequence = [...sequence]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    const currentItem = newSequence[index]
    const swapItem = newSequence[swapIndex]
    if (currentItem !== undefined && swapItem !== undefined) {
      newSequence[index] = swapItem
      newSequence[swapIndex] = currentItem
      onSequenceChange(newSequence)
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Flow Path</h4>
        {sequence.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-7 text-xs text-muted-foreground"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Build mode toggle */}
      <Button
        size="sm"
        variant={isBuilding ? "default" : "outline"}
        onClick={isBuilding ? onStopBuilding : onStartBuilding}
        className="w-full"
      >
        <MousePointer2 className="mr-2 h-4 w-4" />
        {isBuilding ? "Done Selecting" : "Select Elements"}
      </Button>

      {isBuilding && (
        <p className="text-xs text-muted-foreground text-center">
          Click elements on the canvas to add them to the path
        </p>
      )}

      {/* Sequence list */}
      {sequence.length > 0 ? (
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {sequence.map((elementId, index) => {
              const element = elementMap.get(elementId)
              return (
                <div
                  key={`${elementId}-${index}`}
                  className="flex items-center gap-2 rounded border bg-muted/50 px-2 py-1.5"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move up"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {index + 1}
                  </div>

                  <span className="flex-1 truncate text-xs">
                    {element?.label || `Element ${index + 1}`}
                  </span>

                  <button
                    onClick={() => handleRemove(index)}
                    className="p-0.5 text-muted-foreground hover:text-destructive"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          No elements selected yet
        </p>
      )}

      {sequence.length > 0 && sequence.length < 2 && (
        <p className="text-xs text-amber-600 text-center">
          Add at least one more element
        </p>
      )}
    </div>
  )
}
