import Link from "next/link"
import { BookOpen, FileText } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getArticlesByCategory } from "@/lib/wiki-content"

export default function WikiPage() {
  const articlesByCategory = getArticlesByCategory()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <BookOpen className="h-8 w-8" />
          Wiki
        </h1>
        <p className="mt-2 text-muted-foreground">
          Documentation, guides, and best practices for Warehouse Flow
          Visualization
        </p>
      </div>

      {Object.entries(articlesByCategory).map(([category, articles]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold">{category}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link key={article.slug} href={`/wiki/${article.slug}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-primary" />
                      {article.title}
                    </CardTitle>
                    <CardDescription>{article.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{article.category}</Badge>
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
