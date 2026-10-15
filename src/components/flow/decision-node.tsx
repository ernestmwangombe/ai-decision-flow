// Mark this as a client component because it reacts to typing and clicks
"use client";

// Import React Flow's handle, position enum, hook and node prop type
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
// Import the Shadcn textarea for editing the prompt
import { Textarea } from "@/components/ui/textarea";
// Import our node type and branch colors
import { BRANCH_COLORS, type DecisionNodeType } from "@/lib/graph-schema";

// The custom node that represents one AI decision step
export function DecisionNode({ id, data, selected }: NodeProps<DecisionNodeType>) {
  // Get helpers to update this node's data and to delete it
  const { updateNodeData, deleteElements } = useReactFlow<DecisionNodeType>();

  // Render the node card
  return (
    // The card; the border turns blue when the node is selected
    <div
      className={`w-72 rounded-lg border-2 bg-white p-3 text-slate-900 shadow-sm ${
        selected ? "border-blue-500" : "border-slate-300"
      }`}
    >
      {/* The input handle on top: incoming edges connect here */}
      <Handle type="target" position={Position.Top} style={{ width: 12, height: 12 }} />

      {/* A header row with a title and a delete button */}
      <div className="mb-2 flex items-center justify-between">
        {/* A small title so the node type is obvious */}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AI decision</span>
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
