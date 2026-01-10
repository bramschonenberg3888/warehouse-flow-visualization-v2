"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Warehouse,
  LayoutDashboard,
  Route,
  Play,
  Settings,
  Boxes,
  BookOpen,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Warehouses",
    href: "/warehouses",
    icon: Warehouse,
  },
  {
    name: "Elements",
    href: "/elements",
    icon: Boxes,
  },
  {
    name: "Flows",
    href: "/flows",
    icon: Route,
  },
  {
    name: "Scenarios",
    href: "/scenarios",
    icon: Layers,
  },
  {
    name: "Visualization",
    href: "/visualization",
    icon: Play,
  },
]

const secondaryNavigation = [
  {
    name: "Wiki",
    href: "/wiki",
    icon: BookOpen,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Route className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Warehouse Flow</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive && "bg-secondary"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </nav>

        <Separator className="my-4" />

        <nav className="space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href

            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive && "bg-secondary"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Warehouse Flow Visualization
        </p>
      </div>
    </div>
  )
}
