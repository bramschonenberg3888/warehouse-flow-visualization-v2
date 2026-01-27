"use client"

import { Suspense, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Play, Pause, RotateCcw, Layers } from "lucide-react"
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
import { PathVisualizationCanvas } from "@/components/visualization/path-visualization-canvas"
import { usePathVisualization } from "@/hooks/use-path-visualization"
import { api } from "@/trpc/react"

function VisualizationContent() {
  const searchParams = useSearchParams()
  const scenarioIdFromUrl = searchParams.get("scenario")

  // Use URL param if present, otherwise use local selection state
  const [localSelectedId, setLocalSelectedId] = useState<string>("")
  const selectedScenarioId = scenarioIdFromUrl ?? localSelectedId

  // Handler that updates local state (used when user manually selects)
  const setSelectedScenarioId = (id: string) => {
    setLocalSelectedId(id)
  }

  // Queries
  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()

  const { data: scenarios, isLoading: scenariosLoading } =
    api.scenario.getAll.useQuery()

  const { data: selectedScenario, isLoading: scenarioLoading } =
    api.scenario.getById.useQuery(
      { id: selectedScenarioId },
      { enabled: selectedScenarioId.length > 0 }
    )

  const { data: paths, isLoading: pathsLoading } =
    api.path.getByScenario.useQuery(
      { scenarioId: selectedScenarioId },
      { enabled: selectedScenarioId.length > 0 }
    )

  const { data: placedElements, isLoading: elementsLoading } =
    api.placedElement.getByWarehouse.useQuery(
      { warehouseId: selectedScenario?.warehouseId ?? "" },
      { enabled: !!selectedScenario?.warehouseId }
    )

  const { data: templates } = api.element.getAll.useQuery()

  // Get warehouse for dimensions
  const selectedWarehouse = warehouses?.find(
    (w) => w.id === selectedScenario?.warehouseId
  )

  // Memoize data to prevent unnecessary engine rebuilds
  const scenarioForHook = useMemo(
    () =>
      selectedScenario
        ? {
            ...selectedScenario,
            speedMultiplier: selectedScenario.speedMultiplier ?? 1.0,
            duration: selectedScenario.duration ?? null,
          }
        : null,
    [selectedScenario]
  )

  const stablePaths = useMemo(() => paths ?? [], [paths])
  const stableElements = useMemo(() => placedElements ?? [], [placedElements])
  const stableTemplates = useMemo(() => templates ?? [], [templates])

  // Path visualization
  const { state, controls, speed } = usePathVisualization(
    scenarioForHook,
    stablePaths,
    stableElements,
    stableTemplates
  )

  // Group scenarios by warehouse for display
  const scenariosByWarehouse = new Map<string, NonNullable<typeof scenarios>>()
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

  const isLoading =
    scenariosLoading || scenarioLoading || pathsLoading || elementsLoading

  const activePaths = paths?.filter((p) => p.isActive) ?? []
  // Paths need at least 2 stops to be valid for simulation
  const validPaths = activePaths.filter((p) => p.stops.length >= 2)
  const incompletePaths = activePaths.filter((p) => p.stops.length < 2)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visualize</h1>
          <p className="text-muted-foreground">
            Watch animated goods movement through your warehouse layouts based
            on your configured scenarios and paths
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Scenario Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Scenario</CardTitle>
              <CardDescription>
                Choose a scenario to run the simulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scenariosLoading || warehousesLoading ? (
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
                            {warehouseScenarios.map((s) => (
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
          {selectedScenarioId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Simulation Controls</CardTitle>
                <CardDescription>
                  {validPaths.length} runnable path
                  {validPaths.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={state.isRunning ? "secondary" : "default"}
                    onClick={state.isRunning ? controls.stop : controls.start}
                    disabled={validPaths.length === 0}
                    className="flex-1"
                  >
                    {state.isRunning ? (
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
                    onClick={controls.reset}
                    title="Reset"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Speed</span>
                    <span>{speed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[speed]}
                    onValueChange={(values) => {
                      const value = values[0]
                      if (value !== undefined) controls.setSpeed(value)
                    }}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Simulation time */}
                {state.isRunning && (
                  <div className="text-xs text-muted-foreground text-center">
                    Time: {(state.simulationTime / 1000).toFixed(1)}s
                  </div>
                )}

                {/* Feedback messages */}
                {activePaths.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    No paths defined. Add paths in the scenario editor.
                  </p>
                )}
                {incompletePaths.length > 0 && (
                  <p className="text-xs text-amber-600 text-center">
                    {incompletePaths.length} path
                    {incompletePaths.length !== 1 ? "s need" : " needs"} at
                    least 2 stops to run.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Paths Legend */}
          {selectedScenarioId && activePaths.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Paths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {paths?.map((path) => (
                    <div key={path.id} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: path.color }}
                      />
                      <span className="text-sm">{path.name}</span>
                      <Badge
                        variant={path.isActive ? "default" : "secondary"}
                        className="ml-auto text-xs"
                      >
                        {path.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Pallet count */}
                {state.pallets.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      Active pallets: {state.pallets.length}
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
            {!selectedScenarioId ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Layers className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  Select a Scenario
                </h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  Choose a scenario from the dropdown to run the simulation.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-96 w-full m-4" />
              </div>
            ) : (
              <PathVisualizationCanvas
                placedElements={placedElements ?? []}
                templates={templates ?? []}
                pallets={state.pallets}
                gridColumns={selectedWarehouse?.gridColumns ?? 20}
                gridRows={selectedWarehouse?.gridRows ?? 15}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VisualizationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <Skeleton className="h-12 w-48" />
        </div>
      }
    >
      <VisualizationContent />
    </Suspense>
  )
}
