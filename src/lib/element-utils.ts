import type {
  ExcalidrawElementData,
  ExcalidrawTemplateElement,
} from "@/server/db/schema/element"
import type { ExcalidrawElementType } from "@/components/editor/excalidraw-wrapper"

/**
 * Check if template uses legacy single-element format (version 1 or no version)
 */
export function isLegacyTemplate(
  data: ExcalidrawElementData | null | undefined
): boolean {
  if (!data) return true
  return !data.version || data.version === 1 || !data.elements
}

/**
 * Convert legacy single-element data to multi-element format
 */
export function migrateLegacyTemplate(
  data: ExcalidrawElementData | null | undefined,
  width: number,
  height: number
): ExcalidrawTemplateElement[] {
  return [
    {
      type: data?.type || "rectangle",
      relativeX: 0,
      relativeY: 0,
      width,
      height,
      angle: 0,
      backgroundColor: data?.backgroundColor || "#6b7280",
      strokeColor: data?.strokeColor || "#374151",
      strokeWidth: data?.strokeWidth || 2,
      fillStyle: data?.fillStyle || "solid",
      strokeStyle: data?.strokeStyle || "solid",
      roughness: data?.roughness ?? 0,
      opacity: data?.opacity ?? 80,
      roundness: data?.roundness ?? null,
    },
  ]
}

/**
 * Generate Excalidraw elements from template elements for canvas placement
 * All generated elements share the same groupId for group behavior
 */
export function generateExcalidrawElements(
  templateElements: ExcalidrawTemplateElement[],
  baseX: number,
  baseY: number,
  scaleX: number = 1,
  scaleY: number = 1,
  groupId: string
): ExcalidrawElementType[] {
  return templateElements.map((te, index) => {
    // Use deterministic IDs based on groupId so we can track elements reliably
    // This ensures we can match elements after Excalidraw modifies groupIds
    const element: ExcalidrawElementType = {
      id: `${groupId}-${index}`,
      type: te.type,
      x: baseX + te.relativeX * scaleX,
      y: baseY + te.relativeY * scaleY,
      width: te.width * scaleX,
      height: te.height * scaleY,
      angle: te.angle,
      strokeColor: te.strokeColor,
      backgroundColor: te.backgroundColor,
      fillStyle: te.fillStyle,
      strokeWidth: te.strokeWidth,
      strokeStyle: te.strokeStyle,
      roughness: te.roughness,
      opacity: te.opacity,
      roundness: te.roundness,
      groupIds: [groupId],
      frameId: null,
      seed: Math.floor(Math.random() * 2147483647),
      version: 1,
      versionNonce: Math.floor(Math.random() * 2147483647),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
    }

    // Add text-specific properties if text element
    if (te.type === "text" && te.text) {
      element.text = te.text
      element.fontSize = te.fontSize || 20
      element.fontFamily = te.fontFamily || 1
    }

    return element
  })
}

/**
 * Extract template elements from Excalidraw elements with relative positions
 * Used when saving a multi-element shape
 */
export function extractTemplateElements(
  elements: ExcalidrawElementType[],
  originX: number,
  originY: number
): ExcalidrawTemplateElement[] {
  return elements.map((el) => {
    const templateElement: ExcalidrawTemplateElement = {
      type: el.type as ExcalidrawTemplateElement["type"],
      relativeX: el.x - originX,
      relativeY: el.y - originY,
      width: el.width,
      height: el.height,
      angle: el.angle || 0,
      backgroundColor: el.backgroundColor || "#6b7280",
      strokeColor: el.strokeColor || "#374151",
      strokeWidth: el.strokeWidth || 2,
      fillStyle:
        (el.fillStyle as ExcalidrawTemplateElement["fillStyle"]) || "solid",
      strokeStyle:
        (el.strokeStyle as ExcalidrawTemplateElement["strokeStyle"]) || "solid",
      roughness: el.roughness ?? 0,
      opacity: el.opacity ?? 80,
      roundness: el.roundness ?? null,
    }

    // Include text properties if text element
    if (el.type === "text" && el.text) {
      templateElement.text = el.text
      templateElement.fontSize = el.fontSize
      templateElement.fontFamily = el.fontFamily
    }

    return templateElement
  })
}

