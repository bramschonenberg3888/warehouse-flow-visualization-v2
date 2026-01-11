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
import { Slider } from "@/components/ui/slider"
import type { UIDecisionStep, UIStep } from "./types"
import type { Condition } from "@/lib/scenario-engine/types"

interface DecisionStepEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: UIDecisionStep | null
  onSave: (step: UIDecisionStep) => void
  allSteps: UIStep[]
  currentStepIndex: number
}

type ConditionType = Condition["type"]

export function DecisionStepEditor({
  open,
  onOpenChange,
  step,
  onSave,
  allSteps,
  currentStepIndex,
}: DecisionStepEditorProps) {
  // Condition state
  const [conditionType, setConditionType] =
    useState<ConditionType>("probability")
  const [probability, setProbability] = useState(50)
  const [capacityElementId, setCapacityElementId] = useState("")
  const [capacityOperator, setCapacityOperator] = useState<"<" | ">" | "==">(
    "<"
  )
  const [capacityValue, setCapacityValue] = useState(5)
  const [timeOperator, setTimeOperator] = useState<"<" | ">">("<")
  const [timeValue, setTimeValue] = useState(60)
  const [counterName, setCounterName] = useState("")
  const [counterOperator, setCounterOperator] = useState<"<" | ">" | "==">("==")
  const [counterValue, setCounterValue] = useState(10)

  // Path state
  const [truePath, setTruePath] = useState<string>("")
  const [falsePath, setFalsePath] = useState<string>("")

  // Available steps for path selection (exclude current step and steps before it)
  const availableSteps = allSteps.filter(
    (s, i) => i > currentStepIndex && s.type !== "decision"
  )

  // Initialize from step when sheet opens
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (step) {
      setConditionType(step.condition.type)

      if (step.condition.type === "probability") {
        setProbability(Math.round(step.condition.chance * 100))
      } else if (step.condition.type === "capacity") {
        setCapacityElementId(step.condition.elementId)
        setCapacityOperator(step.condition.operator)
        setCapacityValue(step.condition.value)
      } else if (step.condition.type === "time") {
        setTimeOperator(step.condition.operator)
        setTimeValue(step.condition.value / 1000)
      } else if (step.condition.type === "counter") {
        setCounterName(step.condition.name)
        setCounterOperator(step.condition.operator)
        setCounterValue(step.condition.value)
      }

      setTruePath(step.truePath ?? "")
      setFalsePath(step.falsePath ?? "")
    } else {
      // Reset to defaults
      setConditionType("probability")
      setProbability(50)
      setCapacityElementId("")
      setCapacityOperator("<")
      setCapacityValue(5)
      setTimeOperator("<")
      setTimeValue(60)
      setCounterName("")
      setCounterOperator("==")
      setCounterValue(10)
      setTruePath("")
      setFalsePath("")
    }
  }, [step, open])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = () => {
    if (!step) return

    // Build condition
    let condition: Condition
    switch (conditionType) {
      case "probability":
        condition = { type: "probability", chance: probability / 100 }
        break
      case "capacity":
        condition = {
          type: "capacity",
          elementId: capacityElementId,
          operator: capacityOperator,
          value: capacityValue,
        }
        break
      case "time":
        condition = {
          type: "time",
          operator: timeOperator,
          value: timeValue * 1000,
        }
        break
      case "counter":
        condition = {
          type: "counter",
          name: counterName,
          operator: counterOperator,
          value: counterValue,
        }
        break
      case "random-choice":
        condition = { type: "random-choice", weights: [1, 1] }
        break
      default:
        condition = { type: "probability", chance: 0.5 }
    }

    const updatedStep: UIDecisionStep = {
      ...step,
      condition,
      truePath: truePath || undefined,
      falsePath: falsePath || undefined,
    }

    onSave(updatedStep)
    onOpenChange(false)
  }

  const getStepLabel = (stepId: string) => {
    const stepIndex = allSteps.findIndex((s) => s.id === stepId)
    if (stepIndex === -1) return stepId
    const s = allSteps[stepIndex]
    if (!s) return stepId
    if (s.type === "location") {
      return `Step ${stepIndex + 1}: Location`
    } else if (s.type === "exit") {
      return `Step ${stepIndex + 1}: Exit`
    }
    return `Step ${stepIndex + 1}`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Decision</SheetTitle>
          <SheetDescription>Configure how to split the path</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* CONDITION TYPE */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">How to Decide</Label>

            <Select
              value={conditionType}
              onValueChange={(v) => setConditionType(v as ConditionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="probability">
                  Probability (random %)
                </SelectItem>
                <SelectItem value="capacity">Check capacity</SelectItem>
                <SelectItem value="time">Based on time</SelectItem>
                <SelectItem value="counter">Based on counter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CONDITION CONFIG */}
          {conditionType === "probability" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Chance of taking Path A</Label>
                  <span className="text-sm font-medium">{probability}%</span>
                </div>
                <Slider
                  value={[probability]}
                  onValueChange={(values) =>
                    values[0] !== undefined && setProbability(values[0])
                  }
                  min={0}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Always Path B</span>
                  <span>Always Path A</span>
                </div>
              </div>
            </div>
          )}

          {conditionType === "capacity" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Element to check</Label>
                <Input
                  value={capacityElementId}
                  onChange={(e) => setCapacityElementId(e.target.value)}
                  placeholder="Element ID"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={capacityOperator}
                    onValueChange={(v) =>
                      setCapacityOperator(v as typeof capacityOperator)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<">Less than</SelectItem>
                      <SelectItem value=">">Greater than</SelectItem>
                      <SelectItem value="==">Equal to</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={capacityValue}
                    onChange={(e) => setCapacityValue(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Takes Path A if capacity {capacityOperator} {capacityValue},
                otherwise Path B
              </p>
            </div>
          )}

          {conditionType === "time" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Simulation time is</Label>
                  <Select
                    value={timeOperator}
                    onValueChange={(v) =>
                      setTimeOperator(v as typeof timeOperator)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<">Before</SelectItem>
                      <SelectItem value=">">After</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Seconds</Label>
                  <Input
                    type="number"
                    value={timeValue}
                    onChange={(e) => setTimeValue(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Takes Path A if simulation time{" "}
                {timeOperator === "<" ? "before" : "after"} {timeValue} seconds,
                otherwise Path B
              </p>
            </div>
          )}

          {conditionType === "counter" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Counter name</Label>
                <Input
                  value={counterName}
                  onChange={(e) => setCounterName(e.target.value)}
                  placeholder="e.g., items_processed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={counterOperator}
                    onValueChange={(v) =>
                      setCounterOperator(v as typeof counterOperator)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<">Less than</SelectItem>
                      <SelectItem value=">">Greater than</SelectItem>
                      <SelectItem value="==">Equal to</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={counterValue}
                    onChange={(e) => setCounterValue(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Takes Path A if &quot;{counterName}&quot; {counterOperator}{" "}
                {counterValue}, otherwise Path B
              </p>
            </div>
          )}

          {/* PATHS */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Paths</Label>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  Path A (when condition is true)
                </Label>
                <Select value={truePath} onValueChange={setTruePath}>
                  <SelectTrigger>
                    <SelectValue placeholder="Continue to next step" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Continue to next step</SelectItem>
                    {availableSteps.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {getStepLabel(s.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  Path B (when condition is false)
                </Label>
                <Select value={falsePath} onValueChange={setFalsePath}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select step..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Skip (no action)</SelectItem>
                    {availableSteps.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {getStepLabel(s.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Decision</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
