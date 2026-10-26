// Mark this as a client component because it has buttons
"use client";

// Import the Shadcn button
import { Button } from "@/components/ui/button";
// Import the graph type
import type { StoredGraph } from "@/lib/graph-schema";

// What the dialog needs to show
type ImportReviewDialogProps = {
  // The name of the file being imported
  fileName: string;
  // The validated graph from the file
  graph: StoredGraph;
  // Indexes of prompts that look like instructions
  flagged: number[];
  // Called when the user accepts the import
  onConfirm: () => void;
  // Called when the user cancels
  onCancel: () => void;
};

// A dialog that makes the user read imported prompts before they replace the canvas
export function ImportReviewDialog({ fileName, graph, flagged, onConfirm, onCancel }: ImportReviewDialogProps) {
  // A set makes the "is this prompt flagged?" check quick
  const flaggedSet = new Set(flagged);
  // Render a full-screen overlay with a centered card
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-review-title"
    >
      {/* The card; it scrolls if the list is long */}
      <div className="max-h-[85vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-lg bg-white p-4 text-slate-900 shadow-xl">
        {/* The title */}
        <h2 id="import-review-title" className="text-base font-semibold">
          Review before importing
        </h2>
        {/* Explain what will happen */}
        <p className="text-sm text-slate-600">
          {fileName} contains {graph.nodes.length} {graph.nodes.length === 1 ? "node" : "nodes"} and {graph.edges.length}{" "}
          {graph.edges.length === 1 ? "edge" : "edges"}. Its prompts will be sent to the model whenever you run the
          workflow, so read them first. Importing replaces the graph on your canvas.
        </p>
        {/* Warn when some prompts look like instructions */}
        {flagged.length > 0 ? (
          <p className="rounded border border-amber-400 bg-amber-50 p-2 text-sm text-amber-800">
            {flagged.length} {flagged.length === 1 ? "prompt looks" : "prompts look"} like instructions aimed at the model
            instead of questions. This check is only a rough guide, so read every prompt.
          </p>
        ) : null}
        {/* List every prompt as plain text */}
        <ol className="space-y-2">
          {graph.nodes.map((node, index) => (
            <li
              key={node.id}
              className={`rounded border p-2 text-sm ${
                flaggedSet.has(index) ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <span className="font-semibold">{index + 1}.</span> {node.data.prompt}
              {flaggedSet.has(index) ? (
                <span className="ml-2 text-xs font-semibold text-amber-700">Looks like an instruction</span>
              ) : null}
            </li>
          ))}
        </ol>
        {/* The two choices */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Replace my graph</Button>
        </div>
      </div>
    </div>
  );
}
