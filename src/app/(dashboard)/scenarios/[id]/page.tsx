"use client"

import { useState, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Play, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"
import type { ScenarioDefinition } from "@/lib/scenario-engine/types"

// Example scenario for new scenarios
const exampleDefinition: ScenarioDefinition = {
  flows: [
    {
      id: "flow-1",
      name: "Example Flow",
      color: "#3b82f6",
      isActive: true,
      entryNode: "start",
      nodes: [
        {
          type: "location",
          id: "start",
          target: { type: "fixed", elementId: "REPLACE_WITH_ELEMENT_ID" },
          action: { dwell: { type: "fixed", duration: 2000 } },
        },
        {
          type: "location",
          id: "end",
          target: { type: "fixed", elementId: "REPLACE_WITH_ELEMENT_ID" },
          action: { dwell: { type: "fixed", duration: 1000 } },
        },
        { type: "exit", id: "done" },
      ],
      edges: [
        { id: "e1", from: "start", to: "end" },
        { id: "e2", from: "end", to: "done" },
      ],
      spawning: { mode: "interval", duration: 3000 },
    },
  ],
  settings: {
    speedMultiplier: 1,
  },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ScenarioEditorPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === "new"

  // Queries
  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()

  const { data: scenario, isLoading: scenarioLoading } =
    api.scenario.getById.useQuery({ id }, { enabled: !isNew })

  // Compute initial values from scenario data
  const initialValues = useMemo(() => {
    if (scenario) {
      return {
        name: scenario.name,
        description: scenario.description ?? "",
        warehouseId: scenario.warehouseId,
        definitionJson: JSON.stringify(scenario.definition, null, 2),
      }
    }
    return {
      name: "",
      description: "",
      warehouseId: "",
      definitionJson: JSON.stringify(exampleDefinition, null, 2),
    }
  }, [scenario])

  // Form state - initialized from scenario or defaults
  const [name, setName] = useState(initialValues.name)
  const [description, setDescription] = useState(initialValues.description)
  const [warehouseId, setWarehouseId] = useState(initialValues.warehouseId)
  const [definitionJson, setDefinitionJson] = useState(
    initialValues.definitionJson
  )
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Track if form has been initialized from loaded data
  const [formKey, setFormKey] = useState(0)

  // Reset form when scenario data changes (after initial load)
  if (scenario && formKey === 0 && name === "" && initialValues.name !== "") {
    setName(initialValues.name)
    setDescription(initialValues.description)
    setWarehouseId(initialValues.warehouseId)
    setDefinitionJson(initialValues.definitionJson)
    setFormKey(1)
  }

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
      utils.scenario.getById.invalidate({ id })
    },
  })

  // Validate JSON
  const validateJson = (json: string): ScenarioDefinition | null => {
    try {
      const parsed = JSON.parse(json)
      // Basic structure validation
      if (!parsed.flows || !Array.isArray(parsed.flows)) {
        setJsonError("Definition must have a 'flows' array")
        return null
      }
      if (
        !parsed.settings ||
        typeof parsed.settings.speedMultiplier !== "number"
      ) {
        setJsonError("Definition must have 'settings' with 'speedMultiplier'")
        return null
      }
      setJsonError(null)
      return parsed as ScenarioDefinition
    } catch {
      setJsonError("Invalid JSON syntax")
      return null
    }
  }

  const handleSave = () => {
    const definition = validateJson(definitionJson)
    if (!definition) return

    if (!name.trim()) {
      alert("Please enter a name")
      return
    }

    if (!warehouseId) {
      alert("Please select a warehouse")
      return
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
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        definition,
      })
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/scenarios">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "Create Scenario" : "Edit Scenario"}
            </h1>
            <p className="text-muted-foreground">
              {isNew
                ? "Define a new flow simulation scenario"
                : `Editing: ${scenario?.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="outline" asChild>
              <Link href={`/visualization?scenario=${id}`}>
                <Play className="mr-2 h-4 w-4" />
                Visualize
              </Link>
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || !!jsonError}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Basic scenario information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Scenario name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Warehouse</label>
              <Select
                value={warehouseId}
                onValueChange={setWarehouseId}
                disabled={!isNew}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isNew && (
                <p className="text-xs text-muted-foreground">
                  Warehouse cannot be changed after creation
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* JSON Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Scenario Definition (JSON)</CardTitle>
            <CardDescription>
              Define flows, nodes, edges, and spawning configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jsonError && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {jsonError}
              </div>
            )}
            <Textarea
              value={definitionJson}
              onChange={(e) => {
                setDefinitionJson(e.target.value)
                validateJson(e.target.value)
              }}
              className="font-mono text-sm min-h-[500px]"
              placeholder="Enter scenario definition JSON..."
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
