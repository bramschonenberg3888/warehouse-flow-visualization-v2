import type { Path, PlacedElement } from "@/server/db/schema"
import {
  generateMultiPath,
  getPositionAlongPath,
  getPathLength,
  BASE_SPEED,
  type Point,
} from "@/lib/pathfinding"
import { gridToWorld, type GridCell } from "@/lib/grid-config"

export interface Pallet {
  id: string
  pathId: string
  color: string
  elementTemplateId: string | null
  x: number
  y: number
  state: "moving" | "dwelling"
  currentStopIndex: number
  progress: number // 0-1 along current segment
  dwellRemaining: number // ms remaining at current stop
}

export interface PathEngineConfig {
  speedMultiplier: number
  maxDuration?: number // ms, optional cap
}

interface PathState {
  path: Path
  lastSpawnTime: number
  activeCount: number
  totalSpawned: number
  // Computed path segments for each stop-to-stop
  segments: {
    from: number
    to: number
    path: Point[]
    length: number
  }[]
  stopPositions: Point[]
}

function parseGridCellId(id: string): GridCell | null {
  if (!id.startsWith("grid:")) return null
  const parts = id.split(":")
  if (parts.length !== 3) return null
  const col = parseInt(parts[1]!, 10)
  const row = parseInt(parts[2]!, 10)
  if (isNaN(col) || isNaN(row)) return null
  return { col, row }
}

export class PathEngine {
  private pallets: Map<string, Pallet> = new Map()
  private pathStates: Map<string, PathState> = new Map()
  private placedElementMap: Map<string, PlacedElement> = new Map()
  private config: PathEngineConfig
  private clock: number = 0
  private nextPalletId: number = 0

  constructor(
    paths: Path[],
    placedElements: PlacedElement[],
    config: PathEngineConfig
  ) {
    this.config = config

    // Build placed element lookup
    for (const el of placedElements) {
      this.placedElementMap.set(el.id, el)
    }

    // Initialize path states
    for (const path of paths) {
      if (!path.isActive || path.stops.length < 2) continue

      const stopPositions = this.resolveStopPositions(path.stops)
      if (stopPositions.length < 2) continue

      const segments = this.computeSegments(stopPositions)

      this.pathStates.set(path.id, {
        path,
        lastSpawnTime: -path.spawnInterval, // Allow immediate first spawn
        activeCount: 0,
        totalSpawned: 0,
        segments,
        stopPositions,
      })
    }
  }

  private resolveStopPositions(stops: string[]): Point[] {
    const positions: Point[] = []
    for (const stopId of stops) {
      const pos = this.resolveStopPosition(stopId)
      if (pos) positions.push(pos)
    }
    return positions
  }

  private resolveStopPosition(stopId: string): Point | null {
    // Try grid cell first
    const gridCell = parseGridCellId(stopId)
    if (gridCell) {
      return gridToWorld(gridCell)
    }

    // Try placed element
    const element = this.placedElementMap.get(stopId)
    if (element) {
      return {
        x: element.positionX + element.width / 2,
        y: element.positionY + element.height / 2,
      }
    }

    return null
  }

  private computeSegments(stopPositions: Point[]): PathState["segments"] {
    const segments: PathState["segments"] = []

    for (let i = 0; i < stopPositions.length - 1; i++) {
      const from = stopPositions[i]
      const to = stopPositions[i + 1]
      if (!from || !to) continue

      const path = generateMultiPath([from, to])
      segments.push({
        from: i,
        to: i + 1,
        path,
        length: getPathLength(path),
      })
    }

    return segments
  }

  tick(deltaTime: number): void {
    const adjustedDelta = deltaTime * this.config.speedMultiplier
    this.clock += adjustedDelta

    // Check duration cap
    if (this.config.maxDuration && this.clock >= this.config.maxDuration) {
      return
    }

    // Check for spawns
    this.checkSpawns()

    // Update all pallets
    for (const pallet of this.pallets.values()) {
      this.updatePallet(pallet, adjustedDelta)
    }
  }

