"use client"

import Link from "next/link"
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Layers,
  Warehouse,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
            Create and manage flow simulation scenarios
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : totalScenarios === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No scenarios yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Create your first scenario to simulate goods movement through your
              warehouse with multiple flows, branching logic, and multi-pallet
              spawning.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/scenarios/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Scenario
              </Link>
            </Button>
          </CardContent>
        </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{scenario.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/scenarios/${scenario.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/visualization?scenario=${scenario.id}`}>
                  <Play className="mr-2 h-4 w-4" />
                  Visualize
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <Badge
            variant={scenario.isActive ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => toggleActiveMutation.mutate({ id: scenario.id })}
          >
            {scenario.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
