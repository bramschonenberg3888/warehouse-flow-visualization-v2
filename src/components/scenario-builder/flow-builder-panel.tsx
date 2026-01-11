"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StepList } from "./step-list"
import { LocationStepEditor } from "./location-step-editor"
import { DecisionStepEditor } from "./decision-step-editor"
import { SpawningConfig } from "./spawning-config"
import type { UIFlow, UIStep, UILocationStep, UIDecisionStep } from "./types"
import {
  createDefaultLocationStep,
  createDefaultDecisionStep,
  createDefaultExitStep,
} from "./types"
import type { PlacedElement, Category } from "@/server/db/schema"

interface FlowBuilderPanelProps {
  flow: UIFlow | null
  onFlowChange: (flow: UIFlow) => void
  placedElements: PlacedElement[]
  categories: Category[]
}

export function FlowBuilderPanel({
  flow,
  onFlowChange,
  placedElements,
  categories,
}: FlowBuilderPanelProps) {
  // Editor state
  const [editingLocationStep, setEditingLocationStep] = useState<{
    step: UILocationStep
    index: number
  } | null>(null)
  const [editingDecisionStep, setEditingDecisionStep] = useState<{
    step: UIDecisionStep
    index: number
  } | null>(null)

  // Build element label map for display
  const elementLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const el of placedElements) {
      map.set(el.id, el.label || `Element ${el.id.slice(-6)}`)
    }
    return map
  }, [placedElements])

  if (!flow) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No flow selected</p>
          <p className="text-sm">
            Select a flow from the sidebar or create a new one
          </p>
        </div>
      </div>
    )
  }

  const handleStepsChange = (steps: UIStep[]) => {
    onFlowChange({ ...flow, steps })
  }

  const handleEditStep = (step: UIStep, index: number) => {
    if (step.type === "location") {
      setEditingLocationStep({ step, index })
    } else if (step.type === "decision") {
      setEditingDecisionStep({ step, index })
    }
    // Exit steps don't need editing
  }

  const handleDeleteStep = (index: number) => {
    const newSteps = [...flow.steps]
    newSteps.splice(index, 1)
    onFlowChange({ ...flow, steps: newSteps })
  }

  const handleAddStep = (type: UIStep["type"]) => {
    let newStep: UIStep
    if (type === "location") {
      newStep = createDefaultLocationStep()
    } else if (type === "decision") {
      newStep = createDefaultDecisionStep()
    } else {
      newStep = createDefaultExitStep()
    }
    onFlowChange({ ...flow, steps: [...flow.steps, newStep] })
  }

  const handleSaveLocationStep = (updatedStep: UILocationStep) => {
    if (!editingLocationStep) return
    const newSteps = [...flow.steps]
    newSteps[editingLocationStep.index] = updatedStep
    onFlowChange({ ...flow, steps: newSteps })
    setEditingLocationStep(null)
  }

  const handleSaveDecisionStep = (updatedStep: UIDecisionStep) => {
    if (!editingDecisionStep) return
    const newSteps = [...flow.steps]
    newSteps[editingDecisionStep.index] = updatedStep
    onFlowChange({ ...flow, steps: newSteps })
    setEditingDecisionStep(null)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Flow header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: flow.color }}
          />
          <div className="flex-1">
            <Input
              value={flow.name}
              onChange={(e) => onFlowChange({ ...flow, name: e.target.value })}
              className="text-lg font-semibold h-auto py-1 px-2 -ml-2"
              placeholder="Flow name"
            />
          </div>
        </div>
      </div>

      {/* Flow content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Steps */}
          <StepList
            steps={flow.steps}
            onStepsChange={handleStepsChange}
            onEditStep={handleEditStep}
            onDeleteStep={handleDeleteStep}
            onAddStep={handleAddStep}
            elementLabels={elementLabels}
          />

          {/* Spawning */}
          <SpawningConfig
            spawning={flow.spawning}
            onChange={(spawning) => onFlowChange({ ...flow, spawning })}
          />

          {/* Validation hints */}
          {flow.steps.length > 0 &&
            flow.steps[flow.steps.length - 1]?.type !== "exit" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Tip: Add an Exit step at the end to complete the flow
              </div>
            )}
        </div>
      </ScrollArea>

      {/* Location Step Editor */}
      <LocationStepEditor
        open={!!editingLocationStep}
        onOpenChange={(open) => !open && setEditingLocationStep(null)}
        step={editingLocationStep?.step ?? null}
        onSave={handleSaveLocationStep}
        placedElements={placedElements}
        categories={categories}
      />

      {/* Decision Step Editor */}
      <DecisionStepEditor
        open={!!editingDecisionStep}
        onOpenChange={(open) => !open && setEditingDecisionStep(null)}
        step={editingDecisionStep?.step ?? null}
        onSave={handleSaveDecisionStep}
        allSteps={flow.steps}
        currentStepIndex={editingDecisionStep?.index ?? 0}
      />
    </div>
  )
}
