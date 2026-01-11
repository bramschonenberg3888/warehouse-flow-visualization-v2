"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import type { SpawnConfig } from "@/lib/scenario-engine/types"

interface SpawningConfigProps {
  spawning: SpawnConfig
  onChange: (spawning: SpawnConfig) => void
}

export function SpawningConfig({ spawning, onChange }: SpawningConfigProps) {
  const handleModeChange = (mode: SpawnConfig["mode"]) => {
    if (mode === "interval") {
      onChange({
        mode: "interval",
        duration: 3000,
        variance: 500,
        maxActive: spawning.maxActive,
        totalLimit: spawning.totalLimit,
      })
    } else if (mode === "batch") {
      onChange({
        mode: "batch",
        size: 5,
        spacing: 500,
        batchInterval: 10000,
        maxActive: spawning.maxActive,
        totalLimit: spawning.totalLimit,
      })
    } else {
      onChange({
        mode: "manual",
        maxActive: spawning.maxActive,
        totalLimit: spawning.totalLimit,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Spawning</Label>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        {/* Mode */}
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select value={spawning.mode} onValueChange={handleModeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="interval">
                Interval - spawn at regular intervals
              </SelectItem>
              <SelectItem value="batch">Batch - spawn in groups</SelectItem>
              <SelectItem value="manual">
                Manual - spawn on demand only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Interval mode options */}
        {spawning.mode === "interval" && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Spawn every</Label>
                <span className="text-sm text-muted-foreground">
                  {(spawning.duration / 1000).toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[spawning.duration / 1000]}
                onValueChange={(values) => {
                  const v = values[0]
                  if (v !== undefined)
                    onChange({ ...spawning, duration: v * 1000 })
                }}
                min={0.5}
                max={30}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Variance</Label>
                <span className="text-sm text-muted-foreground">
                  {spawning.variance
                    ? `+/- ${(spawning.variance / 1000).toFixed(1)}s`
                    : "none"}
                </span>
              </div>
              <Slider
                value={[(spawning.variance ?? 0) / 1000]}
                onValueChange={(values) => {
                  const v = values[0]
                  if (v !== undefined)
                    onChange({ ...spawning, variance: v * 1000 })
                }}
                min={0}
                max={5}
                step={0.1}
              />
            </div>
          </>
        )}

        {/* Batch mode options */}
        {spawning.mode === "batch" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Items per batch</Label>
                <Input
                  type="number"
                  value={spawning.size}
                  onChange={(e) =>
                    onChange({ ...spawning, size: Number(e.target.value) })
                  }
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Spacing (ms)</Label>
                <Input
                  type="number"
                  value={spawning.spacing}
                  onChange={(e) =>
                    onChange({ ...spawning, spacing: Number(e.target.value) })
                  }
                  min={100}
                  step={100}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Time between batches</Label>
                <span className="text-sm text-muted-foreground">
                  {(spawning.batchInterval / 1000).toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[spawning.batchInterval / 1000]}
                onValueChange={(values) => {
                  const v = values[0]
                  if (v !== undefined)
                    onChange({ ...spawning, batchInterval: v * 1000 })
                }}
                min={1}
                max={60}
                step={1}
              />
            </div>
          </>
        )}

        {/* Manual mode info */}
        {spawning.mode === "manual" && (
          <p className="text-sm text-muted-foreground">
            Items will only spawn when triggered manually during visualization.
          </p>
        )}

        {/* Common options */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-2">
            <Label>Max active</Label>
            <Input
              type="number"
              value={spawning.maxActive ?? ""}
              onChange={(e) =>
                onChange({
                  ...spawning,
                  maxActive: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              min={1}
              placeholder="Unlimited"
            />
            <p className="text-xs text-muted-foreground">
              Max items in flow at once
            </p>
          </div>
          <div className="space-y-2">
            <Label>Total limit</Label>
            <Input
              type="number"
              value={spawning.totalLimit ?? ""}
              onChange={(e) =>
                onChange({
                  ...spawning,
                  totalLimit: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              min={1}
              placeholder="Unlimited"
            />
            <p className="text-xs text-muted-foreground">
              Total items to spawn
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
