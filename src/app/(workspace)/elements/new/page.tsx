"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { ArrowLeft, Save, Loader2, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ExcalidrawWrapper,
  type ExcalidrawElementType,
  type AppStateType,
  type BinaryFilesType,
} from "@/components/editor/excalidraw-wrapper"
import { api } from "@/trpc/react"
import {
  calculateBoundingBox,
  extractTemplateElements,
} from "@/lib/element-utils"
import { GRID_CELL_SIZE } from "@/lib/grid-config"

// Grid size presets (in cells)
const gridSizePresets = [
  { label: "Auto", width: 0, height: 0 },
  { label: "1×1", width: 1, height: 1 },
  { label: "1×2", width: 1, height: 2 },
  { label: "2×1", width: 2, height: 1 },
  { label: "2×2", width: 2, height: 2 },
  { label: "2×3", width: 2, height: 3 },
  { label: "3×2", width: 3, height: 2 },
  { label: "3×3", width: 3, height: 3 },
  { label: "4×2", width: 4, height: 2 },
  { label: "2×4", width: 2, height: 4 },
  { label: "4×4", width: 4, height: 4 },
]

// Preset color palette for quick category creation
const colorPresets = [
  { name: "Gray", bg: "#6b7280", stroke: "#374151" },
  { name: "Red", bg: "#ef4444", stroke: "#b91c1c" },
  { name: "Orange", bg: "#f97316", stroke: "#c2410c" },
  { name: "Amber", bg: "#f59e0b", stroke: "#b45309" },
  { name: "Yellow", bg: "#eab308", stroke: "#a16207" },
  { name: "Lime", bg: "#84cc16", stroke: "#4d7c0f" },
  { name: "Green", bg: "#22c55e", stroke: "#15803d" },
  { name: "Teal", bg: "#14b8a6", stroke: "#0f766e" },
  { name: "Cyan", bg: "#06b6d4", stroke: "#0e7490" },
  { name: "Blue", bg: "#3b82f6", stroke: "#1d4ed8" },
  { name: "Indigo", bg: "#6366f1", stroke: "#4338ca" },
  { name: "Purple", bg: "#a855f7", stroke: "#7e22ce" },
  { name: "Pink", bg: "#ec4899", stroke: "#be185d" },
  { name: "Rose", bg: "#f43f5e", stroke: "#be123c" },
]

export default function NewElementPage() {
  const router = useRouter()
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null)
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [gridSizePreset, setGridSizePreset] = useState("Auto")
  const [hasElements, setHasElements] = useState(false)

  // Inline category creation state
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState(colorPresets[0]!)

  const { data: categories } = api.category.getAll.useQuery()
  const utils = api.useUtils()

  const createCategoryMutation = api.category.create.useMutation({
    onSuccess: async (newCategory) => {
      await utils.category.getAll.invalidate()
      if (newCategory) {
        setCategoryId(newCategory.id)
      }
      setNewCategoryOpen(false)
      setNewCategoryName("")
      setNewCategoryColor(colorPresets[0]!)
    },
  })

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return
    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      bgColor: newCategoryColor.bg,
      strokeColor: newCategoryColor.stroke,
      icon: "Folder",
    })
  }

  const createMutation = api.element.create.useMutation({
    onSuccess: async () => {
      // Invalidate and refetch to ensure fresh data
      await utils.element.getAll.invalidate()
      router.push("/elements")
      router.refresh()
    },
  })

  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElementType[],
      _appState: AppStateType,
      _files: BinaryFilesType
    ) => {
      const visibleElements = elements.filter(
        (e: ExcalidrawElementType) => !e.isDeleted
      )
      setHasElements(visibleElements.length > 0)
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI || !name.trim()) return

    const elements = excalidrawAPI.getSceneElements()
    const visibleElements = (elements as ExcalidrawElementType[]).filter(
      (e: ExcalidrawElementType) => !e.isDeleted
    )

    if (visibleElements.length === 0) return

    // Calculate bounding box of all elements
    const bbox = calculateBoundingBox(visibleElements)

    // Extract all elements with relative positions (version 2 format)
    const templateElements = extractTemplateElements(
      visibleElements,
      bbox.minX,
      bbox.minY
    )

    const excalidrawData = {
      version: 2 as const,
      elements: templateElements,
    }

    // Determine final dimensions: use preset if selected, otherwise use bounding box
    const selectedPreset = gridSizePresets.find(
      (p) => p.label === gridSizePreset
    )
    const usePreset = selectedPreset && selectedPreset.width > 0
    const finalWidth = usePreset
      ? selectedPreset.width * GRID_CELL_SIZE
      : bbox.width || 100
    const finalHeight = usePreset
      ? selectedPreset.height * GRID_CELL_SIZE
      : bbox.height || 100

    // Get icon from selected category or default
    const selectedCategory = categories?.find((c) => c.id === categoryId)
    const icon = selectedCategory?.icon || "Package"

    createMutation.mutate({
      name: name.trim(),
      categoryId: categoryId || null,
      icon,
      defaultWidth: finalWidth,
      defaultHeight: finalHeight,
      excalidrawData,
    })
  }, [
    excalidrawAPI,
    name,
    categoryId,
    gridSizePreset,
    categories,
    createMutation,
  ])

  const canSave =
    name.trim().length > 0 && hasElements && !createMutation.isPending

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/elements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Input
            placeholder="Element name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48"
          />
          <div className="flex items-center gap-1">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.bgColor }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  title="Add new category"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-3">
                  <div className="text-sm font-medium">New Category</div>
                  <Input
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateCategory()
                    }}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      Color
                    </label>
                    <div className="grid grid-cols-7 gap-1">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          title={preset.name}
                          onClick={() => setNewCategoryColor(preset)}
                          className="relative h-6 w-6 rounded border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                          style={{ backgroundColor: preset.bg }}
                        >
                          {newCategoryColor.bg === preset.bg && (
                            <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow-md" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={
                      !newCategoryName.trim() ||
                      createCategoryMutation.isPending
                    }
                  >
                    {createCategoryMutation.isPending
                      ? "Creating..."
                      : "Create Category"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Select value={gridSizePreset} onValueChange={setGridSizePreset}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Grid Size" />
            </SelectTrigger>
            <SelectContent>
              {gridSizePresets.map((preset) => (
                <SelectItem key={preset.label} value={preset.label}>
                  {preset.label === "Auto"
                    ? "Auto"
                    : `${preset.label} (${preset.width * GRID_CELL_SIZE}×${preset.height * GRID_CELL_SIZE})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={!canSave}>
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Element
            </>
          )}
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ExcalidrawWrapper
          onChange={handleChange}
          onApiReady={setExcalidrawAPI}
        />
      </div>
    </div>
  )
}
