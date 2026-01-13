"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { api } from "@/trpc/react"
import { ScenarioEditor } from "@/components/scenario-editor"
import { Skeleton } from "@/components/ui/skeleton"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ScenarioEditorPage({ params }: PageProps) {
  const { id } = use(params)

  // Fetch scenario
  const { data: scenario, isLoading: scenarioLoading } =
    api.scenario.getById.useQuery({ id })

  // Fetch warehouse
  const { data: warehouse, isLoading: warehouseLoading } =
    api.warehouse.getById.useQuery(
      { id: scenario?.warehouseId ?? "" },
      { enabled: !!scenario?.warehouseId }
    )

  // Fetch paths for this scenario
  const { data: paths, isLoading: pathsLoading } =
    api.path.getByScenario.useQuery({ scenarioId: id }, { enabled: !!scenario })

  // Fetch placed elements for the warehouse
  const { data: placedElements, isLoading: elementsLoading } =
    api.placedElement.getByWarehouse.useQuery(
      { warehouseId: scenario?.warehouseId ?? "" },
      { enabled: !!scenario?.warehouseId }
    )

  // Fetch element templates
  const { data: templates, isLoading: templatesLoading } =
    api.element.getAll.useQuery()

  // Loading state
  const isLoading =
    scenarioLoading ||
    warehouseLoading ||
    pathsLoading ||
    elementsLoading ||
    templatesLoading

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b px-4 py-3 flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex flex-1">
          <div className="w-56 border-r p-4">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full mb-2" />
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!scenario || !warehouse) {
    notFound()
  }

  return (
    <ScenarioEditor
      scenario={scenario}
      warehouse={warehouse}
      initialPaths={paths ?? []}
      placedElements={placedElements ?? []}
      templates={templates ?? []}
    />
  )
}
