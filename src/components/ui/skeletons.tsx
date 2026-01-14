import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Skeleton for WarehouseCard - matches the exact structure
 */
export function WarehouseCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="aspect-video w-full rounded-md" />
        <div className="mt-3 flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton for ElementCard - matches icon + title layout
 */
export function ElementCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton for ScenarioCard - matches icon + title + description layout
 */
export function ScenarioCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="space-y-1.5 mt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Grid skeleton for loading states - renders multiple card skeletons
 */
export function CardGridSkeleton({
  count = 3,
  CardSkeleton,
}: {
  count?: number
  CardSkeleton: React.ComponentType
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
