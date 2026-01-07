"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useState } from "react"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamic import with SSR disabled - required for Excalidraw
const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw")
    return mod.Excalidraw
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    ),
  }
)

// Use generic types for Excalidraw data to avoid complex type conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExcalidrawElementType = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppStateType = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BinaryFilesType = any

export interface ExcalidrawSceneData {
  elements: ExcalidrawElementType[]
  appState?: Partial<AppStateType>
  files?: BinaryFilesType
}

interface ExcalidrawWrapperProps {
  initialData?: ExcalidrawSceneData
  onChange?: (
    elements: readonly ExcalidrawElementType[],
    appState: AppStateType,
    files: BinaryFilesType
  ) => void
  onSave?: (data: ExcalidrawSceneData) => void
  onApiReady?: (api: ExcalidrawImperativeAPI) => void
}

export function ExcalidrawWrapper({
  initialData,
  onChange,
  onApiReady,
}: ExcalidrawWrapperProps) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null)

  // Load Excalidraw CSS dynamically
  useEffect(() => {
    const linkId = "excalidraw-styles"
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link")
      link.id = linkId
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/@excalidraw/excalidraw/dist/prod/index.css"
      document.head.appendChild(link)
    }
  }, [])

  // Notify parent when API is ready
  useEffect(() => {
    if (excalidrawAPI && onApiReady) {
      onApiReady(excalidrawAPI)
    }
  }, [excalidrawAPI, onApiReady])

  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElementType[],
      appState: AppStateType,
      files: BinaryFilesType
    ) => {
      onChange?.(elements, appState, files)
    },
    [onChange]
  )

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={initialData as ExcalidrawElementType}
        onChange={handleChange}
        theme="light"
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: false,
            toggleTheme: true,
          },
        }}
      />
    </div>
  )
}

// Helper to add an element to the canvas
export function addElementToCanvas(
  api: ExcalidrawImperativeAPI,
  element: Partial<ExcalidrawElementType>
): string {
  const existingElements = api.getSceneElements()
  const newElement = {
    id: crypto.randomUUID(),
    type: "rectangle",
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "#a5d8ff",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
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
    ...element,
  }

  api.updateScene({
    elements: [...existingElements, newElement] as ExcalidrawElementType[],
  })

  return newElement.id
}
