"use client"

import { useState } from "react"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import {
  Warehouse,
  LayoutGrid,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoveHorizontal,
  Square,
  Package,
  Layers,
  ClipboardCheck,
  Truck,
  DoorOpen,
  Folder,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { addElementToCanvas } from "./excalidraw-wrapper"
import { api } from "@/trpc/react"
import type { Category } from "@/server/db/schema"

// Icon mapping for element templates
const iconMap: Record<string, LucideIcon> = {
  Warehouse,
  LayoutGrid,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoveHorizontal,
  Square,
  Package,
  Layers,
  ClipboardCheck,
  Truck,
  DoorOpen,
  Folder,
}

interface ElementWithCategory {
  id: string
  name: string
  categoryId: string | null
  excalidrawData: {
    type?: string
    backgroundColor?: string
    strokeColor?: string
    strokeWidth?: number
    fillStyle?: string
    strokeStyle?: string
    roughness?: number
    opacity?: number
    roundness?: { type: number } | null
  } | null
  icon: string
  defaultWidth: number
  defaultHeight: number
  isSystem: boolean
  createdAt: Date
  category: Category | null
}

interface ElementLibrarySidebarProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null
  warehouseId: string
  onElementAdded?: (elementId: string, templateId: string) => void
}

export function ElementLibrarySidebar({
  excalidrawAPI,
  onElementAdded,
}: ElementLibrarySidebarProps) {
  const [activeTab, setActiveTab] = useState<string>("all")
  const { data: elements, isLoading: elementsLoading } =
    api.element.getAll.useQuery()
  const { data: categories, isLoading: categoriesLoading } =
    api.category.getAll.useQuery()

  const isLoading = elementsLoading || categoriesLoading

  // Group elements by category
  const elementsByCategory = (
    elements as ElementWithCategory[] | undefined
  )?.reduce(
    (acc, element) => {
      const catId = element.categoryId || "uncategorized"
      if (!acc[catId]) {
        acc[catId] = []
      }
      acc[catId].push(element)
      return acc
    },
    {} as Record<string, ElementWithCategory[]>
  )

  const handleAddElement = (template: ElementWithCategory) => {
    if (!excalidrawAPI) return

    const data = template.excalidrawData
    const fallbackBg = template.category?.bgColor || "#6b7280"
    const fallbackStroke = template.category?.strokeColor || "#374151"

    // Add element to canvas at center of viewport
    const appState = excalidrawAPI.getAppState()
    const centerX =
      appState.scrollX + appState.width / 2 - template.defaultWidth / 2
    const centerY =
      appState.scrollY + appState.height / 2 - template.defaultHeight / 2

    const elementId = addElementToCanvas(excalidrawAPI, {
      type: data?.type || "rectangle",
      x: centerX,
      y: centerY,
      width: template.defaultWidth,
      height: template.defaultHeight,
      backgroundColor: data?.backgroundColor || fallbackBg,
      strokeColor: data?.strokeColor || fallbackStroke,
      fillStyle: data?.fillStyle || "solid",
      strokeStyle: data?.strokeStyle || "solid",
      strokeWidth: data?.strokeWidth || 2,
      roughness: data?.roughness ?? 0,
      opacity: data?.opacity ?? 80,
      roundness: data?.roundness ?? null,
    })

    onElementAdded?.(elementId, template.id)
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b p-4">
        <h3 className="font-semibold">Element Library</h3>
        <p className="text-xs text-muted-foreground">
          Click to add elements to canvas
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col"
      >
        <ScrollArea className="border-b">
          <TabsList className="mx-4 my-2 flex h-auto flex-wrap gap-1">
            <TabsTrigger value="all" className="px-2 text-xs">
              All
            </TabsTrigger>
            {categories?.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="px-2 text-xs">
                {cat.name.length > 6 ? cat.name.slice(0, 6) + "…" : cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="all" className="mt-0">
                <div className="space-y-2">
                  {elements && elements.length > 0 ? (
                    (elements as ElementWithCategory[]).map((element) => (
                      <ElementButton
                        key={element.id}
                        element={element}
                        onClick={() => handleAddElement(element)}
                        disabled={!excalidrawAPI}
                      />
                    ))
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No elements yet
                    </p>
                  )}
                </div>
              </TabsContent>

              {categories?.map((category) => (
                <TabsContent
                  key={category.id}
                  value={category.id}
                  className="mt-0"
                >
                  <div className="space-y-2">
                    {elementsByCategory?.[category.id]?.length ? (
                      elementsByCategory[category.id]!.map((element) => (
                        <ElementButton
                          key={element.id}
                          element={element}
                          onClick={() => handleAddElement(element)}
                          disabled={!excalidrawAPI}
                        />
                      ))
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No elements in this category
                      </p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </>
          )}
        </ScrollArea>
      </Tabs>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Tip: Drag elements to reposition them on the canvas
        </p>
      </div>
    </div>
  )
}

interface ElementButtonProps {
  element: ElementWithCategory
  onClick: () => void
  disabled?: boolean
}

function ElementButton({ element, onClick, disabled }: ElementButtonProps) {
  const Icon = iconMap[element.icon] || Square
  const bgColor = element.category?.bgColor || "#6b7280"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 p-3"
            onClick={onClick}
            disabled={disabled}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded"
              style={{ backgroundColor: bgColor }}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{element.name}</p>
              <p className="text-xs text-muted-foreground">
                {element.defaultWidth}x{element.defaultHeight}
              </p>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Click to add {element.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
