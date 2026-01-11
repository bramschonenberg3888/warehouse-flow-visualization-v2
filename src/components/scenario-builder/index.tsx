"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Play, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"
import { FlowListSidebar } from "./flow-list-sidebar"
import { FlowBuilderPanel } from "./flow-builder-panel"
import type { UIFlow } from "./types"
import {
  flowDefinitionToUIFlow,
  uiFlowToFlowDefinition,
  createDefaultFlow,
  validateFlow,
} from "./types"
import type { ScenarioDefinition } from "@/lib/scenario-engine/types"

interface ScenarioBuilderProps {
  scenarioId: string
}

export function ScenarioBuilder({ scenarioId }: ScenarioBuilderProps) {
  const router = useRouter()
  const isNew = scenarioId === "new"

  // Queries
  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()

  const { data: scenario, isLoading: scenarioLoading } =
    api.scenario.getById.useQuery({ id: scenarioId }, { enabled: !isNew })

  // Get placed elements, categories, and existing flows for the selected warehouse
  const [warehouseId, setWarehouseId] = useState("")
  const { data: placedElements } = api.placedElement.getByWarehouse.useQuery(
    { warehouseId },
    { enabled: !!warehouseId }
  )
  const { data: categories } = api.category.getAll.useQuery()
  const { data: existingFlows } = api.flow.getByWarehouse.useQuery(
    { warehouseId },
    { enabled: !!warehouseId }
  )

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [flows, setFlows] = useState<UIFlow[]>([])
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [activeTab, setActiveTab] = useState("flows")

  // JSON editor state
  const [jsonValue, setJsonValue] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Track initialization
  const [initialized, setInitialized] = useState(false)

  // Initialize from scenario data when loaded
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (scenario && !initialized) {
      setName(scenario.name)
      setDescription(scenario.description ?? "")
      setWarehouseId(scenario.warehouseId)
      setSpeedMultiplier(scenario.definition.settings.speedMultiplier)

      // Convert flows to UI format
      const uiFlows = scenario.definition.flows.map(flowDefinitionToUIFlow)
      setFlows(uiFlows)

      // Select first flow
      const firstFlow = uiFlows[0]
      if (firstFlow) {
        setSelectedFlowId(firstFlow.id)
      }

      // Set JSON
      setJsonValue(JSON.stringify(scenario.definition, null, 2))

      setInitialized(true)
    }
  }, [scenario, initialized])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Mutations
  const utils = api.useUtils()

  const createMutation = api.scenario.create.useMutation({
    onSuccess: (data) => {
      utils.scenario.getAll.invalidate()
      if (data) {
        router.push(`/scenarios/${data.id}`)
      }
    },
  })

  const updateMutation = api.scenario.update.useMutation({
    onSuccess: () => {
      utils.scenario.getAll.invalidate()
      utils.scenario.getById.invalidate({ id: scenarioId })
    },
  })

  // Build current definition from UI state
  const currentDefinition = useMemo((): ScenarioDefinition => {
    return {
      flows: flows.map(uiFlowToFlowDefinition),
      settings: {
        speedMultiplier,
      },
    }
  }, [flows, speedMultiplier])

  // Sync JSON when UI changes (only in flows tab)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeTab === "flows" && initialized) {
      setJsonValue(JSON.stringify(currentDefinition, null, 2))
      setJsonError(null)
    }
  }, [currentDefinition, activeTab, initialized])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Parse JSON when switching from JSON tab
  const handleTabChange = (tab: string) => {
    if (activeTab === "json" && tab !== "json") {
      // Try to parse JSON and update UI state
      try {
        const parsed = JSON.parse(jsonValue) as ScenarioDefinition
        const uiFlows = parsed.flows.map(flowDefinitionToUIFlow)
        setFlows(uiFlows)
        setSpeedMultiplier(parsed.settings.speedMultiplier)
        const firstFlow = uiFlows[0]
        if (firstFlow && !uiFlows.find((f) => f.id === selectedFlowId)) {
          setSelectedFlowId(firstFlow.id)
        }
        setJsonError(null)
      } catch {
        // Keep current state if JSON is invalid
      }
    }
    setActiveTab(tab)
  }

  // Validate JSON
  const validateJson = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json)
      if (!parsed.flows || !Array.isArray(parsed.flows)) {
        setJsonError("Definition must have a 'flows' array")
        return false
      }
      if (
        !parsed.settings ||
        typeof parsed.settings.speedMultiplier !== "number"
      ) {
        setJsonError("Definition must have 'settings' with 'speedMultiplier'")
        return false
      }
      setJsonError(null)
      return true
    } catch {
      setJsonError("Invalid JSON syntax")
      return false
    }
  }

  // Save handler
  const handleSave = () => {
    // Validate
    if (!name.trim()) {
      alert("Please enter a name")
      return
    }
    if (!warehouseId) {
      alert("Please select a warehouse")
      return
    }

    // Get definition from appropriate source
    let definition: ScenarioDefinition
    if (activeTab === "json") {
      if (!validateJson(jsonValue)) return
      definition = JSON.parse(jsonValue)
    } else {
      definition = currentDefinition
    }

    // Validate flows
    for (const flow of flows) {
      const errors = validateFlow(flow)
      if (errors.length > 0) {
        alert(`Flow "${flow.name}" has errors:\n${errors.join("\n")}`)
        return
      }
    }

    if (isNew) {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        warehouseId,
        definition,
      })
    } else {
      updateMutation.mutate({
        id: scenarioId,
        name: name.trim(),
        description: description.trim() || undefined,
        definition,
      })
    }
  }

  // Flow handlers
  const handleAddFlow = (flow: UIFlow) => {
    setFlows([...flows, flow])
  }

  const handleUpdateFlow = (flowId: string, updates: Partial<UIFlow>) => {
    setFlows(flows.map((f) => (f.id === flowId ? { ...f, ...updates } : f)))
  }

  const handleDeleteFlow = (flowId: string) => {
    const remainingFlows = flows.filter((f) => f.id !== flowId)
    setFlows(remainingFlows)
    if (selectedFlowId === flowId) {
      const firstRemaining = remainingFlows[0]
      setSelectedFlowId(firstRemaining ? firstRemaining.id : null)
    }
  }

  const handleDuplicateFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId)
    if (!flow) return
    const newFlow = createDefaultFlow(`${flow.name} (Copy)`)
    newFlow.color = flow.color
    newFlow.steps = JSON.parse(JSON.stringify(flow.steps))
    newFlow.spawning = { ...flow.spawning }
    setFlows([...flows, newFlow])
  }

  const selectedFlow = flows.find((f) => f.id === selectedFlowId) ?? null

  const handleFlowChange = (updatedFlow: UIFlow) => {
    setFlows(flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)))
  }

  const isLoading = warehousesLoading || (!isNew && scenarioLoading)
  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/scenarios">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold h-9 w-64"
              placeholder="Scenario name"
            />
            {isNew && (
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select warehouse" />
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="outline" asChild>
              <Link href={`/visualization?scenario=${scenarioId}`}>
                <Play className="mr-2 h-4 w-4" />
                Visualize
              </Link>
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || !!jsonError}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList>
            <TabsTrigger value="flows">Flows</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
        </div>

        {/* Flows Tab */}
        <TabsContent
          value="flows"
          className="flex-1 m-0 data-[state=active]:flex"
        >
          <FlowListSidebar
            flows={flows}
            selectedFlowId={selectedFlowId}
            onSelectFlow={setSelectedFlowId}
            onAddFlow={handleAddFlow}
            onUpdateFlow={handleUpdateFlow}
            onDeleteFlow={handleDeleteFlow}
            onDuplicateFlow={handleDuplicateFlow}
            existingFlows={existingFlows ?? []}
            placedElements={placedElements ?? []}
          />
          <div className="flex-1">
            <FlowBuilderPanel
              flow={selectedFlow}
              onFlowChange={handleFlowChange}
              placedElements={placedElements ?? []}
              categories={categories ?? []}
            />
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 m-0 p-6">
          <div className="max-w-xl space-y-6">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this scenario..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Simulation Speed</Label>
                <span className="text-sm text-muted-foreground">
                  {speedMultiplier}x
                </span>
              </div>
              <Slider
                value={[speedMultiplier]}
                onValueChange={(values) =>
                  values[0] !== undefined && setSpeedMultiplier(values[0])
                }
                min={0.1}
                max={10}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                Controls how fast the simulation runs (0.1x to 10x)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Input
                value={
                  warehouses?.find((w) => w.id === warehouseId)?.name ?? ""
                }
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Warehouse cannot be changed after creation
              </p>
            </div>
          </div>
        </TabsContent>

        {/* JSON Tab */}
        <TabsContent value="json" className="flex-1 m-0 p-4">
          <div className="h-full flex flex-col">
            {jsonError && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {jsonError}
              </div>
            )}
            <Textarea
              value={jsonValue}
              onChange={(e) => {
                setJsonValue(e.target.value)
                validateJson(e.target.value)
              }}
              className="flex-1 font-mono text-sm resize-none"
              placeholder="Scenario definition JSON..."
            />
            <div className="mt-4 text-xs text-muted-foreground">
              <p className="font-medium mb-2">Quick Reference:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <code>flows[]</code> - Array of flow definitions
                </li>
                <li>
                  <code>nodes[]</code> - Location, Decision, or Exit nodes
                </li>
                <li>
                  <code>edges[]</code> - Connections between nodes
                </li>
                <li>
                  <code>spawning</code> - interval, batch, or manual mode
                </li>
                <li>
                  <code>settings.speedMultiplier</code> - Simulation speed
                  (0.1-10)
                </li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
