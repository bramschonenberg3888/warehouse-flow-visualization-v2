"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import type { UILocationStep } from "./types"
import type {
  LocationTarget,
  DwellConfig,
  OperationType,
} from "@/lib/scenario-engine/types"
import type { PlacedElement, Category } from "@/server/db/schema"

interface LocationStepEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: UILocationStep | null
  onSave: (step: UILocationStep) => void
  placedElements: PlacedElement[]
  categories: Category[]
}

const operations: { value: OperationType; label: string }[] = [
  { value: "receive", label: "Receive" },
  { value: "store", label: "Store" },
  { value: "pick", label: "Pick" },
  { value: "pack", label: "Pack" },
  { value: "ship", label: "Ship" },
  { value: "inspect", label: "Inspect" },
]

export function LocationStepEditor({
  open,
  onOpenChange,
  step,
  onSave,
  placedElements,
  categories,
}: LocationStepEditorProps) {
  // Target state
  const [targetType, setTargetType] = useState<LocationTarget["type"]>("fixed")
  const [elementId, setElementId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [selectionRule, setSelectionRule] = useState<
    | "random"
    | "nearest"
    | "furthest"
    | "least-visited"
    | "most-available"
    | "round-robin"
  >("random")

  // Dwell state
  const [dwellType, setDwellType] = useState<DwellConfig["type"]>("fixed")
  const [dwellDuration, setDwellDuration] = useState(2)
  const [dwellMin, setDwellMin] = useState(1)
  const [dwellMax, setDwellMax] = useState(3)

  // Operation state
  const [operation, setOperation] = useState<OperationType | "">("")
  const [trackCapacity, setTrackCapacity] = useState(false)
  const [maxCapacity, setMaxCapacity] = useState(10)

  // Initialize from step when sheet opens
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (step) {
      // Target
      setTargetType(step.target.type)
      if (step.target.type === "fixed") {
        setElementId(step.target.elementId)
      } else if (step.target.type === "category") {
        setCategoryId(step.target.categoryId)
        setSelectionRule(step.target.rule)
      }

      // Dwell
      setDwellType(step.dwell.type)
      if (step.dwell.type === "fixed") {
        setDwellDuration(step.dwell.duration / 1000)
      } else if (step.dwell.type === "range") {
        setDwellMin(step.dwell.min / 1000)
        setDwellMax(step.dwell.max / 1000)
      }

      // Operation
      setOperation(step.operation ?? "")
      setTrackCapacity(!!step.capacity)
      if (step.capacity) {
        setMaxCapacity(step.capacity.max)
      }
    } else {
      // Reset to defaults
      setTargetType("fixed")
      setElementId("")
      setCategoryId("")
      setSelectionRule("random")
      setDwellType("fixed")
      setDwellDuration(2)
      setDwellMin(1)
      setDwellMax(3)
      setOperation("")
      setTrackCapacity(false)
      setMaxCapacity(10)
    }
  }, [step, open])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = () => {
    if (!step) return

    // Build target
    let target: LocationTarget
    if (targetType === "fixed") {
      target = { type: "fixed", elementId }
    } else if (targetType === "category") {
      target = { type: "category", categoryId, rule: selectionRule }
    } else if (targetType === "random") {
      target = { type: "random", pool: placedElements.map((e) => e.id) }
    } else {
      target = { type: "zone", zone: "", rule: selectionRule }
    }

    // Build dwell
    let dwell: DwellConfig
    if (dwellType === "fixed") {
      dwell = { type: "fixed", duration: dwellDuration * 1000 }
    } else if (dwellType === "range") {
      dwell = { type: "range", min: dwellMin * 1000, max: dwellMax * 1000 }
    } else {
      dwell = {
        type: "distribution",
        mean: dwellDuration * 1000,
        stdDev: (dwellDuration * 1000) / 4,
      }
    }

    const updatedStep: UILocationStep = {
      ...step,
      target,
      dwell,
      operation: operation || undefined,
      capacity: trackCapacity
        ? { max: maxCapacity, blockWhenFull: true }
        : undefined,
    }

    onSave(updatedStep)
    onOpenChange(false)
  }

  const selectedElement = placedElements.find((e) => e.id === elementId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Location Step</SheetTitle>
          <SheetDescription>
            Configure where items go and how long they stay
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* WHERE */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Where</Label>

            <Tabs
              value={targetType}
              onValueChange={(v) => setTargetType(v as LocationTarget["type"])}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fixed">Specific</TabsTrigger>
                <TabsTrigger value="category">Category</TabsTrigger>
                <TabsTrigger value="random">Random</TabsTrigger>
              </TabsList>

              <TabsContent value="fixed" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>Element</Label>
                  <Select value={elementId} onValueChange={setElementId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select element..." />
                    </SelectTrigger>
                    <SelectContent>
                      {placedElements.map((element) => (
                        <SelectItem key={element.id} value={element.id}>
                          {element.label || `Element ${element.id.slice(-6)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedElement && (
                    <p className="text-xs text-muted-foreground">
                      Position: ({Math.round(selectedElement.positionX)},{" "}
                      {Math.round(selectedElement.positionY)})
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="category" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Selection Rule</Label>
                  <Select
                    value={selectionRule}
                    onValueChange={(v) =>
                      setSelectionRule(v as typeof selectionRule)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="nearest">Nearest</SelectItem>
                      <SelectItem value="furthest">Furthest</SelectItem>
                      <SelectItem value="least-visited">
                        Least Visited
                      </SelectItem>
                      <SelectItem value="most-available">
                        Most Available
                      </SelectItem>
                      <SelectItem value="round-robin">Round Robin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="random" className="pt-3">
                <p className="text-sm text-muted-foreground">
                  Items will go to a random element from all placed elements.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* TIMING */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Timing</Label>

            <Tabs
              value={dwellType}
              onValueChange={(v) => setDwellType(v as DwellConfig["type"])}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fixed">Fixed</TabsTrigger>
                <TabsTrigger value="range">Range</TabsTrigger>
                <TabsTrigger value="distribution">Random</TabsTrigger>
              </TabsList>

              <TabsContent value="fixed" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Wait time</Label>
                    <span className="text-sm text-muted-foreground">
                      {dwellDuration}s
                    </span>
                  </div>
                  <Slider
                    value={[dwellDuration]}
                    onValueChange={(values) =>
                      values[0] !== undefined && setDwellDuration(values[0])
                    }
                    min={0.5}
                    max={30}
                    step={0.5}
                  />
                </div>
              </TabsContent>

              <TabsContent value="range" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={dwellMin}
                        onChange={(e) => setDwellMin(Number(e.target.value))}
                        min={0}
                        step={0.5}
                      />
                      <span className="text-sm text-muted-foreground">sec</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={dwellMax}
                        onChange={(e) => setDwellMax(Number(e.target.value))}
                        min={0}
                        step={0.5}
                      />
                      <span className="text-sm text-muted-foreground">sec</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="distribution" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Average time</Label>
                    <span className="text-sm text-muted-foreground">
                      ~{dwellDuration}s
                    </span>
                  </div>
                  <Slider
                    value={[dwellDuration]}
                    onValueChange={(values) =>
                      values[0] !== undefined && setDwellDuration(values[0])
                    }
                    min={0.5}
                    max={30}
                    step={0.5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uses normal distribution with some variance
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* OPERATION */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Operation (optional)
            </Label>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={operation}
                onValueChange={(v) => setOperation(v as OperationType | "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {operations.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="trackCapacity"
                checked={trackCapacity}
                onChange={(e) => setTrackCapacity(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="trackCapacity" className="font-normal">
                Track capacity at this location
              </Label>
            </div>

            {trackCapacity && (
              <div className="space-y-2 pl-7">
                <Label>Maximum items</Label>
                <Input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(Number(e.target.value))}
                  min={1}
                />
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Step</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
