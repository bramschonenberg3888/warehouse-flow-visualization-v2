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
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="space-y-8">
            {/* Welcome Section */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Warehouse Flow Visualization
              </h1>
              <p className="mt-2 text-muted-foreground">
                Design warehouse layouts, define flow paths, and visualize goods
                movement.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Boxes className="h-5 w-5 text-primary" />
                    Elements
                  </CardTitle>
                  <CardDescription>
                    Create reusable element templates for your layouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/elements">Manage Elements</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Warehouse className="h-5 w-5 text-primary" />
                    Warehouses
                  </CardTitle>
                  <CardDescription>
                    Design warehouse floor plans on a grid canvas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/warehouses">Manage Warehouses</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-5 w-5 text-primary" />
                    Scenarios
                  </CardTitle>
                  <CardDescription>
                    Define movement paths and spawning rules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/scenarios">Manage Scenarios</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Play className="h-5 w-5 text-primary" />
                    Visualize
                  </CardTitle>
                  <CardDescription>
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
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Follow these steps to create your first warehouse flow
                  visualization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-inside list-decimal space-y-3 text-sm text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">
                      Create elements
                    </span>{" "}
                    - Define reusable element templates like racking,
                    workstations, and mobile equipment
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Design a warehouse
                    </span>{" "}
                    - Create a warehouse and place elements on the grid canvas
                    to build your layout
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Define scenarios
                    </span>{" "}
                    - Create scenarios with paths that define how goods move
                    through your warehouse
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Visualize
                    </span>{" "}
                    - Watch animated goods movement along your defined paths in
                    real-time
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
