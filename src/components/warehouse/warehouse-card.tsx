"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Edit, Route, Trash2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    <Card className="group relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{warehouse.name}</CardTitle>
            {warehouse.description && (
              <CardDescription className="line-clamp-2">
                {warehouse.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/warehouses/${warehouse.id}/editor`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Layout
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/warehouses/${warehouse.id}/flows`}>
                  <Route className="mr-2 h-4 w-4" />
                  Manage Flows
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/warehouses/${warehouse.id}/editor`}>
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/warehouses/${warehouse.id}/flows`}>
                <Route className="mr-1 h-3 w-3" />
                Flows
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
