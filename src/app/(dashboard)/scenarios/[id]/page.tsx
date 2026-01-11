"use client"

import { use } from "react"
import { ScenarioBuilder } from "@/components/scenario-builder"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ScenarioEditorPage({ params }: PageProps) {
  const { id } = use(params)
  return <ScenarioBuilder scenarioId={id} />
}
