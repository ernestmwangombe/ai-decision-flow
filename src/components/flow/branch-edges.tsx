// Mark this as a client component because React Flow renders edges in the browser
"use client";

// Import the building blocks for drawing a custom edge
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
// Import our branch colors and the Branch type
import { BRANCH_COLORS, type Branch } from "@/lib/graph-schema";

// One shared edge component; the branch decides the color and the label
function BranchEdge({
  // Which branch this edge represents
  branch,
  // The edge id
  id,
  // Start and end coordinates
  sourceX,
  sourceY,
  targetX,
  targetY,
  // Which side of each node the edge attaches to
  sourcePosition,
  targetPosition,
  // The arrowhead definition
  markerEnd,
  // Whether the edge is currently selected
  selected,
}: EdgeProps & { branch: Branch }) {
  // Compute the curved path and the midpoint where the label sits
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  // Look up this branch's color
  const color = BRANCH_COLORS[branch];

  // Render the line and its label
  return (
    <>
      {/* The colored curved line; it gets thicker when selected */}
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: color, strokeWidth: selected ? 3.5 : 2 }} />
      {/* The label layer sits above the canvas so the text stays crisp */}
      <EdgeLabelRenderer>
        {/* A small pill centered on the middle of the edge */}
        <div
          // Position the pill at the edge midpoint
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "none",
            color,
            borderColor: color,
          }}
          // Pill styling
          className="rounded-full border bg-white px-2 py-0.5 text-xs font-bold"
        >
          {/* Show YES or NO */}
          {branch.toUpperCase()}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// The edge type used for YES connections
export function YesEdge(props: EdgeProps) {
  // Reuse the shared component with the "yes" branch
  return <BranchEdge {...props} branch="yes" />;
}

// The edge type used for NO connections
export function NoEdge(props: EdgeProps) {
  // Reuse the shared component with the "no" branch
  return <BranchEdge {...props} branch="no" />;
}