/**
 * Visual properties extracted from a template for rendering
 */
export interface TemplateVisualProperties {
  backgroundColor: string
  strokeColor: string
  strokeWidth: number
  strokeStyle: "solid" | "dashed" | "dotted"
  fillStyle: "solid" | "hachure" | "cross-hatch"
  roughness: number
  opacity: number
  roundness: { type: number } | null
}

const DEFAULT_VISUAL_PROPERTIES: TemplateVisualProperties = {
  backgroundColor: "#6b7280",
  strokeColor: "#374151",
  strokeWidth: 2,
  strokeStyle: "solid",
  fillStyle: "solid",
  roughness: 0,
  opacity: 80,
  roundness: null,
}

/**
 * Extract visual properties from template data (handles both legacy v1 and v2 formats)
 */
export function getTemplateVisualProperties(
  data: ExcalidrawElementData | null | undefined
): TemplateVisualProperties {
  if (!data) return DEFAULT_VISUAL_PROPERTIES

  // For v2 multi-element templates, read from the first element
  const firstElement = data.elements?.[0]
  if (data.version === 2 && firstElement) {
    return {
      backgroundColor:
        firstElement.backgroundColor ??
        DEFAULT_VISUAL_PROPERTIES.backgroundColor,
      strokeColor:
        firstElement.strokeColor ?? DEFAULT_VISUAL_PROPERTIES.strokeColor,
      strokeWidth:
        firstElement.strokeWidth ?? DEFAULT_VISUAL_PROPERTIES.strokeWidth,
      strokeStyle:
        (firstElement.strokeStyle as TemplateVisualProperties["strokeStyle"]) ??
        DEFAULT_VISUAL_PROPERTIES.strokeStyle,
      fillStyle:
        (firstElement.fillStyle as TemplateVisualProperties["fillStyle"]) ??
        DEFAULT_VISUAL_PROPERTIES.fillStyle,
      roughness: firstElement.roughness ?? DEFAULT_VISUAL_PROPERTIES.roughness,
      opacity: firstElement.opacity ?? DEFAULT_VISUAL_PROPERTIES.opacity,
      roundness: firstElement.roundness ?? DEFAULT_VISUAL_PROPERTIES.roundness,
    }
  }

  // Legacy v1 format - read from top level
  return {
    backgroundColor:
      data.backgroundColor ?? DEFAULT_VISUAL_PROPERTIES.backgroundColor,
    strokeColor: data.strokeColor ?? DEFAULT_VISUAL_PROPERTIES.strokeColor,
    strokeWidth: data.strokeWidth ?? DEFAULT_VISUAL_PROPERTIES.strokeWidth,
    strokeStyle:
      (data.strokeStyle as TemplateVisualProperties["strokeStyle"]) ??
      DEFAULT_VISUAL_PROPERTIES.strokeStyle,
    fillStyle:
      (data.fillStyle as TemplateVisualProperties["fillStyle"]) ??
      DEFAULT_VISUAL_PROPERTIES.fillStyle,
    roughness: data.roughness ?? DEFAULT_VISUAL_PROPERTIES.roughness,
    opacity: data.opacity ?? DEFAULT_VISUAL_PROPERTIES.opacity,
    roundness: data.roundness ?? DEFAULT_VISUAL_PROPERTIES.roundness,
  }
}

/**
 * Calculate bounding box of elements
 */
export function calculateBoundingBox(elements: ExcalidrawElementType[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    minX = Math.min(minX, el.x)
    minY = Math.min(minY, el.y)
    maxX = Math.max(maxX, el.x + el.width)
    maxY = Math.max(maxY, el.y + el.height)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  }
}
