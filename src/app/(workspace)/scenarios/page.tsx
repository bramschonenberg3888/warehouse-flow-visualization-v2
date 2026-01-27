"use client"

import Link from "next/link"
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Layers,
  Warehouse,
  Play,
  Route,
  GitBranch,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ScenarioCardSkeleton,
  CardGridSkeleton,
} from "@/components/ui/skeletons"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/trpc/react"
import type {
  Scenario as ScenarioType,
  Warehouse as WarehouseType,
} from "@/server/db/schema"

export default function ScenariosPage() {
  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()
  const { data: scenarios, isLoading: scenariosLoading } =
    api.scenario.getAll.useQuery()

  const isLoading = warehousesLoading || scenariosLoading

  // Create warehouse lookup
  const warehouseMap = new Map<string, WarehouseType>()
  if (warehouses) {
    for (const warehouse of warehouses) {
      warehouseMap.set(warehouse.id, warehouse)
    }
  }

  // Group scenarios by warehouse
  const scenariosByWarehouse = new Map<
    string,
    { warehouse: WarehouseType; scenarios: ScenarioType[] }
  >()

  if (scenarios && warehouses) {
    // Initialize with all warehouses
    for (const warehouse of warehouses) {
      scenariosByWarehouse.set(warehouse.id, { warehouse, scenarios: [] })
    }

    // Add scenarios to their warehouses
    for (const scenario of scenarios) {
      const group = scenariosByWarehouse.get(scenario.warehouseId)
      if (group) {
        group.scenarios.push(scenario)
      }
    }
  }

  const totalScenarios = scenarios?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scenarios</h1>
          <p className="text-muted-foreground">
            Define movement patterns, spawning rules, and path configurations
            for visualizing goods flow through your warehouses
          </p>
        </div>
        <Button asChild>
          <Link href="/scenarios/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Scenario
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={3} CardSkeleton={ScenarioCardSkeleton} />
      ) : totalScenarios === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Layers className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-6 text-lg font-semibold">No scenarios yet</h3>
          <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
            Create your first scenario to define movement paths and visualize
            goods flow through your warehouse.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/scenarios/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Scenario
            </Link>
          </Button>
          <div className="mt-8 flex items-center gap-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              <span>Define paths</span>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span>Multiple flows</span>
            </div>
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              <span>Animate movement</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(scenariosByWarehouse.values())
            .filter(({ scenarios }) => scenarios.length > 0)
            .map(({ warehouse, scenarios: warehouseScenarios }) => (
              <div key={warehouse.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{warehouse.name}</h2>
                  <Badge variant="secondary">
                    {warehouseScenarios.length} scenarios
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {warehouseScenarios.map((scenario) => (
                    <ScenarioCard key={scenario.id} scenario={scenario} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

interface ScenarioCardProps {
  scenario: ScenarioType
}

function ScenarioCard({ scenario }: ScenarioCardProps) {
  const utils = api.useUtils()

  const deleteMutation = api.scenario.delete.useMutation({
    onSuccess: () => {
      utils.scenario.getAll.invalidate()
    },
  })

  const duplicateMutation = api.scenario.duplicate.useMutation({
    onSuccess: () => {
      utils.scenario.getAll.invalidate()
    },
  })

  const toggleActiveMutation = api.scenario.toggleActive.useMutation({
    onSuccess: () => {
      utils.scenario.getAll.invalidate()
    },
  })

  const handleDelete = () => {
    if (confirm(`Delete scenario "${scenario.name}"?`)) {
      deleteMutation.mutate({ id: scenario.id })
    }
  }

  const handleDuplicate = () => {
    const newName = prompt("Name for the duplicate:", `${scenario.name} (copy)`)
    if (newName) {
      duplicateMutation.mutate({ id: scenario.id, newName })
    }
  }

  const flowCount = scenario.definition?.flows?.length ?? 0
  const activeFlowCount =
    scenario.definition?.flows?.filter((f) => f.isActive)?.length ?? 0

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{scenario.name}</CardTitle>
          </div>
          <Badge
            variant={scenario.isActive ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => toggleActiveMutation.mutate({ id: scenario.id })}
          >
            {scenario.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {scenario.description && (
          <CardDescription className="line-clamp-2">
            {scenario.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {flowCount} flows ({activeFlowCount} active)
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/scenarios/${scenario.id}`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDuplicate}
              disabled={duplicateMutation.isPending}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
