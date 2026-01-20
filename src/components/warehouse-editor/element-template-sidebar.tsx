"use client"

import { useMemo } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ElementTemplate, Category } from "@/server/db/schema"

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

interface ElementWithCategory extends ElementTemplate {
  category: Category | null
}

interface ElementTemplateSidebarProps {
  templates: ElementWithCategory[] | undefined
  categories: Category[] | undefined
  isLoading: boolean
  selectedTemplateId: string | null
  onSelectTemplate: (templateId: string | null) => void
}

export function ElementTemplateSidebar({
  templates,
  categories,
  isLoading,
  selectedTemplateId,
  onSelectTemplate,
}: ElementTemplateSidebarProps) {
  // Filter to only static elements (only static elements should be placed on warehouse grid)
  const staticTemplates = useMemo(() => {
    return templates?.filter((t) => t.elementBehavior === "static") ?? []
  }, [templates])

  const staticTemplatesByCategory = useMemo(() => {
    return staticTemplates.reduce(
      (acc, template) => {
        const catId = template.categoryId || "uncategorized"
        if (!acc[catId]) {
          acc[catId] = []
        }
        acc[catId].push(template as ElementWithCategory)
        return acc
      },
      {} as Record<string, ElementWithCategory[]>
    )
  }, [staticTemplates])

  return (
    <div className="flex h-full w-64 flex-col overflow-hidden border-r bg-card">
      <div className="border-b p-4">
        <h3 className="font-semibold">Element Library</h3>
        <p className="text-xs text-muted-foreground">
          Select an element, then click on the grid to place it
        </p>
      </div>

      {selectedTemplateId && (
        <div className="border-b p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onSelectTemplate(null)}
          >
            Cancel Placement
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {categories?.map((category) => {
              const categoryTemplates = staticTemplatesByCategory[category.id]
              if (!categoryTemplates || categoryTemplates.length === 0)
                return null

              return (
                <div key={category.id} className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {category.name}
                  </h4>
                  <div className="space-y-1">
                    {categoryTemplates.map((template) => (
                      <TemplateButton
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplateId === template.id}
                        onClick={() =>
                          onSelectTemplate(
                            selectedTemplateId === template.id
                              ? null
                              : template.id
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Uncategorized templates */}
            {staticTemplatesByCategory["uncategorized"]?.length ? (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Other
                </h4>
                <div className="space-y-1">
                  {staticTemplatesByCategory["uncategorized"]!.map(
                    (template) => (
                      <TemplateButton
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplateId === template.id}
                        onClick={() =>
                          onSelectTemplate(
                            selectedTemplateId === template.id
                              ? null
                              : template.id
                          )
                        }
                      />
                    )
                  )}
                </div>
              </div>
            ) : null}

            {staticTemplates.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No static elements available. Create elements in the Elements
                page first.
              </p>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Only static elements can be placed on the warehouse grid. Mobile
          elements are spawned during simulations.
        </p>
      </div>
    </div>
  )
}

interface TemplateButtonProps {
  template: ElementWithCategory
  isSelected: boolean
  onClick: () => void
}

function TemplateButton({
  template,
  isSelected,
  onClick,
}: TemplateButtonProps) {
  const Icon = iconMap[template.icon] || Square
  const bgColor = template.category?.bgColor || "#6b7280"

  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      className={cn(
        "h-auto w-full justify-start gap-3 p-2",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onClick}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded"
        style={{ backgroundColor: isSelected ? undefined : bgColor }}
      >
        <Icon className={cn("h-4 w-4", isSelected ? "" : "text-white")} />
      </div>
      <div className="text-left">
        <p className="text-sm font-medium">{template.name}</p>
        <p
          className={cn(
            "text-xs",
            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {template.defaultWidth}×{template.defaultHeight}px
        </p>
      </div>
    </Button>
  )
}
