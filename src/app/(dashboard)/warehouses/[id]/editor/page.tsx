"use client"

import { use, useState, useCallback, useRef, useEffect, useMemo } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ExcalidrawWrapper,
  type ExcalidrawSceneData,
  type ExcalidrawElementType,
  type AppStateType,
  type BinaryFilesType,
} from "@/components/editor/excalidraw-wrapper"
import { ElementLibrarySidebar } from "@/components/editor/element-library-sidebar"
import { api } from "@/trpc/react"

// Category colors matching element-library-sidebar
const categoryColors: Record<string, { bg: string; stroke: string }> = {
  racking: { bg: "#3b82f6", stroke: "#1d4ed8" },
  lane: { bg: "#22c55e", stroke: "#15803d" },
  area: { bg: "#f59e0b", stroke: "#b45309" },
  equipment: { bg: "#8b5cf6", stroke: "#6d28d9" },
  custom: { bg: "#6b7280", stroke: "#374151" },
}

interface EditorPageProps {
  params: Promise<{ id: string }>
}

export default function EditorPage({ params }: EditorPageProps) {
  const { id } = use(params)
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const placedElementsRef = useRef<
    Map<string, { excalidrawId: string; templateId: string }>
  >(new Map())
  const initializedRef = useRef(false)

  const { data: warehouse, isLoading } = api.warehouse.getById.useQuery({ id })
  const { data: placedElements } = api.placedElement.getByWarehouse.useQuery(
    { warehouseId: id },
    { enabled: !!id }
  )
  const { data: templates } = api.element.getAll.useQuery()
  const utils = api.useUtils()

  // Create a map of template IDs to templates for quick lookup
  const templateMap = useMemo(() => {
    if (!templates) return new Map()
    return new Map(templates.map((t) => [t.id, t]))
  }, [templates])

  // Reconstruct Excalidraw elements from saved placed elements
  const initialData = useMemo<ExcalidrawSceneData | undefined>(() => {
    if (!placedElements || !templates || placedElements.length === 0) {
      return undefined
    }

    const defaultColors = { bg: "#6b7280", stroke: "#374151" }
    const elements: ExcalidrawElementType[] = placedElements.map((pe) => {
      const template = templateMap.get(pe.elementTemplateId)
      const colors = template
        ? (categoryColors[template.category] ?? defaultColors)
        : defaultColors

      return {
        id: pe.excalidrawId,
        type: template?.excalidrawData?.type || "rectangle",
        x: pe.positionX,
        y: pe.positionY,
        width: pe.width,
        height: pe.height,
        angle: pe.rotation,
        strokeColor: colors.stroke,
        backgroundColor: colors.bg,
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 80,
        groupIds: [],
        frameId: null,
        index: "a0",
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 2147483647),
        version: 1,
        versionNonce: Math.floor(Math.random() * 2147483647),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
      }
    })

    return {
      elements,
      appState: warehouse?.canvasState || undefined,
    }
  }, [placedElements, templates, templateMap, warehouse?.canvasState])

  // Initialize placedElementsRef with existing elements when data loads
  useEffect(() => {
    if (placedElements && !initializedRef.current) {
      placedElementsRef.current.clear()
      for (const pe of placedElements) {
        placedElementsRef.current.set(pe.excalidrawId, {
          excalidrawId: pe.excalidrawId,
          templateId: pe.elementTemplateId,
        })
      }
      initializedRef.current = true
    }
  }, [placedElements])

  const updateMutation = api.warehouse.update.useMutation({
    onSuccess: () => {
      setHasUnsavedChanges(false)
      utils.warehouse.getById.invalidate({ id })
    },
  })

  const syncMutation = api.placedElement.syncWarehouse.useMutation()

  const handleChange = useCallback(
    (
      _elements: readonly ExcalidrawElementType[],
      _appState: AppStateType,
      _files: BinaryFilesType
    ) => {
      setHasUnsavedChanges(true)
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI || !warehouse) return

    const elements = excalidrawAPI.getSceneElements()
    const appState = excalidrawAPI.getAppState()
    const files = excalidrawAPI.getFiles()

    // Save canvas state to warehouse
    const sceneData: ExcalidrawSceneData = {
      elements: elements as ExcalidrawElementType[],
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      },
      files,
    }

    // Update warehouse with canvas state
    await updateMutation.mutateAsync({
      id: warehouse.id,
      canvasState: sceneData.appState,
    })

    // Sync placed elements
    const placedElements = Array.from(placedElementsRef.current.entries()).map(
      ([, value]) => {
        const element = (elements as ExcalidrawElementType[]).find(
          (e: ExcalidrawElementType) => e.id === value.excalidrawId
        )
        if (!element || element.isDeleted) return null
        return {
          elementTemplateId: value.templateId,
          excalidrawId: value.excalidrawId,
          positionX: element.x,
          positionY: element.y,
          width: element.width,
          height: element.height,
          rotation: element.angle,
        }
      }
    )

    const validElements = placedElements.filter(Boolean) as NonNullable<
      (typeof placedElements)[number]
    >[]

    if (validElements.length > 0) {
      await syncMutation.mutateAsync({
        warehouseId: warehouse.id,
        elements: validElements,
      })
    }
  }, [excalidrawAPI, warehouse, updateMutation, syncMutation])

  const handleElementAdded = useCallback(
    (excalidrawId: string, templateId: string) => {
      placedElementsRef.current.set(excalidrawId, { excalidrawId, templateId })
      setHasUnsavedChanges(true)
    },
    []
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  if (!warehouse) {
    notFound()
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/warehouses/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">{warehouse.name}</h1>
            <p className="text-xs text-muted-foreground">Layout Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">
              Unsaved changes
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={
              !hasUnsavedChanges ||
              updateMutation.isPending ||
              syncMutation.isPending
            }
          >
            {updateMutation.isPending || syncMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        <ElementLibrarySidebar
          excalidrawAPI={excalidrawAPI}
          warehouseId={id}
          onElementAdded={handleElementAdded}
        />
        <div className="flex-1">
          <ExcalidrawWrapper
            initialData={initialData}
            onChange={handleChange}
            onApiReady={setExcalidrawAPI}
          />
        </div>
      </div>
    </div>
  )
}