  private checkSpawns(): void {
    for (const [pathId, state] of this.pathStates) {
      const { path } = state

      // Check if can spawn
      if (state.activeCount >= path.maxActive) continue

      const timeSinceLastSpawn = this.clock - state.lastSpawnTime
      if (timeSinceLastSpawn < path.spawnInterval) continue

      // Spawn a new pallet
      this.spawnPallet(pathId, state)
      state.lastSpawnTime = this.clock
    }
  }

  private spawnPallet(pathId: string, state: PathState): void {
    const { path, stopPositions } = state
    const startPos = stopPositions[0]
    if (!startPos) return

    const palletId = `pallet-${this.nextPalletId++}`
    const pallet: Pallet = {
      id: palletId,
      pathId,
      color: path.color,
      elementTemplateId: path.elementTemplateId,
      x: startPos.x,
      y: startPos.y,
      state: "dwelling",
      currentStopIndex: 0,
      progress: 0,
      dwellRemaining: path.dwellTime,
    }

    this.pallets.set(palletId, pallet)
    state.activeCount++
    state.totalSpawned++
  }

  private updatePallet(pallet: Pallet, deltaTime: number): void {
    const state = this.pathStates.get(pallet.pathId)
    if (!state) return

    const { path, segments, stopPositions } = state

    if (pallet.state === "dwelling") {
      pallet.dwellRemaining -= deltaTime

      if (pallet.dwellRemaining <= 0) {
        // Check if at last stop
        if (pallet.currentStopIndex >= stopPositions.length - 1) {
          // Pallet complete - remove it
          this.removePallet(pallet, state)
          return
        }

        // Start moving to next stop
        pallet.state = "moving"
        pallet.progress = 0
      }
    } else if (pallet.state === "moving") {
      const segment = segments[pallet.currentStopIndex]
      if (!segment || segment.length === 0) {
        // No segment, skip to next stop
        pallet.currentStopIndex++
        pallet.state = "dwelling"
        pallet.dwellRemaining = path.dwellTime
        const newPos = stopPositions[pallet.currentStopIndex]
        if (newPos) {
          pallet.x = newPos.x
          pallet.y = newPos.y
        }
        return
      }

      // Calculate movement
      const speed = BASE_SPEED * path.speed * this.config.speedMultiplier
      const distanceToMove = (speed * deltaTime) / 1000
      const progressIncrement = distanceToMove / segment.length

      pallet.progress += progressIncrement

      if (pallet.progress >= 1) {
        // Arrived at next stop
        pallet.currentStopIndex++
        const newPos = stopPositions[pallet.currentStopIndex]
        if (newPos) {
          pallet.x = newPos.x
          pallet.y = newPos.y
        }
        pallet.state = "dwelling"
        pallet.progress = 0
        pallet.dwellRemaining = path.dwellTime
      } else {
        // Update position along segment
        const pos = getPositionAlongPath(segment.path, pallet.progress)
        pallet.x = pos.x
        pallet.y = pos.y
      }
    }
  }

  private removePallet(pallet: Pallet, state: PathState): void {
    this.pallets.delete(pallet.id)
    state.activeCount--
  }

  getPallets(): Pallet[] {
    return Array.from(this.pallets.values())
  }

  getSimulationTime(): number {
    return this.clock
  }

  reset(): void {
    this.pallets.clear()
    this.clock = 0
    this.nextPalletId = 0

    // Reset path states
    for (const state of this.pathStates.values()) {
      state.lastSpawnTime = -state.path.spawnInterval
      state.activeCount = 0
      state.totalSpawned = 0
    }
  }

  getStats(): {
    totalPallets: number
    activePallets: number
    simulationTime: number
  } {
    let activePallets = 0
    for (const state of this.pathStates.values()) {
      activePallets += state.activeCount
    }

    return {
      totalPallets: this.nextPalletId,
      activePallets,
      simulationTime: this.clock,
    }
  }
}
