"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
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
  ExcalidrawWrapper,
  type ExcalidrawElementType,
  type AppStateType,
  type BinaryFilesType,
} from "@/components/editor/excalidraw-wrapper"
import { api } from "@/trpc/react"

export default function NewElementPage() {
  const router = useRouter()
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null)
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [hasElements, setHasElements] = useState(false)

  const { data: categories } = api.category.getAll.useQuery()
  const utils = api.useUtils()

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
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    for (const el of visibleElements) {
      minX = Math.min(minX, el.x)
      minY = Math.min(minY, el.y)
      maxX = Math.max(maxX, el.x + el.width)
      maxY = Math.max(maxY, el.y + el.height)
    }

    const defaultWidth = Math.round(maxX - minX)
    const defaultHeight = Math.round(maxY - minY)

    // Use first element's styling for the template
    const el = visibleElements[0]
    const excalidrawData = {
      type: el.type as "rectangle" | "ellipse" | "diamond" | "line" | "arrow",
      backgroundColor: el.backgroundColor || "#6b7280",
      strokeColor: el.strokeColor || "#374151",
      strokeWidth: el.strokeWidth || 2,
      fillStyle:
        (el.fillStyle as "solid" | "hachure" | "cross-hatch") || "solid",
      strokeStyle: (el.strokeStyle as "solid" | "dashed" | "dotted") || "solid",
      roughness: el.roughness || 0,
      opacity: el.opacity || 80,
      roundness: el.roundness ?? null,
    }

    // Get icon from selected category or default
    const selectedCategory = categories?.find((c) => c.id === categoryId)
    const icon = selectedCategory?.icon || "Package"

    createMutation.mutate({
      name: name.trim(),
      categoryId: categoryId || null,
      icon,
      defaultWidth: defaultWidth || 100,
      defaultHeight: defaultHeight || 100,
      excalidrawData,
    })
  }, [excalidrawAPI, name, categoryId, categories, createMutation])

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
