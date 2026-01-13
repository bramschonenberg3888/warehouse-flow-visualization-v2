"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Play, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { api } from "@/trpc/react"
import type {
  Path,
  PlacedElement,
  ElementTemplate,
  Scenario,
  Warehouse,
} from "@/server/db/schema"
import { PathList } from "./path-list"
import { PathCanvas } from "./path-canvas"
import { PathSettings } from "./path-settings"

interface ScenarioEditorProps {
  scenario: Scenario
  warehouse: Warehouse
  initialPaths: Path[]
  placedElements: PlacedElement[]
  templates: ElementTemplate[]
}

export function ScenarioEditor({
  scenario,
  warehouse,
  initialPaths,
  placedElements,
  templates,
}: ScenarioEditorProps) {
  const router = useRouter()
  const utils = api.useUtils()

  // Scenario state
  const [name, setName] = useState(scenario.name)
  const [speedMultiplier, setSpeedMultiplier] = useState(
    scenario.speedMultiplier
  )
  const [duration, setDuration] = useState<number | null>(scenario.duration)

  // Paths state
  const [paths, setPaths] = useState<Path[]>(initialPaths)
  const [selectedPathId, setSelectedPathId] = useState<string | null>(
    initialPaths[0]?.id ?? null
  )

  // Saving state
  const [isSaving, setIsSaving] = useState(false)

  // Get selected path
  const selectedPath = paths.find((p) => p.id === selectedPathId)

  // Mutations
  const updateScenario = api.scenario.update.useMutation()
  const createPath = api.path.create.useMutation()
  const updatePath = api.path.update.useMutation()
  const deletePath = api.path.delete.useMutation()

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      // Save scenario settings
      await updateScenario.mutateAsync({
        id: scenario.id,
        name,
        speedMultiplier,
        duration,
      })

      // Save all paths
      for (const path of paths) {
        if (path.id.startsWith("new-")) {
          // Create new path
          await createPath.mutateAsync({
            scenarioId: scenario.id,
            name: path.name,
            color: path.color,
            elementType: path.elementType,
            stops: path.stops,
            spawnInterval: path.spawnInterval,
            dwellTime: path.dwellTime,
            speed: path.speed,
            maxActive: path.maxActive,
            isActive: path.isActive,
          })
        } else {
          // Update existing path
          await updatePath.mutateAsync({
            id: path.id,
            name: path.name,
            color: path.color,
            elementType: path.elementType,
            stops: path.stops,
            spawnInterval: path.spawnInterval,
            dwellTime: path.dwellTime,
            speed: path.speed,
            maxActive: path.maxActive,
            isActive: path.isActive,
          })
        }
      }

      await utils.scenario.getById.invalidate({ id: scenario.id })
      await utils.path.getByScenario.invalidate({ scenarioId: scenario.id })
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }, [
    scenario.id,
    name,
    speedMultiplier,
    duration,
    paths,
    updateScenario,
    createPath,
    updatePath,
    utils,
    router,
  ])

  // Handle add path
  const handleAddPath = useCallback(() => {
    const newPath: Path = {
      id: `new-${Date.now()}`,
      scenarioId: scenario.id,
      name: `Path ${paths.length + 1}`,
      color: getNextColor(paths.length),
      elementType: "pallet",
      stops: [],
      spawnInterval: 5000,
      dwellTime: 2000,
      speed: 1.0,
      maxActive: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setPaths([...paths, newPath])
    setSelectedPathId(newPath.id)
  }, [scenario.id, paths])

  // Handle delete path
  const handleDeletePath = useCallback(
    async (pathId: string) => {
      // Delete from server if it exists
      if (!pathId.startsWith("new-")) {
        await deletePath.mutateAsync({ id: pathId })
      }

      // Remove from local state
      const newPaths = paths.filter((p) => p.id !== pathId)
      setPaths(newPaths)

      // Select another path
      if (selectedPathId === pathId) {
        setSelectedPathId(newPaths[0]?.id ?? null)
      }
    },
    [paths, selectedPathId, deletePath]
  )

  // Handle path update
  const handlePathUpdate = useCallback(
    (pathId: string, updates: Partial<Path>) => {
      setPaths(
        paths.map((p) =>
          p.id === pathId ? { ...p, ...updates, updatedAt: new Date() } : p
        )
      )
    },
    [paths]
  )

  // Handle stop click on canvas
  const handleStopClick = useCallback(
    (stopId: string) => {
      if (!selectedPath) return

      const stops = selectedPath.stops
      const index = stops.indexOf(stopId)

      if (index >= 0) {
        // Remove stop if already in sequence
        handlePathUpdate(selectedPath.id, {
          stops: stops.filter((_, i) => i !== index),
        })
      } else {
        // Add stop to sequence
        handlePathUpdate(selectedPath.id, {
          stops: [...stops, stopId],
        })
      }
    },
    [selectedPath, handlePathUpdate]
  )

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/scenarios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-semibold text-lg w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/visualization?scenario=${scenario.id}`}>
            <Button variant="outline" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Path list */}
        <div className="w-56 border-r flex flex-col shrink-0">
          <PathList
            paths={paths}
            selectedPathId={selectedPathId}
            onSelectPath={setSelectedPathId}
            onAddPath={handleAddPath}
            onDeletePath={handleDeletePath}
            onUpdatePath={handlePathUpdate}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <PathCanvas
            placedElements={placedElements}
            templates={templates}
            paths={paths}
            selectedPath={selectedPath}
            onStopClick={handleStopClick}
            gridColumns={warehouse.gridColumns}
            gridRows={warehouse.gridRows}
          />

          {/* Bottom bar - Global settings */}
          <div className="border-t px-4 py-3 flex items-center gap-6 shrink-0 bg-muted/30">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Scenario Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>
                      Speed Multiplier: {speedMultiplier.toFixed(1)}x
                    </Label>
                    <Slider
                      value={[speedMultiplier]}
                      onValueChange={([v]) => v && setSpeedMultiplier(v)}
                      min={0.1}
                      max={5}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Duration: {duration ? `${duration / 1000}s` : "Unlimited"}
                    </Label>
                    <Slider
                      value={[duration ?? 0]}
                      onValueChange={([v]) =>
                        setDuration(v === 0 || v === undefined ? null : v)
                      }
                      min={0}
                      max={300000}
                      step={5000}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Speed: {speedMultiplier.toFixed(1)}x</span>
              <span className="text-border">|</span>
              <span>
                Duration: {duration ? `${duration / 1000}s` : "Unlimited"}
              </span>
              <span className="text-border">|</span>
              <span>{paths.length} path(s)</span>
            </div>
          </div>
        </div>

        {/* Right sidebar - Path settings */}
        {selectedPath && (
          <div className="w-72 border-l shrink-0 overflow-auto">
            <PathSettings
              path={selectedPath}
              placedElements={placedElements}
              onUpdate={(updates) => handlePathUpdate(selectedPath.id, updates)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Color palette for paths
const PATH_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
]

function getNextColor(index: number): string {
  return PATH_COLORS[index % PATH_COLORS.length]!
}
