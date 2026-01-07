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
import type { ElementCategory, ElementTemplate } from "@/server/db/schema"

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
}

// Category labels
const categoryLabels: Record<ElementCategory, string> = {
  racking: "Racking",
  lane: "Lanes",
  area: "Areas",
  equipment: "Equipment",
  custom: "Custom",
}

// Category colors for elements
const categoryColors: Record<ElementCategory, { bg: string; stroke: string }> =
  {
    racking: { bg: "#3b82f6", stroke: "#1d4ed8" },
    lane: { bg: "#22c55e", stroke: "#15803d" },
    area: { bg: "#f59e0b", stroke: "#b45309" },
    equipment: { bg: "#8b5cf6", stroke: "#6d28d9" },
    custom: { bg: "#6b7280", stroke: "#374151" },
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
  const [activeTab, setActiveTab] = useState<ElementCategory>("racking")
  const { data: elements, isLoading } = api.element.getAll.useQuery()

  // Group elements by category
  const elementsByCategory = elements?.reduce(
    (acc, element) => {
      const category = element.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(element)
      return acc
    },
    {} as Record<ElementCategory, ElementTemplate[]>
  )

  const handleAddElement = (template: ElementTemplate) => {
    if (!excalidrawAPI) return

    const colors = categoryColors[template.category]

    // Add element to canvas at center of viewport
    const appState = excalidrawAPI.getAppState()
    const centerX =
      appState.scrollX + appState.width / 2 - template.defaultWidth / 2
    const centerY =
      appState.scrollY + appState.height / 2 - template.defaultHeight / 2

    const elementId = addElementToCanvas(excalidrawAPI, {
      type: "rectangle",
      x: centerX,
      y: centerY,
      width: template.defaultWidth,
      height: template.defaultHeight,
      backgroundColor: colors.bg,
      strokeColor: colors.stroke,
      fillStyle: "solid",
      roughness: 0,
      opacity: 80,
    })

    onElementAdded?.(elementId, template.id)
  }

  const categories: ElementCategory[] = [
    "racking",
    "lane",
    "area",
    "equipment",
    "custom",
  ]

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
        onValueChange={(v) => setActiveTab(v as ElementCategory)}
        className="flex flex-1 flex-col"
      >
        <TabsList className="mx-4 mt-4 grid grid-cols-4">
          {categories.slice(0, 4).map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {categoryLabels[cat].slice(0, 4)}
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            categories.map((category) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="space-y-2">
                  {elementsByCategory?.[category]?.length ? (
                    elementsByCategory[category].map((element) => (
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
            ))
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
  element: ElementTemplate
  onClick: () => void
  disabled?: boolean
}

function ElementButton({ element, onClick, disabled }: ElementButtonProps) {
  const Icon = iconMap[element.icon] || Square
  const colors = categoryColors[element.category]

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
              style={{ backgroundColor: colors.bg }}
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
