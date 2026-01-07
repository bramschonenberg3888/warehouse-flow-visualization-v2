import Link from "next/link"
import { Plus, Warehouse, Route, Boxes } from "lucide-react"
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
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Warehouse className="h-5 w-5 text-primary" />
                    Warehouses
                  </CardTitle>
                  <CardDescription>
                    Create and manage warehouse layouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/warehouses">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Warehouse
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Boxes className="h-5 w-5 text-primary" />
                    Elements
                  </CardTitle>
                  <CardDescription>
                    Browse warehouse element library
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/elements">View Elements</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Route className="h-5 w-5 text-primary" />
                    Flows
                  </CardTitle>
                  <CardDescription>Define goods movement paths</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full" disabled>
                    <span>Select Warehouse First</span>
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
                      Create a warehouse
                    </span>{" "}
                    - Start by creating a new warehouse to design your layout
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Design the layout
                    </span>{" "}
                    - Use the element library to drag and drop racking, lanes,
                    and areas onto the canvas
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Define flows
                    </span>{" "}
                    - Create flow paths by clicking elements in sequence to show
                    goods movement
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Visualize
                    </span>{" "}
                    - View animated flow paths showing how goods move through
                    your warehouse
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
