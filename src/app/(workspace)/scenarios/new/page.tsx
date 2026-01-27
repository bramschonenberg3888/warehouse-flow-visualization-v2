"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
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
import { api } from "@/trpc/react"

export default function NewScenarioPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()

  const createScenario = api.scenario.create.useMutation({
    onSuccess: (scenario) => {
      if (scenario) {
        router.push(`/scenarios/${scenario.id}`)
      }
    },
    onError: (error) => {
      alert(error.message || "Failed to create scenario")
    },
  })

  const handleCreate = async () => {
    if (!name.trim() || !warehouseId) return

    setIsCreating(true)
    try {
      await createScenario.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        warehouseId,
      })
    } catch {
      // Error is handled by onError callback
    } finally {
      setIsCreating(false)
    }
  }

  const canCreate = name.trim().length > 0 && warehouseId.length > 0

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/scenarios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Scenario</h1>
          <p className="text-muted-foreground">
            Set up a new scenario for your warehouse
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Details</CardTitle>
          <CardDescription>
            Choose a warehouse and give your scenario a name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse *</Label>
            {warehousesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : warehouses?.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No warehouses available.{" "}
                <Link href="/warehouses" className="text-primary underline">
                  Create one first
                </Link>
                .
              </div>
            ) : (
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouse">
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
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Receiving Flow"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this scenario..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" asChild>
              <Link href="/scenarios">Cancel</Link>
            </Button>
            <Button onClick={handleCreate} disabled={!canCreate || isCreating}>
              {isCreating ? (
                "Creating..."
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Scenario
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
