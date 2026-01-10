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
import type { ExcalidrawElementData } from "@/server/db/schema/element"
import {
  isLegacyTemplate,
  migrateLegacyTemplate,
  generateExcalidrawElements,
} from "@/lib/element-utils"

interface EditorPageProps {
  params: Promise<{ id: string }>
}

export default function EditorPage({ params }: EditorPageProps) {
  const { id } = use(params)
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  // Track placed elements by groupId (for multi-element templates, groupId is used as the identifier)
  const placedElementsRef = useRef<
    Map<string, { groupId: string; templateId: string; elementIds: string[] }>
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

  // Reconstruct Excalidraw elements from saved placed elements + orphan elements from canvasState
  const initialData = useMemo<ExcalidrawSceneData | undefined>(() => {
    // Get orphan elements from canvasState (elements saved but not in placed_elements)
    type CanvasStateWithElements = {
      elements?: ExcalidrawElementType[]
      [key: string]: unknown
    }
    const canvasStateWithElements = warehouse?.canvasState as
      | CanvasStateWithElements
      | undefined
    const savedElements = canvasStateWithElements?.elements || []

    // If no placed elements but have saved canvas elements, use those directly
    if (!placedElements || !templates || placedElements.length === 0) {
      if (savedElements.length > 0) {
        return {
          elements: savedElements,
          appState: warehouse?.canvasState || undefined,
        }
      }
      return undefined
    }

    const allElements: ExcalidrawElementType[] = []
    const trackedGroupIds = new Set<string>()

    for (const pe of placedElements) {
      const template = templateMap.get(pe.elementTemplateId)
      const data = template?.excalidrawData as ExcalidrawElementData | undefined

      // Calculate scale factors based on placed vs default dimensions
      const scaleX = pe.width / (template?.defaultWidth || 100)
      const scaleY = pe.height / (template?.defaultHeight || 100)

      // Use the placed element's excalidrawId as the group ID
      const groupId = pe.excalidrawId
      trackedGroupIds.add(groupId)

      if (isLegacyTemplate(data)) {
        // Legacy single-element template
        const legacyElements = migrateLegacyTemplate(
          data,
          template?.defaultWidth || 100,
          template?.defaultHeight || 100
        )
        const elements = generateExcalidrawElements(
          legacyElements,
          pe.positionX,
          pe.positionY,
          scaleX,
          scaleY,
          groupId
        )
        allElements.push(...elements)
      } else {
        // Multi-element template
        const elements = generateExcalidrawElements(
          data!.elements!,
          pe.positionX,
          pe.positionY,
          scaleX,
          scaleY,
          groupId
        )
        allElements.push(...elements)
      }
    }

    // Add orphan elements from canvasState (elements not in placed_elements)
    // These are elements that were drawn directly on canvas or added before tracking
    for (const el of savedElements) {
      const elGroupIds = el.groupIds || []
      // Check if this element belongs to any tracked group
      const isTracked = elGroupIds.some((gid: string) =>
        trackedGroupIds.has(gid)
      )
      if (!isTracked && !el.isDeleted) {
        allElements.push(el)
      }
    }

    return {
      elements: allElements,
      appState: warehouse?.canvasState || undefined,
    }
  }, [placedElements, templates, templateMap, warehouse?.canvasState])

  // Initialize placedElementsRef with existing elements when data loads
  useEffect(() => {
    if (placedElements && templates && !initializedRef.current) {
      placedElementsRef.current.clear()
      for (const pe of placedElements) {
        // Initialize with groupId - actual element IDs will be synced after Excalidraw loads
        placedElementsRef.current.set(pe.excalidrawId, {
          groupId: pe.excalidrawId,
          templateId: pe.elementTemplateId,
          elementIds: [], // Will be populated by syncElementIds effect
        })
      }
      initializedRef.current = true
    }
  }, [placedElements, templates])

  // Sync actual element IDs from Excalidraw after it initializes
  // This is necessary because Excalidraw may modify element IDs when loading initialData
  useEffect(() => {
    if (
      !excalidrawAPI ||
      !initializedRef.current ||
      placedElementsRef.current.size === 0
    )
      return

    const sceneElements = excalidrawAPI.getSceneElements()

    // Group scene elements by their groupIds
    const elementsByGroupId = new Map<string, string[]>()
    for (const el of sceneElements) {
      if (el.isDeleted) continue
      const groupIds = el.groupIds || []
      for (const gid of groupIds) {
        if (!elementsByGroupId.has(gid)) {
          elementsByGroupId.set(gid, [])
        }
        elementsByGroupId.get(gid)!.push(el.id)
      }
    }

    // Update placedElementsRef with actual element IDs from Excalidraw
    for (const [groupId, value] of placedElementsRef.current.entries()) {
      const actualIds = elementsByGroupId.get(groupId) || []
      if (actualIds.length > 0) {
        placedElementsRef.current.set(groupId, {
          ...value,
          elementIds: actualIds,
        })
      }
    }
  }, [excalidrawAPI, placedElements])

  const updateMutation = api.warehouse.update.useMutation({
    onSuccess: () => {
      setHasUnsavedChanges(false)
      utils.warehouse.getById.invalidate({ id })
      utils.warehouse.getAll.invalidate()
    },
  })

  const syncMutation = api.placedElement.syncWarehouse.useMutation({
    onSuccess: () => {
      utils.placedElement.getByWarehouse.invalidate({ warehouseId: id })
    },
  })

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

    let thumbnailUrl: string | undefined
    const visibleElements = (elements as ExcalidrawElementType[]).filter(
      (e: ExcalidrawElementType) => !e.isDeleted
    )
    if (visibleElements.length > 0) {
      try {
        const { exportToBlob } = await import("@excalidraw/excalidraw")
        const blob = await exportToBlob({
          elements: visibleElements,
          appState: {
            ...appState,
            exportWithDarkMode: false,
            exportBackground: true,
          },
          files: excalidrawAPI.getFiles(),
          maxWidthOrHeight: 400,
        })
        thumbnailUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (err) {
        console.error("Failed to generate thumbnail:", err)
      }
    }

    // Store both appState and ALL elements in canvasState
    // This ensures orphan elements (not in placed_elements) are preserved
    await updateMutation.mutateAsync({
      id: warehouse.id,
      canvasState: {
        ...sceneData.appState,
        elements: visibleElements,
      },
      thumbnailUrl,
    })

    const placedElementsData = Array.from(
      placedElementsRef.current.entries()
    ).map(([, value]) => {
      // Find all elements that belong to this placed element
      // First try by element IDs (most reliable for newly added elements)
      // Fall back to groupIds (for elements loaded from DB where IDs might differ)
      let groupElements: ExcalidrawElementType[] = []

      if (value.elementIds.length > 0) {
        const elementIdSet = new Set(value.elementIds)
        groupElements = (elements as ExcalidrawElementType[]).filter(
          (e: ExcalidrawElementType) => elementIdSet.has(e.id) && !e.isDeleted
        )
      }

      // Fallback: try matching by groupIds if no elements found by ID
      if (groupElements.length === 0) {
        groupElements = (elements as ExcalidrawElementType[]).filter(
          (e: ExcalidrawElementType) =>
            e.groupIds?.includes(value.groupId) && !e.isDeleted
        )
      }

      if (groupElements.length === 0) return null

      // Calculate bounding box for the group
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      for (const el of groupElements) {
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + el.width)
        maxY = Math.max(maxY, el.y + el.height)
      }

      return {
        elementTemplateId: value.templateId,
        excalidrawId: value.groupId,
        positionX: minX,
        positionY: minY,
        width: maxX - minX,
        height: maxY - minY,
        rotation: groupElements[0].angle || 0,
      }
    })

    const validElements = placedElementsData.filter(Boolean) as NonNullable<
      (typeof placedElementsData)[number]
    >[]

    if (validElements.length > 0) {
      await syncMutation.mutateAsync({
        warehouseId: warehouse.id,
        elements: validElements,
      })
    }
  }, [excalidrawAPI, warehouse, updateMutation, syncMutation])

  const handleElementAdded = useCallback(
    (groupId: string, templateId: string, elementIds: string[] = []) => {
      placedElementsRef.current.set(groupId, {
        groupId,
        templateId,
        elementIds,
      })
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
        {/* Element Library Sidebar */}
        <div className="h-full w-64 border-r bg-card">
          <ElementLibrarySidebar
            excalidrawAPI={excalidrawAPI}
            warehouseId={id}
            onElementAdded={handleElementAdded}
          />
        </div>

        {/* Canvas */}
        <div className="relative flex-1">
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
