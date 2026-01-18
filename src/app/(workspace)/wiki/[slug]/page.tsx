import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getArticleBySlug, wikiArticles } from "@/lib/wiki-content"
import { WikiContent } from "@/components/wiki/wiki-content"

interface WikiArticlePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return wikiArticles.map((article) => ({
    slug: article.slug,
  }))
}

export default async function WikiArticlePage({
  params,
}: WikiArticlePageProps) {
  const { slug } = await params
  const article = getArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/wiki">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Wiki
          </Link>
        </Button>
      </div>

      <div className="space-y-3 border-b pb-6">
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="rounded-md font-medium text-primary"
          >
            {article.category}
          </Badge>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Updated {article.lastUpdated}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
        <p className="text-base text-muted-foreground">{article.description}</p>
      </div>

      <WikiContent content={article.content} />
    </div>
  )
}
