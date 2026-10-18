// Import Zod to validate incoming requests
import { z } from "zod";
// Import the saved-graph schema and type from Phase 2
import { storedGraphSchema, type StoredGraph } from "./graph-schema";

// The longest input text we accept (protects the model call and the event payload)
export const MAX_INPUT_LENGTH = 4000;

// The longest node prompt we accept
export const MAX_PROMPT_LENGTH = 500;

// The shape of a "start a run" request: a graph plus the text to evaluate
export const runRequestSchema = z.object({
  // The graph must pass the same integrity checks used when loading from localStorage
  graph: storedGraphSchema,
  // The input text must be non-empty and not too long
  input: z
    .string()
    .trim()
    .min(1, "Input text is required")
    .max(MAX_INPUT_LENGTH, `Input text must be at most ${MAX_INPUT_LENGTH} characters`),
});

// The Inngest event payload is the request plus the run id
export const runEventSchema = runRequestSchema.extend({
  // The id the UI uses to poll for progress
  runId: z.string().min(1),
});

// Find every node that has no incoming edge (a valid workflow has exactly one)
export function getEntryNodeIds(graph: StoredGraph): string[] {
  // Collect every node id that some edge points to
  const targets = new Set(graph.edges.map((edge) => edge.target));
  // The entry nodes are the ones nobody points to
  return graph.nodes.filter((node) => !targets.has(node.id)).map((node) => node.id);
}

// Detect loops using Kahn's algorithm: peel off nodes with no incoming edges until none are left
export function hasCycle(graph: StoredGraph): boolean {
  // Count incoming edges for every node, starting at zero
  const indegree = new Map<string, number>(graph.nodes.map((node): [string, number] => [node.id, 0]));
  // Add one for every edge that points at a node
  for (const edge of graph.edges) {
    // Increase the target's count
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  // Start with all nodes that nothing points to
  const queue = graph.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  // Count how many nodes we managed to peel off
  let processed = 0;
  // Keep peeling while there are nodes in the queue
  while (queue.length > 0) {
    // Take the next node
    const current = queue.shift() as string;
    // Count it
    processed += 1;
    // Look at every edge leaving this node
    for (const edge of graph.edges) {
      // Skip edges that leave other nodes
      if (edge.source !== current) continue;
      // Remove this edge from the target's incoming count
      const remaining = (indegree.get(edge.target) ?? 0) - 1;
      // Save the new count
      indegree.set(edge.target, remaining);
      // If nothing else points at the target, it is ready to be peeled off
      if (remaining === 0) queue.push(edge.target);
    }
  }
  // If some nodes could never be peeled off, they are part of a loop
  return processed < graph.nodes.length;
}

// Check that a graph can actually be run; returns a list of human-readable problems (empty means OK)
export function validateRunnableGraph(graph: StoredGraph): string[] {
  // Collect problems here
  const problems: string[] = [];
  // An empty graph has nothing to run
  if (graph.nodes.length === 0) {
    // Return immediately because the other checks make no sense without nodes
    return ["The graph has no nodes. Add at least one decision node."];
  }
  // Find the entry nodes
  const entries = getEntryNodeIds(graph);
  // No entry node usually means everything is part of a loop
  if (entries.length === 0) {
    problems.push("No entry node found: every node has an incoming edge.");
  } else if (entries.length > 1) {
    // More than one entry node means some nodes are not connected to the main flow
    problems.push(
      `Found ${entries.length} entry nodes. Connect them so only one node has no incoming edge.`
    );
  }
  // Loops would make a run never finish
  if (hasCycle(graph)) {
    problems.push("The graph contains a loop. Remove the edge that points back.");
  }
  // Check every prompt
  for (const node of graph.nodes) {
    // Trim whitespace before measuring
    const prompt = node.data.prompt.trim();
    // Describe the node by its position, because ids are not human-friendly
    const where = `The node near (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`;
    // Empty prompts cannot be sent to the model
    if (prompt.length === 0) {
      problems.push(`${where} has an empty prompt.`);
    } else if (prompt.length > MAX_PROMPT_LENGTH) {
      // Very long prompts are rejected to keep calls cheap and predictable
      problems.push(`${where} has a prompt longer than ${MAX_PROMPT_LENGTH} characters.`);
    }
  }
  // Return everything we found
  return problems;
}

// Decide which node comes next, given the answer at the current node (null means the path ends here)
export function nextNodeId(graph: StoredGraph, nodeId: string, answer: "YES" | "NO"): string | null {
  // YES follows the "yes" edge and NO follows the "no" edge
  const branch = answer === "YES" ? "yes" : "no";
  // Find the edge that leaves this node on that branch
  const edge = graph.edges.find((candidate) => candidate.source === nodeId && candidate.type === branch);
  // Return its target, or null if that branch is not connected
  return edge ? edge.target : null;
}
