"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/trpc/react"
import type { Flow } from "@/server/db/schema"

// Preset colors for flow paths
const PRESET_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

interface FlowFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouseId: string
  flow?: Flow | null
  elementSequence: string[]
  onSuccess: () => void
}

export function FlowFormDialog({
  open,
  onOpenChange,
  warehouseId,
  flow,
  elementSequence,
  onSuccess,
}: FlowFormDialogProps) {
  const isEditing = !!flow

  // Use a key based on flow id to reset form state when editing different flows
  const formKey = flow?.id ?? "new"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <FlowFormContent
          key={formKey}
          warehouseId={warehouseId}
          flow={flow}
          elementSequence={elementSequence}
          isEditing={isEditing}
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

interface FlowFormContentProps {
  warehouseId: string
  flow?: Flow | null
  elementSequence: string[]
  isEditing: boolean
  onSuccess: () => void
  onCancel: () => void
}

function FlowFormContent({
  warehouseId,
  flow,
  elementSequence,
  isEditing,
  onSuccess,
  onCancel,
}: FlowFormContentProps) {
  // Initialize form with flow values or defaults
  const initialValues = useMemo(
    () => ({
      name: flow?.name ?? "",
      description: flow?.description ?? "",
      color: flow?.color ?? PRESET_COLORS[0],
    }),
    [flow]
  )

  const [name, setName] = useState(initialValues.name)
  const [description, setDescription] = useState(initialValues.description)
  const [color, setColor] = useState(initialValues.color)

  const createMutation = api.flow.create.useMutation({
    onSuccess: () => {
      onSuccess()
    },
  })

  const updateMutation = api.flow.update.useMutation({
    onSuccess: () => {
      onSuccess()
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (elementSequence.length < 2) {
      alert("Please select at least 2 elements for the flow path")
      return
    }

    if (isEditing && flow) {
      updateMutation.mutate({
        id: flow.id,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        elementSequence,
      })
    } else {
      createMutation.mutate({
        warehouseId,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        elementSequence,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Flow" : "Create Flow"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the flow details and path"
            : "Define a new goods movement flow through the warehouse"}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            placeholder="Inbound to Storage"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description (optional)
          </label>
          <Textarea
            id="description"
            placeholder="Flow path for incoming goods from dock to storage area"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  color === presetColor
                    ? "border-primary scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: presetColor }}
                onClick={() => setColor(presetColor)}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="text"
              placeholder="#3b82f6"
              value={color}
              onChange={(e) => {
                const value = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  setColor(value)
                }
              }}
              className="w-28 font-mono text-sm"
            />
            <div
              className="h-8 w-8 rounded border"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Path</label>
          <p className="text-xs text-muted-foreground">
            {elementSequence.length === 0
              ? "Click elements on the canvas to build the path"
              : `${elementSequence.length} stops selected`}
          </p>
          {elementSequence.length < 2 && (
            <p className="text-xs text-destructive">Minimum 2 stops required</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || elementSequence.length < 2}
        >
          {isPending
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save"
              : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}
