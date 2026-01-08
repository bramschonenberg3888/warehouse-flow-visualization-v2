"use client"

import { use, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
  type ExcalidrawSceneData,
} from "@/components/editor/excalidraw-wrapper"
import { api } from "@/trpc/react"

interface EditElementPageProps {
  params: Promise<{ id: string }>
}

export default function EditElementPage({ params }: EditElementPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null)
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [hasElements, setHasElements] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const { data: element, isLoading } = api.element.getById.useQuery({ id })
  const { data: categories } = api.category.getAll.useQuery()
  const utils = api.useUtils()

  // Initialize form values when element loads
  if (element && !initialized) {
    setName(element.name)
    setCategoryId(element.categoryId || "")
    setInitialized(true)
  }

  const updateMutation = api.element.update.useMutation({
    onSuccess: async () => {
      await utils.element.getAll.invalidate()
      router.push("/elements")
    },
  })

  // Create initial canvas data from element
  const initialData = useMemo<ExcalidrawSceneData | undefined>(() => {
    if (!element?.excalidrawData) return undefined

    const data = element.excalidrawData as {
      type?: string
      strokeColor?: string
      backgroundColor?: string
      fillStyle?: string
      strokeStyle?: string
      strokeWidth?: number
      roughness?: number
      opacity?: number
      roundness?: { type: number } | null
    }
    // Use element.id as basis for stable seed values
    const seedBase = element.id.split("-").reduce((acc, part) => {
      return acc + parseInt(part, 16)
    }, 0)

    const canvasElement = {
      id: element.id,
      type: data.type || "rectangle",
      x: 100,
      y: 100,
      width: element.defaultWidth,
      height: element.defaultHeight,
      angle: 0,
      strokeColor: data.strokeColor || "#374151",
      backgroundColor: data.backgroundColor || "#6b7280",
      fillStyle: data.fillStyle || "solid",
      strokeWidth: data.strokeWidth || 2,
      strokeStyle: data.strokeStyle || "solid",
      roughness: data.roughness || 0,
      opacity: data.opacity || 80,
      groupIds: [],
      frameId: null,
      index: "a0",
      roundness: data.roundness ?? null,
      seed: seedBase,
      version: 1,
      versionNonce: seedBase + 1,
      isDeleted: false,
      boundElements: null,
      updated: element.createdAt.getTime(),
      link: null,
      locked: false,
    }

    return { elements: [canvasElement] }
  }, [element])

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
    if (!excalidrawAPI || !name.trim() || !element) return

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

    updateMutation.mutate({
      id: element.id,
      name: name.trim(),
      categoryId: categoryId || null,
      icon,
      defaultWidth: defaultWidth || 100,
      defaultHeight: defaultHeight || 100,
      excalidrawData,
    })
  }, [excalidrawAPI, name, categoryId, categories, element, updateMutation])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <p className="text-sm text-muted-foreground">Loading element...</p>
        </div>
      </div>
    )
  }

  if (!element) {
    notFound()
  }

  if (element.isSystem) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          System elements cannot be edited.
        </p>
        <Button asChild>
          <Link href="/elements">Back to Elements</Link>
        </Button>
      </div>
    )
  }

  const canSave =
    name.trim().length > 0 && hasElements && !updateMutation.isPending

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
          {updateMutation.isPending ? (
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
          initialData={initialData}
          onChange={handleChange}
          onApiReady={setExcalidrawAPI}
        />
      </div>
    </div>
  )
}
