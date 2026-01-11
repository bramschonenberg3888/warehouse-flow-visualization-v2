/**
 * Global grid configuration for warehouse simulations
 *
 * The grid is the coordinate system for:
 * - Placing static elements precisely
 * - Defining movement paths for mobile elements
 * - Cell-to-cell navigation during simulations
 */

// Grid cell size in pixels (global standard)
export const GRID_CELL_SIZE = 40

// Grid movement directions (4-directional: up, down, left, right)
export type GridDirection = "up" | "down" | "left" | "right"

export const GRID_DIRECTIONS: GridDirection[] = ["up", "down", "left", "right"]

// Direction vectors for movement
export const DIRECTION_VECTORS: Record<
  GridDirection,
  { dx: number; dy: number }
> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}

/**
 * Grid cell coordinates (integer-based)
 */
export interface GridCell {
  col: number
  row: number
}

/**
 * Convert world coordinates to grid cell
 */
export function worldToGrid(x: number, y: number): GridCell {
  return {
    col: Math.floor(x / GRID_CELL_SIZE),
    row: Math.floor(y / GRID_CELL_SIZE),
  }
}

/**
 * Convert grid cell to world coordinates (returns center of cell)
 */
export function gridToWorld(cell: GridCell): { x: number; y: number } {
  return {
    x: cell.col * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    y: cell.row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
  }
}

/**
 * Convert grid cell to world coordinates (returns top-left corner)
 */
export function gridToWorldCorner(cell: GridCell): { x: number; y: number } {
  return {
    x: cell.col * GRID_CELL_SIZE,
    y: cell.row * GRID_CELL_SIZE,
  }
}

/**
 * Snap world coordinates to nearest grid cell center
 */
export function snapToGrid(x: number, y: number): { x: number; y: number } {
  const cell = worldToGrid(x, y)
  return gridToWorld(cell)
}

/**
 * Get adjacent grid cell in given direction
 */
export function getAdjacentCell(
  cell: GridCell,
  direction: GridDirection
): GridCell {
  const vector = DIRECTION_VECTORS[direction]
  return {
    col: cell.col + vector.dx,
    row: cell.row + vector.dy,
  }
}

/**
 * Calculate Manhattan distance between two grid cells
 */
export function gridDistance(from: GridCell, to: GridCell): number {
  return Math.abs(to.col - from.col) + Math.abs(to.row - from.row)
}

/**
 * Check if two grid cells are the same
 */
export function isSameCell(a: GridCell, b: GridCell): boolean {
  return a.col === b.col && a.row === b.row
}

/**
 * Check if two grid cells are adjacent (4-directional)
 */
export function areAdjacent(a: GridCell, b: GridCell): boolean {
  return gridDistance(a, b) === 1
}
