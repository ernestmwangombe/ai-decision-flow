// Import the graph type so we can look up edges
import type { StoredGraph } from "./graph-schema";
// Import the run type so we can read its steps
import type { RunRecord } from "./run-types";
// Import the helper that finds the entry node of a graph
import { getEntryNodeIds } from "./workflow-engine";

// The visual state of one node during a run
export type NodeRunState = "idle" | "running" | "yes" | "no" | "errored";

// Everything the canvas needs to draw a run
export type RunVisualState = {
  // True when at least one edge was taken, so untaken edges can be dimmed
  hasRun: boolean;
  // The state of each node, keyed by node id
  nodes: Map<string, NodeRunState>;
  // The ids of edges the run has already followed
  takenEdges: Set<string>;
  // The ids of edges the run is travelling along right now
  activeEdges: Set<string>;
};

// The "nothing is happening" state; shared and never modified
export const EMPTY_RUN_VISUAL_STATE: RunVisualState = {
  hasRun: false,
  nodes: new Map<string, NodeRunState>(),
  takenEdges: new Set<string>(),
  activeEdges: new Set<string>(),
};

// Work out how every node and edge should look for a given run
export function deriveRunVisualState(graph: StoredGraph, run: RunRecord | null): RunVisualState {
  // With no run there is nothing to show
  if (!run) return EMPTY_RUN_VISUAL_STATE;
  // Collect node states, taken edges and active edges here
  const nodes = new Map<string, NodeRunState>();
  const takenEdges = new Set<string>();
  const activeEdges = new Set<string>();
  // Remember the most recently followed edge
  let lastTakenEdge: string | null = null;
  // A run that has not finished yet is "in progress"
  const inProgress = run.status === "queued" || run.status === "running";

  // Walk through every finished step in order
  for (const step of run.steps) {
    // Errored nodes turn red and have no outgoing edge
    if (step.status === "errored") {
      nodes.set(step.nodeId, "errored");
      continue;
    }
    // Skip steps without an answer
    if (step.answer === null) continue;
    // Mark the node with the answer it gave
    nodes.set(step.nodeId, step.answer === "YES" ? "yes" : "no");
    // Work out which branch the answer chose
    const branch = step.answer === "YES" ? "yes" : "no";
    // Find the edge that leaves this node on that branch
    const edge = graph.edges.find((candidate) => candidate.source === step.nodeId && candidate.type === branch);
    // Remember it as taken
    if (edge) {
      takenEdges.add(edge.id);
      lastTakenEdge = edge.id;
    }
  }

  // A node that is being evaluated right now
  if (run.active) {
    // Mark it as running
    nodes.set(run.active.nodeId, "running");
    // Animate the taken edge that leads into it
    for (const edge of graph.edges) {
      if (takenEdges.has(edge.id) && edge.target === run.active.nodeId) activeEdges.add(edge.id);
    }
  } else if (inProgress) {
    // Between nodes, or before the first one starts
    if (run.steps.length === 0) {
      // Mark the entry node as running
      const entry = getEntryNodeIds(graph)[0];
      if (entry) nodes.set(entry, "running");
    } else if (lastTakenEdge) {
      // Animate the edge the run is travelling along to reach the next node
      activeEdges.add(lastTakenEdge);
    }
  }

  // Return everything the canvas needs
  return { hasRun: takenEdges.size > 0, nodes, takenEdges, activeEdges };
}
