"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { api } from "@/trpc/react"

export function CreateWarehouseDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [gridColumns, setGridColumns] = useState(20)
  const [gridRows, setGridRows] = useState(15)
  const router = useRouter()
  const utils = api.useUtils()

  const createMutation = api.warehouse.create.useMutation({
    onSuccess: (data) => {
      utils.warehouse.getAll.invalidate()
      setOpen(false)
      setName("")
      setDescription("")
      setGridColumns(20)
      setGridRows(15)
      // Navigate to the editor
      if (data) {
        router.push(`/warehouses/${data.id}/editor`)
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      gridColumns,
      gridRows,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Warehouse
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Warehouse</DialogTitle>
            <DialogDescription>
              Create a new warehouse to start designing your layout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                placeholder="Main Distribution Center"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="description"
                placeholder="Primary warehouse for east coast operations"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Grid Size</label>
              <p className="text-xs text-muted-foreground">
                Define the warehouse grid dimensions (each cell is 40×40 pixels)
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="gridColumns"
                    className="text-xs text-muted-foreground"
                  >
                    Columns
                  </label>
                  <Input
                    id="gridColumns"
                    type="number"
                    min={5}
                    max={100}
                    value={gridColumns}
                    onChange={(e) =>
                      setGridColumns(parseInt(e.target.value) || 20)
                    }
                  />
                </div>
                <span className="mt-5 text-muted-foreground">×</span>
                <div className="flex-1">
                  <label
                    htmlFor="gridRows"
                    className="text-xs text-muted-foreground"
                  >
                    Rows
                  </label>
                  <Input
                    id="gridRows"
                    type="number"
                    min={5}
                    max={100}
                    value={gridRows}
                    onChange={(e) =>
                      setGridRows(parseInt(e.target.value) || 15)
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {gridColumns * 40} × {gridRows * 40} pixels
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
