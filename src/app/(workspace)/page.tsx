import Link from "next/link"
import { Warehouse, Boxes, Layers, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome Section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-base text-muted-foreground">
          Design warehouse layouts, define flow paths, and visualize goods
          movement.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-base">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Boxes className="h-5 w-5 text-primary" />
              </div>
              Elements
            </CardTitle>
            <CardDescription className="text-sm">
              Create reusable element templates for your layouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/elements">Manage Elements</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-base">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Warehouse className="h-5 w-5 text-primary" />
              </div>
              Warehouses
            </CardTitle>
            <CardDescription className="text-sm">
              Design warehouse floor plans on a grid canvas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/warehouses">Manage Warehouses</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-base">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              Scenarios
            </CardTitle>
            <CardDescription className="text-sm">
              Define movement paths and spawning rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/scenarios">Manage Scenarios</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-base">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Play className="h-5 w-5 text-primary" />
              </div>
              Visualize
            </CardTitle>
            <CardDescription className="text-sm">
              Watch animated goods movement in your warehouse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/visualization">Start Visualization</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="bg-gradient-to-br from-card to-muted/30">
        <CardHeader>
          <CardTitle className="text-xl">Getting Started</CardTitle>
          <CardDescription className="text-sm">
            Follow these steps to create your first warehouse flow visualization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                1
              </span>
              <div>
                <p className="font-medium text-foreground">Create elements</p>
                <p className="text-sm text-muted-foreground">
                  Define reusable element templates like racking, workstations,
                  and mobile equipment
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                2
              </span>
              <div>
                <p className="font-medium text-foreground">
                  Design a warehouse
                </p>
                <p className="text-sm text-muted-foreground">
                  Create a warehouse and place elements on the grid canvas to
                  build your layout
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                3
              </span>
              <div>
                <p className="font-medium text-foreground">Define scenarios</p>
                <p className="text-sm text-muted-foreground">
                  Create scenarios with paths that define how goods move through
                  your warehouse
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                4
              </span>
              <div>
                <p className="font-medium text-foreground">Visualize</p>
                <p className="text-sm text-muted-foreground">
                  Watch animated goods movement along your defined paths in
                  real-time
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
