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
import type { UIFlow, UILocationStep } from "./types"
import { createDefaultFlow } from "./types"
import type { Flow, PlacedElement } from "@/server/db/schema"

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
  existingFlows: Flow[]
  placedElements: PlacedElement[]
}

export function FlowListSidebar({
  flows,
  selectedFlowId,
  onSelectFlow,
  onAddFlow,
  onUpdateFlow,
  onDeleteFlow,
  onDuplicateFlow,
  existingFlows,
  placedElements,
}: FlowListSidebarProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newFlowName, setNewFlowName] = useState("")
  const [newFlowColor, setNewFlowColor] = useState(colorPresets[0] ?? "#3b82f6")
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [addMode, setAddMode] = useState<"new" | "import">("new")
  const [selectedImportFlowId, setSelectedImportFlowId] = useState<string>("")

  // Build element lookup for import
  const elementMap = new Map(placedElements.map((e) => [e.id, e]))

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

  const handleImportFlow = () => {
    const existingFlow = existingFlows.find(
      (f) => f.id === selectedImportFlowId
    )
    if (!existingFlow) return

    // Convert database flow to UIFlow
    const flow = createDefaultFlow(existingFlow.name)
    flow.color = existingFlow.color

    // Convert element sequence to location steps
    const steps: UILocationStep[] = []
    for (const elementId of existingFlow.elementSequence) {
      const element = elementMap.get(elementId)
      if (!element) continue
      steps.push({
        id: crypto.randomUUID(),
        type: "location",
        target: {
          type: "fixed",
          elementId: elementId,
        },
        dwell: { type: "fixed", duration: 2000 },
      })
    }

    flow.steps = steps
    onAddFlow(flow)
    onSelectFlow(flow.id)

    setShowAddDialog(false)
    setSelectedImportFlowId("")
    setAddMode("new")
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
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) {
            setAddMode("new")
            setSelectedImportFlowId("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Flow</DialogTitle>
            <DialogDescription>
              Create a new flow or import an existing one from the warehouse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Mode selector */}
            <div className="flex gap-2">
              <Button
                variant={addMode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setAddMode("new")}
                className="flex-1"
              >
                Create New
              </Button>
              <Button
                variant={addMode === "import" ? "default" : "outline"}
                size="sm"
                onClick={() => setAddMode("import")}
                className="flex-1"
                disabled={existingFlows.length === 0}
              >
                Import Existing
              </Button>
            </div>

            {addMode === "new" ? (
              <>
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
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Flow</label>
                {existingFlows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No flows available for this warehouse. Create flows in the
                    Flow Editor first.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-auto rounded border p-2">
                    {existingFlows.map((flow) => (
                      <button
                        key={flow.id}
                        className={`w-full flex items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
                          selectedImportFlowId === flow.id
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedImportFlowId(flow.id)}
                      >
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: flow.color }}
                        />
                        <span className="truncate">{flow.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {flow.elementSequence.length} steps
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            {addMode === "new" ? (
              <Button onClick={handleAddFlow} disabled={!newFlowName.trim()}>
                Add Flow
              </Button>
            ) : (
              <Button
                onClick={handleImportFlow}
                disabled={!selectedImportFlowId}
              >
                Import Flow
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
