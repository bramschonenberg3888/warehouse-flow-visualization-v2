# Canvas Editor Alternatives Research

Research conducted January 2026 comparing canvas libraries for warehouse layout editing.

## Current Setup: Excalidraw

**Location**: `src/components/editor/excalidraw-wrapper.tsx`

**Pros**:

- Quick to integrate
- Good for freehand diagrams
- Collaboration features available

**Cons**:

- Freehand-first design conflicts with precise warehouse layouts
- No native grid snap
- No built-in connections/edges for flow paths
- Heavy bundle (~500KB) for features we don't use
- Template sync model is a workaround, not native

## Alternative 1: ReactFlow (@xyflow/react)

**Best for**: Projects needing connections between elements (our Flow Editor feature)

**Used by**: Dify, Supabase, Novu, ComflowySpace, OpenCTI

### Core Concepts

```tsx
// Nodes = warehouse elements
const nodes = [
  {
    id: "shelf-1",
    type: "shelf",
    position: { x: 100, y: 100 },
    data: { label: "Shelf A1" },
  },
  {
    id: "dock-1",
    type: "dock",
    position: { x: 500, y: 100 },
    data: { label: "Loading Dock" },
  },
]

// Edges = flow paths (goods movement)
const edges = [
  {
    id: "flow-1",
    source: "shelf-1",
    target: "dock-1",
    animated: true,
    label: "Outbound",
  },
]

// Custom node component
function ShelfNode({ data }) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div className="shelf">{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </>
  )
}
```

### Strengths

| Feature        | Benefit                                        |
| -------------- | ---------------------------------------------- |
| Built-in edges | Flow paths are native - trivial to implement   |
| Handles        | Define where goods can enter/exit each element |
| Snap to grid   | `snapGrid={[25, 25]}` - one prop               |
| Animated edges | Show active flows with `animated: true`        |
| Edge labels    | Label paths with direction, quantities         |
| Mini-map       | Built-in overview for large layouts            |
| Auto-layout    | Libraries like dagre can auto-arrange          |

### Weaknesses

- Node-centric mental model
- Less freeform than canvas libraries
- Edge routing can be awkward in tight spaces

### Migration Impact

- Database schema maps directly (elements → nodes, flow paths → edges)
- Template system stays intact
- Replace `excalidraw-wrapper.tsx` with ReactFlow component
- Element sidebar remains similar

### Links

- Docs: https://reactflow.dev
- GitHub: https://github.com/xyflow/xyflow
- Examples: https://reactflow.dev/examples

## Alternative 2: React-Konva

**Best for**: Full control over rendering, performance with many elements

**Used by**: InvokeAI, APITable (Gantt), Documenso

### Core Concepts

```tsx
import { Stage, Layer, Rect, Arrow } from "react-konva"

function WarehouseCanvas() {
  return (
    <Stage width={1200} height={800}>
      <Layer>
        {/* Grid background - manual */}
        {renderGrid()}

        {/* Elements */}
        {elements.map((el) => (
          <Rect
            key={el.id}
            x={el.x}
            y={el.y}
            draggable
            onDragEnd={(e) => {
              // Manual snap to grid
              const snappedX = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE
              updateElement(el.id, { x: snappedX, y: snappedY })
            }}
          />
        ))}

        {/* Flow paths - manual implementation */}
        {flowPaths.map((path) => (
          <Arrow points={calculatePathPoints(path.from, path.to)} />
        ))}
      </Layer>
    </Stage>
  )
}
```

### Strengths

| Feature         | Benefit                                 |
| --------------- | --------------------------------------- |
| Full control    | Every pixel configurable                |
| Performance     | Canvas-based, handles 1000s of elements |
| Custom visuals  | Draw exact warehouse symbols            |
| Image support   | Easy CAD background overlay             |
| Transformations | Resize, rotate, skew built-in           |

### Weaknesses

- No built-in connections (implement flow paths manually ~200+ lines)
- Grid snap, selection, multi-select, undo/redo all manual
- No built-in mini-map
- Steeper learning curve

### Migration Impact

- More work than ReactFlow
- Full rewrite of editor component
- Must implement connection system for Flow Editor
- Better if CAD import is critical

### Links

- Docs: https://konvajs.org/docs/react/
- GitHub: https://github.com/konvajs/react-konva
- Editor example: https://github.com/mytac/react-konva-editor

## Comparison Matrix

| Criteria                     | Excalidraw | ReactFlow | React-Konva |
| ---------------------------- | ---------- | --------- | ----------- |
| Grid snap                    | Manual     | Native    | Manual      |
| Flow paths/edges             | None       | Native    | Manual      |
| Performance (1000+ elements) | Medium     | Good      | Excellent   |
| CAD background               | Awkward    | Possible  | Native      |
| Bundle size                  | ~500KB     | ~150KB    | ~130KB      |
| Learning curve               | Low        | Low       | Medium      |
| Freeform drawing             | Yes        | No        | Yes         |
| Our Flow Editor feature      | Hard       | Easy      | Medium      |

## Recommendation

**For this project: ReactFlow**

Reasons:

1. Flow Editor is on our roadmap - this is literally what ReactFlow does
2. Native grid snapping solves current pain point
3. Clean migration path from current data model
4. Used by production apps (Dify, Supabase) at scale

**Choose React-Konva if**:

- CAD background overlay becomes critical requirement
- Need 10,000+ elements (unlikely for warehouse layouts)
- Want complete visual control over everything

## Implementation Notes

If migrating to ReactFlow:

1. Keep database schema (elements table maps to nodeTypes, placed_elements to nodes)
2. Create custom node components per element type (shelf, dock, aisle, etc.)
3. Add edges table for flow paths
4. Replace `excalidraw-wrapper.tsx` with ReactFlow setup
5. Element library sidebar stays mostly the same
