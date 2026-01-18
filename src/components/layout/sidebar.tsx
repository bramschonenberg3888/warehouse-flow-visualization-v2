"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Warehouse,
  Home,
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
    name: "Home",
    href: "/",
    icon: Home,
  },
  {
    name: "Elements",
    href: "/elements",
    icon: Boxes,
  },
  {
    name: "Warehouses",
    href: "/warehouses",
    icon: Warehouse,
  },
  {
    name: "Scenarios",
    href: "/scenarios",
    icon: Layers,
  },
  {
    name: "Visualize",
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
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Route className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight">
          Warehouse Flow
        </span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Main
        </p>
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
                  "w-full justify-start gap-3 font-medium",
                  isActive && "bg-sidebar-accent text-primary shadow-sm"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon
                    className={cn("h-4 w-4", isActive && "text-primary")}
                  />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </nav>

        <Separator className="my-4" />

        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Support
        </p>
        <nav className="space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href

            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 font-medium",
                  isActive && "bg-sidebar-accent text-primary shadow-sm"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon
                    className={cn("h-4 w-4", isActive && "text-primary")}
                  />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs font-medium text-muted-foreground">
          Warehouse Flow
        </p>
        <p className="text-xs text-muted-foreground/70">v1.0.0</p>
      </div>
    </div>
  )
}
