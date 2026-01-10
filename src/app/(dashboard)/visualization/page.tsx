"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Play, Pause, RotateCcw, Warehouse, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VisualizationCanvas } from "@/components/visualization/visualization-canvas"
import { ScenarioVisualizationCanvas } from "@/components/visualization/scenario-visualization-canvas"
import { useVisualization } from "@/hooks/use-visualization"
import { useScenarioVisualization } from "@/hooks/use-scenario-visualization"
import { api } from "@/trpc/react"
import type { Scenario } from "@/lib/scenario-engine/types"

export default function VisualizationPage() {
  const searchParams = useSearchParams()
  const scenarioIdFromUrl = searchParams.get("scenario")

  // Determine initial mode based on URL
  const initialMode = scenarioIdFromUrl ? "scenarios" : "flows"

  const [mode, setMode] = useState<"flows" | "scenarios">(initialMode)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    scenarioIdFromUrl ?? ""
  )

  // Queries
  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()

  const { data: placedElements, isLoading: elementsLoading } =
    api.placedElement.getByWarehouse.useQuery(
      { warehouseId: selectedWarehouseId },
      { enabled: !!selectedWarehouseId && mode === "flows" }
    )

  const { data: flows, isLoading: flowsLoading } =
    api.flow.getByWarehouse.useQuery(
      { warehouseId: selectedWarehouseId },
      { enabled: !!selectedWarehouseId && mode === "flows" }
    )

  const { data: templates } = api.element.getAll.useQuery()

  const { data: scenarios, isLoading: scenariosLoading } =
    api.scenario.getAll.useQuery(undefined, { enabled: mode === "scenarios" })

  const { data: selectedScenarioData, isLoading: scenarioLoading } =
    api.scenario.getById.useQuery(
      { id: selectedScenarioId },
      { enabled: !!selectedScenarioId && mode === "scenarios" }
    )

  // Get placed elements for selected scenario's warehouse
  const { data: scenarioPlacedElements, isLoading: scenarioElementsLoading } =
    api.placedElement.getByWarehouse.useQuery(
      { warehouseId: selectedScenarioData?.warehouseId ?? "" },
      { enabled: !!selectedScenarioData?.warehouseId && mode === "scenarios" }
    )

  // Build full Scenario object for the engine
  const fullScenario: Scenario | null = selectedScenarioData
    ? {
        id: selectedScenarioData.id,
        name: selectedScenarioData.name,
        warehouseId: selectedScenarioData.warehouseId,
        description: selectedScenarioData.description ?? undefined,
        flows: selectedScenarioData.definition?.flows ?? [],
        settings: selectedScenarioData.definition?.settings ?? {
          speedMultiplier: 1,
        },
      }
    : null

  // Legacy flow visualization
  const selectedWarehouse = warehouses?.find(
    (w) => w.id === selectedWarehouseId
  )
  const activeFlows = flows?.filter((f) => f.isActive) ?? []
  const flowVisualization = useVisualization(activeFlows, placedElements)

  // Scenario visualization
  const scenarioVisualization = useScenarioVisualization(
    fullScenario,
    scenarioPlacedElements,
    templates
  )

  // Get the selected scenario's warehouse
  const scenarioWarehouse = warehouses?.find(
    (w) => w.id === selectedScenarioData?.warehouseId
  )

  // Group scenarios by warehouse for display
  const scenariosByWarehouse = new Map<string, typeof scenarios>()
  if (scenarios && warehouses) {
    for (const warehouse of warehouses) {
      const warehouseScenarios = scenarios.filter(
        (s) => s.warehouseId === warehouse.id && s.isActive
      )
      if (warehouseScenarios.length > 0) {
        scenariosByWarehouse.set(warehouse.id, warehouseScenarios)
      }
    }
  }

  const isFlowsLoading = elementsLoading || flowsLoading
  const isScenariosLoading =
    scenariosLoading || scenarioLoading || scenarioElementsLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visualization</h1>
          <p className="text-muted-foreground">
            Simulate goods movement through your warehouses
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Mode Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visualization Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as "flows" | "scenarios")}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="flows" className="flex-1">
                    Legacy Flows
                  </TabsTrigger>
                  <TabsTrigger value="scenarios" className="flex-1">
                    Scenarios
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Source Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {mode === "flows" ? "Select Warehouse" : "Select Scenario"}
              </CardTitle>
              <CardDescription>
                {mode === "flows"
                  ? "Choose a warehouse to visualize its flows"
                  : "Choose a scenario to run the simulation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "flows" ? (
                warehousesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedWarehouseId}
                    onValueChange={setSelectedWarehouseId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : scenariosLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : scenarios?.filter((s) => s.isActive).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active scenarios. Create one in the Scenarios page.
                </p>
              ) : (
                <Select
                  value={selectedScenarioId}
                  onValueChange={setSelectedScenarioId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(scenariosByWarehouse.entries()).map(
                      ([warehouseId, warehouseScenarios]) => {
                        const warehouse = warehouses?.find(
                          (w) => w.id === warehouseId
                        )
                        return (
                          <div key={warehouseId}>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              {warehouse?.name}
                            </div>
                            {warehouseScenarios?.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </div>
                        )
                      }
                    )}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Simulation Controls */}
          {((mode === "flows" && selectedWarehouseId) ||
            (mode === "scenarios" && selectedScenarioId)) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Simulation Controls</CardTitle>
                <CardDescription>
                  {mode === "flows" ? (
                    <>
                      {activeFlows.length} active flow
                      {activeFlows.length !== 1 ? "s" : ""}
                    </>
                  ) : (
                    <>
                      {fullScenario?.flows.filter((f) => f.isActive).length ??
                        0}{" "}
                      active flows
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === "flows" ? (
                  // Legacy flow controls
                  <>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={
                          flowVisualization.state.isRunning
                            ? "secondary"
                            : "default"
                        }
                        onClick={
                          flowVisualization.state.isRunning
                            ? flowVisualization.stop
                            : flowVisualization.start
                        }
                        disabled={activeFlows.length === 0}
                        className="flex-1"
                      >
                        {flowVisualization.state.isRunning ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={flowVisualization.reset}
                        title="Reset"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Speed</span>
                        <span>{flowVisualization.speed.toFixed(1)}x</span>
                      </div>
                      <Slider
                        value={[flowVisualization.speed]}
                        onValueChange={(values) => {
                          const value = values[0]
                          if (value !== undefined)
                            flowVisualization.setSpeed(value)
                        }}
                        min={0.5}
                        max={3}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {activeFlows.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        No active flows. Create flows in the Flows page.
                      </p>
                    )}
                  </>
                ) : (
                  // Scenario controls
                  <>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={
                          scenarioVisualization.state.isRunning
                            ? "secondary"
                            : "default"
                        }
                        onClick={
                          scenarioVisualization.state.isRunning
                            ? scenarioVisualization.stop
                            : scenarioVisualization.start
                        }
                        disabled={!fullScenario}
                        className="flex-1"
                      >
                        {scenarioVisualization.state.isRunning ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={scenarioVisualization.reset}
                        title="Reset"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Speed</span>
                        <span>{scenarioVisualization.speed.toFixed(1)}x</span>
                      </div>
                      <Slider
                        value={[scenarioVisualization.speed]}
                        onValueChange={(values) => {
                          const value = values[0]
                          if (value !== undefined)
                            scenarioVisualization.setSpeed(value)
                        }}
                        min={0.5}
                        max={3}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Simulation time */}
                    {scenarioVisualization.state.isRunning && (
                      <div className="text-xs text-muted-foreground text-center">
                        Time:{" "}
                        {(
                          scenarioVisualization.state.simulationTime / 1000
                        ).toFixed(1)}
                        s
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Flows/Pallets Legend */}
          {mode === "flows" &&
            selectedWarehouseId &&
            activeFlows.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Active Flows</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeFlows.map((flow) => (
                      <div key={flow.id} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: flow.color }}
                        />
                        <span className="text-sm">{flow.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {flow.elementSequence.length} stops
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {mode === "scenarios" && fullScenario && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Scenario Flows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fullScenario.flows.map((flow) => (
                    <div key={flow.id} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: flow.color }}
                      />
                      <span className="text-sm">{flow.name}</span>
                      <Badge
                        variant={flow.isActive ? "default" : "secondary"}
                        className="ml-auto text-xs"
                      >
                        {flow.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Pallet count */}
                {scenarioVisualization.state.pallets.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      Active pallets:{" "}
                      {scenarioVisualization.state.pallets.length}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Visualization Canvas */}
        <Card className="min-h-[600px]">
          <CardContent className="p-0 h-full">
            {mode === "flows" ? (
              // Legacy flow visualization
              !selectedWarehouseId ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Warehouse className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    Select a Warehouse
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                    Choose a warehouse from the dropdown to start the
                    visualization.
                  </p>
                </div>
              ) : isFlowsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-96 w-full m-4" />
                </div>
              ) : (
                <VisualizationCanvas
                  warehouse={selectedWarehouse}
                  placedElements={placedElements ?? []}
                  templates={templates ?? []}
                  flows={activeFlows}
                  simulationState={flowVisualization.state}
                />
              )
            ) : // Scenario visualization
            !selectedScenarioId ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Layers className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  Select a Scenario
                </h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  Choose a scenario from the dropdown to run the simulation.
                </p>
              </div>
            ) : isScenariosLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-96 w-full m-4" />
              </div>
            ) : (
              <ScenarioVisualizationCanvas
                warehouse={scenarioWarehouse}
                placedElements={scenarioPlacedElements ?? []}
                templates={templates ?? []}
                scenario={fullScenario}
                simulationState={scenarioVisualization.state}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
