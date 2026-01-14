import Link from "next/link"
import {
  BookOpen,
  FileText,
  Lightbulb,
  Wrench,
  BookMarked,
  HelpCircle,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getArticlesByCategory } from "@/lib/wiki-content"

const categoryIcons: Record<string, React.ReactNode> = {
  "Core Concepts": <Lightbulb className="h-5 w-5" />,
  Elements: <Wrench className="h-5 w-5" />,
  Guides: <BookMarked className="h-5 w-5" />,
  Simulation: <FileText className="h-5 w-5" />,
  Reference: <HelpCircle className="h-5 w-5" />,
}

const categoryColors: Record<string, string> = {
  "Core Concepts": "bg-blue-500/10 text-blue-600",
  Elements: "bg-purple-500/10 text-purple-600",
  Guides: "bg-green-500/10 text-green-600",
  Simulation: "bg-orange-500/10 text-orange-600",
  Reference: "bg-cyan-500/10 text-cyan-600",
}

export default function WikiPage() {
  const articlesByCategory = getArticlesByCategory()

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-1">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          Documentation
        </h1>
        <p className="text-base text-muted-foreground">
          Guides, tutorials, and reference documentation for Warehouse Flow
        </p>
      </div>

      {Object.entries(articlesByCategory).map(([category, articles]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${categoryColors[category] || "bg-muted"}`}
            >
              {categoryIcons[category] || <FileText className="h-4 w-4" />}
            </div>
            <h2 className="text-xl font-semibold">{category}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {articles.length}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link key={article.slug} href={`/wiki/${article.slug}`}>
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      {article.title}
                    </CardTitle>
                    <CardDescription className="text-sm line-clamp-2">
                      {article.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Updated {article.lastUpdated}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
