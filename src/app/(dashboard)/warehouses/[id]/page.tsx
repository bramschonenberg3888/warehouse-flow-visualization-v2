"use client"

import { use } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Edit, Route, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"

interface WarehouseDetailPageProps {
  params: Promise<{ id: string }>
}

export default function WarehouseDetailPage({
  params,
}: WarehouseDetailPageProps) {
  const { id } = use(params)
  const { data: warehouse, isLoading } = api.warehouse.getById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="aspect-video w-full max-w-2xl" />
      </div>
    )
  }

  if (!warehouse) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/warehouses">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Warehouses
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {warehouse.name}
          </h1>
          {warehouse.description && (
            <p className="mt-1 text-muted-foreground">
              {warehouse.description}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Created{" "}
            {formatDistanceToNow(new Date(warehouse.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/warehouses/${id}/editor`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Layout
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/warehouses/${id}/flows`}>
              <Route className="mr-2 h-4 w-4" />
              Manage Flows
            </Link>
          </Button>
        </div>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Preview</CardTitle>
          <CardDescription>
            Visual preview of your warehouse layout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 max-w-md rounded-lg border bg-muted/50">
            {warehouse.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={warehouse.thumbnailUrl}
                alt={warehouse.name}
                className="h-full w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <p>No layout yet</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href={`/warehouses/${id}/editor`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Start Designing
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Layout Editor</CardTitle>
            <CardDescription>
              Design your warehouse layout using the element library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href={`/warehouses/${id}/editor`}>
                <Edit className="mr-2 h-4 w-4" />
                Open Editor
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Flow Management</CardTitle>
            <CardDescription>
              Define and visualize goods movement paths
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/warehouses/${id}/flows`}>
                <Route className="mr-2 h-4 w-4" />
                Manage Flows
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
