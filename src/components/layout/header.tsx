"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

// Map paths to readable names
const pathNames: Record<string, string> = {
  "": "Dashboard",
  warehouses: "Warehouses",
  elements: "Elements",
  analytics: "Analytics",
  settings: "Settings",
  editor: "Editor",
  flows: "Flows",
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: { name: string; href: string }[] = []

  let currentPath = ""
  for (const segment of segments) {
    currentPath += `/${segment}`

    // Check if segment is a UUID (skip it for display but keep in path)
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment
      )

    if (isUuid) {
      // For UUIDs, use a generic name or skip
      breadcrumbs.push({
        name: "Details",
        href: currentPath,
      })
    } else {
      breadcrumbs.push({
        name: pathNames[segment] || segment,
        href: currentPath,
      })
    }
  }

  return breadcrumbs
}

export function Header() {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <header className="flex h-14 items-center border-b bg-card/80 px-6 backdrop-blur-sm">
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Home className="h-4 w-4" />
        </Link>

        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {index === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-foreground">
                {crumb.name}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {crumb.name}
              </Link>
            )}
          </div>
        ))}

        {breadcrumbs.length === 0 && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-semibold text-foreground">Dashboard</span>
          </>
        )}
      </nav>
    </header>
  )
}
