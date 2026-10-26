// Mark this as a client component because React Flow renders edges in the browser
"use client";

// Import the building blocks for drawing a custom edge
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
// Import the hook that tells each edge what the current run is doing
import { useRunVisualState } from "@/components/flow/run-state-context";
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
  // Compute the right-angle path and the midpoint where the label sits
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
  // Read what the current run is doing
  const { hasRun, takenEdges, activeEdges } = useRunVisualState();
  // Was this edge followed by the run?
  const taken = takenEdges.has(id);
  // Is the run travelling along this edge right now?
  const flowing = activeEdges.has(id);
  // After a run starts, edges that were not followed fade into the background
  const dimmed = hasRun && !taken;
  // Respect people who ask their system to reduce motion (edges only render in the browser)
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Render the line, the moving dashes and the label
  return (
    <>
      {/* The colored line: thick when taken, faded when not used */}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: color, strokeWidth: taken ? 4 : selected ? 3.5 : 2, opacity: dimmed ? 0.3 : 1 }}
      />
      {/* White dashes that march along the line while the run travels this edge */}
      {flowing ? (
        <path
          d={path}
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="6 10"
          pointerEvents="none"
        >
          {/* An SVG animation: shifting the dash offset makes the dashes travel forward along the path */}
          {reduceMotion ? null : (
            <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.6s" repeatCount="indefinite" />
          )}
        </path>
      ) : null}
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
            opacity: dimmed ? 0.4 : 1,
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
