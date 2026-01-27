"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { WarehousePreview } from "@/components/warehouse/warehouse-preview"
import { api } from "@/trpc/react"
import type { Warehouse } from "@/server/db/schema"

interface WarehouseCardProps {
  warehouse: Warehouse
}

export function WarehouseCard({ warehouse }: WarehouseCardProps) {
  const utils = api.useUtils()

  const { data: placedElements } = api.placedElement.getByWarehouse.useQuery(
    { warehouseId: warehouse.id },
    { enabled: !!warehouse.id }
  )
  const { data: templates } = api.element.getAll.useQuery()

  const deleteMutation = api.warehouse.delete.useMutation({
    onSuccess: () => {
      utils.warehouse.getAll.invalidate()
    },
  })

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this warehouse?")) {
      deleteMutation.mutate({ id: warehouse.id })
    }
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg">{warehouse.name}</CardTitle>
          {warehouse.description && (
            <CardDescription className="line-clamp-2">
              {warehouse.description}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Layout Preview */}
        <Link
          href={`/warehouses/${warehouse.id}`}
          className="block aspect-video rounded-md border bg-muted/50 transition-colors hover:bg-muted overflow-hidden"
        >
          {placedElements && placedElements.length > 0 ? (
            <WarehousePreview
              placedElements={placedElements}
              templates={templates ?? []}
              gridColumns={warehouse.gridColumns}
              gridRows={warehouse.gridRows}
              width={300}
              height={169}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No layout yet
            </div>
          )}
        </Link>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Created{" "}
            {formatDistanceToNow(new Date(warehouse.createdAt), {
              addSuffix: true,
            })}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/warehouses/${warehouse.id}/editor`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
