"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface WikiContentProps {
  content: string
}

export function WikiContent({ content }: WikiContentProps) {
  const elements = parseContent(content)

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      {elements.map((element, index) => (
        <ContentElement key={index} element={element} />
      ))}
    </div>
  )
}

type ContentElementType =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "list"; items: string[]; ordered: boolean }

function parseContent(content: string): ContentElementType[] {
  const lines = content.split("\n")
  const elements: ContentElementType[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line === undefined) {
      i++
      continue
    }

    // Skip empty lines
    if (!line.trim()) {
      i++
      continue
    }

    // H2
    if (line.startsWith("## ")) {
      elements.push({ type: "h2", text: line.slice(3) })
      i++
      continue
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push({ type: "h3", text: line.slice(4) })
      i++
      continue
    }

    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length) {
        const currentLine = lines[i]
        if (currentLine === undefined || !currentLine.startsWith("|")) break
        tableLines.push(currentLine)
        i++
      }
      const table = parseTable(tableLines)
      if (table) {
        elements.push(table)
      }
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length) {
        const currentLine = lines[i]
        if (currentLine === undefined || !/^\d+\.\s/.test(currentLine)) break
        items.push(currentLine.replace(/^\d+\.\s/, ""))
        i++
      }
      elements.push({ type: "list", items, ordered: true })
      continue
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: string[] = []
      while (i < lines.length) {
        const currentLine = lines[i]
        if (currentLine === undefined || !currentLine.startsWith("- ")) break
        items.push(currentLine.slice(2))
        i++
      }
      elements.push({ type: "list", items, ordered: false })
      continue
    }

    // Paragraph (collect consecutive non-special lines)
    const paragraphLines: string[] = []
    while (i < lines.length) {
      const currentLine = lines[i]
      if (
        currentLine === undefined ||
        !currentLine.trim() ||
        currentLine.startsWith("#") ||
        currentLine.startsWith("|") ||
        currentLine.startsWith("- ") ||
        /^\d+\.\s/.test(currentLine)
      ) {
        break
      }
      paragraphLines.push(currentLine)
      i++
    }
    if (paragraphLines.length > 0) {
      elements.push({ type: "paragraph", text: paragraphLines.join(" ") })
    }
  }

  return elements
}

function parseTable(lines: string[]): ContentElementType | null {
  if (lines.length < 2) return null

  const parseRow = (line: string): string[] =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())

  const firstLine = lines[0]
  if (!firstLine) return null

  const headers = parseRow(firstLine)
  // Skip separator line (index 1)
  const rows = lines.slice(2).map(parseRow)

  return { type: "table", headers, rows }
}

function ContentElement({ element }: { element: ContentElementType }) {
  switch (element.type) {
    case "h2":
      return (
        <h2 className="mt-8 mb-4 text-2xl font-semibold tracking-tight first:mt-0">
          {element.text}
        </h2>
      )
    case "h3":
      return (
        <h3 className="mt-6 mb-3 text-lg font-semibold tracking-tight">
          {element.text}
        </h3>
      )
    case "paragraph":
      return (
        <p className="mb-4 leading-7 text-muted-foreground">
          <FormattedText text={element.text} />
        </p>
      )
    case "table":
      return (
        <div className="my-6 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {element.headers.map((header, i) => (
                  <TableHead key={i}>
                    <FormattedText text={header} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {element.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j}>
                      <FormattedText text={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    case "list": {
      const ListTag = element.ordered ? "ol" : "ul"
      return (
        <ListTag
          className={`my-4 ml-6 space-y-2 ${element.ordered ? "list-decimal" : "list-disc"}`}
        >
          {element.items.map((item, i) => (
            <li key={i} className="text-muted-foreground">
              <FormattedText text={item} />
            </li>
          ))}
        </ListTag>
      )
    }
  }
}

function FormattedText({ text }: { text: string }) {
  // Parse bold (**text**) and inline code (`code`)
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Code
    const codeMatch = remaining.match(/`(.+?)`/)

    // Find earliest match
    let earliestMatch: RegExpMatchArray | null = null
    let matchType: "bold" | "code" | null = null

    if (
      boldMatch &&
      (!codeMatch || (boldMatch.index ?? 0) <= (codeMatch.index ?? 0))
    ) {
      earliestMatch = boldMatch
      matchType = "bold"
    } else if (codeMatch) {
      earliestMatch = codeMatch
      matchType = "code"
    }

    if (earliestMatch && earliestMatch.index !== undefined) {
      // Add text before match
      if (earliestMatch.index > 0) {
        parts.push(remaining.slice(0, earliestMatch.index))
      }

      // Add formatted text
      const matchedText = earliestMatch[1] ?? ""
      if (matchType === "bold") {
        parts.push(
          <strong key={key++} className="font-semibold text-foreground">
            {matchedText}
          </strong>
        )
      } else if (matchType === "code") {
        parts.push(
          <code
            key={key++}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
          >
            {matchedText}
          </code>
        )
      }

      remaining = remaining.slice(earliestMatch.index + earliestMatch[0].length)
    } else {
      parts.push(remaining)
      break
    }
  }

  return <>{parts}</>
}
