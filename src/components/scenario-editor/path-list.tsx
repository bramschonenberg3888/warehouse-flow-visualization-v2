"use client"

import { useState } from "react"
import { Plus, MoreVertical, Trash2, Copy, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Path } from "@/server/db/schema"
import { cn } from "@/lib/utils"

const COLOR_PRESETS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
]

interface PathListProps {
  paths: Path[]
  selectedPathId: string | null
  onSelectPath: (id: string) => void
  onAddPath: () => void
  onDeletePath: (id: string) => void
  onUpdatePath: (id: string, updates: Partial<Path>) => void
}

export function PathList({
  paths,
  selectedPathId,
  onSelectPath,
  onAddPath,
  onDeletePath,
  onUpdatePath,
}: PathListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const handleStartRename = (path: Path) => {
    setEditingId(path.id)
    setEditingName(path.name)
  }

  const handleFinishRename = (pathId: string) => {
    if (editingName.trim()) {
      onUpdatePath(pathId, { name: editingName.trim() })
    }
    setEditingId(null)
    setEditingName("")
  }

  const handleDuplicate = (path: Path) => {
    // Create a new path with the same settings
    const newPath: Path = {
      ...path,
      id: `new-${Date.now()}`,
      name: `${path.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    // This needs to be handled by the parent - for now just add
    onUpdatePath(newPath.id, newPath)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button onClick={onAddPath} size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Path
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {paths.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              No paths yet. Click &quot;Add Path&quot; to create one.
            </p>
          )}

          {paths.map((path) => (
            <div
              key={path.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                selectedPathId === path.id ? "bg-accent" : "hover:bg-accent/50"
              )}
              onClick={() => onSelectPath(path.id)}
            >
              {/* Color indicator */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-4 h-4 rounded-full shrink-0 border border-border"
                    style={{ backgroundColor: path.color }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "w-6 h-6 rounded-full border-2",
                          path.color === color
                            ? "border-foreground"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => onUpdatePath(path.id, { color })}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Name */}
              <div className="flex-1 min-w-0">
                {editingId === path.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleFinishRename(path.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFinishRename(path.id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    autoFocus
                    className="h-6 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm truncate block">{path.name}</span>
                )}
              </div>

              {/* Stops count */}
              <Badge variant="secondary" className="text-xs shrink-0">
                {path.stops.length}
              </Badge>

              {/* Active indicator */}
              {!path.isActive && (
                <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
              )}

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStartRename(path)}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onUpdatePath(path.id, { isActive: !path.isActive })
                    }
                  >
                    {path.isActive ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Enable
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(path)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeletePath(path.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
