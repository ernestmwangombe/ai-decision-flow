// Mark this as a client component because it reacts to typing and clicks
"use client";

// Import React Flow's handle, position enum, hook and node prop type
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
// Import the Shadcn textarea for editing the prompt
import { Textarea } from "@/components/ui/textarea";
// Import the hook that tells each node what state the current run is in
import { useRunVisualState } from "@/components/flow/run-state-context";
// Import our node type and branch colors
import { BRANCH_COLORS, type DecisionNodeType } from "@/lib/graph-schema";
// Import the run state type
import type { NodeRunState } from "@/lib/run-visual";

// Card styling for each run state
const STATE_CLASSES: Record<NodeRunState, string> = {
  // No run: a plain white card
  idle: "border-slate-300 bg-white",
  // Being evaluated: amber, pulsing, with a soft glow
  running: "animate-pulse border-amber-500 bg-amber-50 shadow-[0_0_0_4px_rgba(245,158,11,0.25)]",
  // Answered YES: green
  yes: "border-green-500 bg-green-50",
  // Answered NO: red
  no: "border-red-500 bg-red-50",
  // Errored: stronger red
  errored: "border-red-600 bg-red-100",
};

// Badge text and colors for every state except idle
const BADGES: Record<Exclude<NodeRunState, "idle">, { label: string; className: string }> = {
  running: { label: "RUNNING", className: "bg-amber-100 text-amber-700" },
  yes: { label: "YES", className: "bg-green-100 text-green-700" },
  no: { label: "NO", className: "bg-red-100 text-red-700" },
  errored: { label: "ERRORED", className: "bg-red-200 text-red-800" },
};

// The custom node that represents one AI decision step
export function DecisionNode({ id, data, selected }: NodeProps<DecisionNodeType>) {
  // Get helpers to update this node's data and to delete it
  const { updateNodeData, deleteElements } = useReactFlow<DecisionNodeType>();
  // Read the run state for the whole canvas
  const { nodes: nodeStates } = useRunVisualState();
  // Look up this node's state, defaulting to idle
  const runState: NodeRunState = nodeStates.get(id) ?? "idle";
  // Pick the badge for this state, if any
  const badge = runState === "idle" ? null : BADGES[runState];
  // Show a blue ring when the node is selected
  const selectedRing = selected ? "ring-2 ring-blue-400" : "";

  // Render the node card
  return (
    // The card, colored by run state
    <div
      className={`w-72 rounded-lg border-2 p-3 text-slate-900 shadow-sm transition-colors ${STATE_CLASSES[runState]} ${selectedRing}`}
    >
      {/* The input handle on top: incoming edges connect here */}
      <Handle type="target" position={Position.Top} style={{ width: 12, height: 12 }} />

      {/* A header row with a title, a status badge and a delete button */}
      <div className="mb-2 flex items-center justify-between">
        {/* The title and the badge */}
        <div className="flex items-center gap-2">
          {/* A small title so the node type is obvious */}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AI decision</span>
          {/* The run status badge, shown only during or after a run */}
          {badge ? (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
          ) : null}
        </div>
        {/* The delete button; "nodrag" stops clicks from starting a node drag */}
        <button
          // Make the button type explicit
          type="button"
          // Remove this node (and its edges) from the graph
          onClick={() => deleteElements({ nodes: [{ id }] })}
          // Styling plus the nodrag class
          className="nodrag text-slate-400 hover:text-red-600"
          // Screen-reader label
          aria-label="Delete node"
        >
          ✕
        </button>
      </div>

      {/* The prompt editor; "nodrag" and "nowheel" let you type and scroll inside it */}
      <Textarea
        // Give the field a name so browsers and DevTools stop flagging it
        name={"prompt-" + id}
        // Describe the field for screen readers
        aria-label="Decision prompt"
        // Show the current prompt from the node's data
        value={data.prompt}
        // Save every keystroke into the node's data
        onChange={(event) => updateNodeData(id, { prompt: event.target.value })}
        // Hint at what to write
        placeholder="Write a question the AI can answer with YES or NO..."
        // Styling plus the classes that stop dragging and zooming while typing
        className="nodrag nowheel min-h-20 bg-white text-sm text-slate-900"
      />

      {/* A footer legend explaining where each handle leads */}
      <div className="mt-2 flex justify-between text-[10px] font-bold">
        {/* NO leaves from the bottom handle */}
        <span style={{ color: BRANCH_COLORS.no }}>NO (bottom)</span>
        {/* YES leaves from the right handle */}
        <span style={{ color: BRANCH_COLORS.yes }}>YES (right)</span>
      </div>

      {/* The YES output handle on the right, colored green */}
      <Handle
        // This is an output handle
        type="source"
        // Place it on the right side
        position={Position.Right}
        // The id "yes" becomes the edge's sourceHandle
        id="yes"
        // Green circle
        style={{ width: 12, height: 12, background: BRANCH_COLORS.yes }}
      />

      {/* The NO output handle at the bottom, colored red */}
      <Handle
        // This is an output handle
        type="source"
        // Place it on the bottom
        position={Position.Bottom}
        // The id "no" becomes the edge's sourceHandle
        id="no"
        // Red circle
        style={{ width: 12, height: 12, background: BRANCH_COLORS.no }}
      />
    </div>
  );
}
