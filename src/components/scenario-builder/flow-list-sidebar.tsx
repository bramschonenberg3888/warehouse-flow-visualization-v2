"use client"

import { useState } from "react"
import { Plus, MoreVertical, Trash2, Copy, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { UIFlow } from "./types"
import { createDefaultFlow } from "./types"

const colorPresets = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
]

interface FlowListSidebarProps {
  flows: UIFlow[]
  selectedFlowId: string | null
  onSelectFlow: (flowId: string) => void
  onAddFlow: (flow: UIFlow) => void
  onUpdateFlow: (flowId: string, updates: Partial<UIFlow>) => void
  onDeleteFlow: (flowId: string) => void
  onDuplicateFlow: (flowId: string) => void
}

export function FlowListSidebar({
  flows,
  selectedFlowId,
  onSelectFlow,
  onAddFlow,
  onUpdateFlow,
  onDeleteFlow,
  onDuplicateFlow,
}: FlowListSidebarProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newFlowName, setNewFlowName] = useState("")
  const [newFlowColor, setNewFlowColor] = useState(colorPresets[0] ?? "#3b82f6")
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const handleAddFlow = () => {
    if (!newFlowName.trim()) return

    const flow = createDefaultFlow(newFlowName.trim())
    flow.color = newFlowColor
    onAddFlow(flow)
    onSelectFlow(flow.id)

    setShowAddDialog(false)
    setNewFlowName("")
    setNewFlowColor(colorPresets[0] ?? "#3b82f6")
  }

  const handleStartRename = (flow: UIFlow) => {
    setEditingNameId(flow.id)
    setEditingName(flow.name)
  }

  const handleFinishRename = () => {
    if (editingNameId && editingName.trim()) {
      onUpdateFlow(editingNameId, { name: editingName.trim() })
    }
    setEditingNameId(null)
    setEditingName("")
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Flows</h2>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Flow List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {flows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No flows yet.
              <br />
              Add a flow to get started.
            </div>
          ) : (
            flows.map((flow) => (
              <div
                key={flow.id}
                className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                  selectedFlowId === flow.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => onSelectFlow(flow.id)}
              >
                {/* Color indicator */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="h-3 w-3 rounded-full shrink-0 ring-1 ring-border"
                      style={{ backgroundColor: flow.color }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="grid grid-cols-4 gap-1">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          className={`h-6 w-6 rounded border ${
                            flow.color === color
                              ? "ring-2 ring-primary"
                              : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            onUpdateFlow(flow.id, { color })
                          }}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Flow name */}
                {editingNameId === flow.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFinishRename()
                      if (e.key === "Escape") {
                        setEditingNameId(null)
                        setEditingName("")
                      }
                    }}
                    className="h-6 text-sm"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 truncate text-sm"
                    onDoubleClick={() => handleStartRename(flow)}
                  >
                    {flow.name}
                  </span>
                )}

                {/* Active badge */}
                {!flow.isActive && (
                  <Badge variant="secondary" className="text-xs">
                    Off
                  </Badge>
                )}

                {/* Actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStartRename(flow)}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onUpdateFlow(flow.id, { isActive: !flow.isActive })
                      }
                    >
                      {flow.isActive ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Enable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicateFlow(flow.id)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteFlow(flow.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Flow Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Flow</DialogTitle>
            <DialogDescription>
              Create a new flow to define how items move through the warehouse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Flow Name</label>
              <Input
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                placeholder="e.g., Inbound Processing"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFlow()
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    className={`h-8 w-8 rounded border transition-transform ${
                      newFlowColor === color
                        ? "ring-2 ring-primary ring-offset-2"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewFlowColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFlow} disabled={!newFlowName.trim()}>
              Add Flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
