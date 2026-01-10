"use client"

import { useState } from "react"
import { Play, Pause, RotateCcw, Warehouse } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
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
import { VisualizationCanvas } from "@/components/visualization/visualization-canvas"
import { useVisualization } from "@/hooks/use-visualization"
import { api } from "@/trpc/react"

export default function VisualizationPage() {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")

  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()

  const { data: placedElements, isLoading: elementsLoading } =
    api.placedElement.getByWarehouse.useQuery(
      { warehouseId: selectedWarehouseId },
      { enabled: !!selectedWarehouseId }
    )

  const { data: flows, isLoading: flowsLoading } =
    api.flow.getByWarehouse.useQuery(
      { warehouseId: selectedWarehouseId },
      { enabled: !!selectedWarehouseId }
    )

  const { data: templates } = api.element.getAll.useQuery()

  const selectedWarehouse = warehouses?.find(
    (w) => w.id === selectedWarehouseId
  )
  const activeFlows = flows?.filter((f) => f.isActive) ?? []

  const visualization = useVisualization(activeFlows, placedElements)

  const isLoading = elementsLoading || flowsLoading

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
          {/* Warehouse Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Warehouse</CardTitle>
              <CardDescription>Choose a warehouse to visualize</CardDescription>
            </CardHeader>
            <CardContent>
              {warehousesLoading ? (
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
              )}
            </CardContent>
          </Card>

          {/* Simulation Controls */}
          {selectedWarehouseId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Simulation Controls</CardTitle>
                <CardDescription>
                  {activeFlows.length} active flow
                  {activeFlows.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={
                      visualization.state.isRunning ? "secondary" : "default"
                    }
                    onClick={
                      visualization.state.isRunning
                        ? visualization.stop
                        : visualization.start
                    }
                    disabled={activeFlows.length === 0}
                    className="flex-1"
                  >
                    {visualization.state.isRunning ? (
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
                    onClick={visualization.reset}
                    title="Reset"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Speed</span>
                    <span>{visualization.speed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[visualization.speed]}
                    onValueChange={(values) => {
                      const value = values[0]
                      if (value !== undefined) visualization.setSpeed(value)
                    }}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {activeFlows.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    No active flows. Create flows in the Flows page and mark
                    them as active.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Flow Legend */}
          {selectedWarehouseId && activeFlows.length > 0 && (
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
        </div>

        {/* Visualization Canvas */}
        <Card className="min-h-[600px]">
          <CardContent className="p-0 h-full">
            {!selectedWarehouseId ? (
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
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-96 w-full m-4" />
              </div>
            ) : (
              <VisualizationCanvas
                warehouse={selectedWarehouse}
                placedElements={placedElements ?? []}
                templates={templates ?? []}
                flows={activeFlows}
                simulationState={visualization.state}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
