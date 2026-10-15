// Import Zod to validate whatever we read back from localStorage
import { z } from "zod";
// Import React Flow's marker enum and types so edges get arrowheads
import { MarkerType, type Edge, type Node } from "@xyflow/react";

// The data stored inside every decision node: just the prompt text
export type DecisionNodeData = { prompt: string };

// A React Flow node whose type is "decision" and whose data is DecisionNodeData
export type DecisionNodeType = Node<DecisionNodeData, "decision">;

// The only two branches a decision can take
export const branchSchema = z.enum(["yes", "no"]);

// A TypeScript type derived from the schema: "yes" | "no"
export type Branch = z.infer<typeof branchSchema>;

// The React Flow node type name we register for our custom node
export const NODE_TYPE = "decision" as const;

// The localStorage key; the v1 suffix lets us change the format later without clashes
export const STORAGE_KEY = "ai-decision-flow:graph:v1";

// Colors for each branch, shared by handles, edges and labels
export const BRANCH_COLORS: Record<Branch, string> = {
  // Green for the YES path
  yes: "#16a34a",
  // Red for the NO path
  no: "#dc2626",
};

// Schema for one saved node: an id, a position, and the prompt text
const storedNodeSchema = z.object({
  // The node id must be a non-empty string
  id: z.string().min(1),
  // The position must hold two numbers
  position: z.object({ x: z.number(), y: z.number() }),
  // The data must hold a prompt string
  data: z.object({ prompt: z.string() }),
});

// Schema for one saved edge: an id, two node ids, and which branch it represents
const storedEdgeSchema = z.object({
  // The edge id must be a non-empty string
  id: z.string().min(1),
  // The id of the node the edge starts from
  source: z.string().min(1),
  // The id of the node the edge points to
  target: z.string().min(1),
  // The branch: "yes" or "no" (this also decides which handle it leaves from)
  type: branchSchema,
});

// Schema for the whole saved graph, with extra integrity rules on top
export const storedGraphSchema = z
  .object({
    // A list of saved nodes
    nodes: z.array(storedNodeSchema),
    // A list of saved edges
    edges: z.array(storedEdgeSchema),
  })
  // Run extra cross-checks that simple field validation cannot express
  .superRefine((graph, ctx) => {
    // Collect every node id so we can check edges against them
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    // Reject graphs where two nodes share an id
    if (nodeIds.size !== graph.nodes.length) {
      ctx.addIssue({ code: "custom", message: "Duplicate node ids" });
    }
    // Track which (node, branch) pairs already have an outgoing edge
    const usedBranches = new Set<string>();
    // Check every edge one by one
    for (const edge of graph.edges) {
      // Reject edges that point to or from a node that does not exist
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        ctx.addIssue({ code: "custom", message: `Edge ${edge.id} points to a missing node` });
      }
      // Build a key such as "node-1:yes"
      const key = `${edge.source}:${edge.type}`;
      // Reject a node that has two edges for the same branch
      if (usedBranches.has(key)) {
        ctx.addIssue({ code: "custom", message: `Node ${edge.source} has two ${edge.type} edges` });
      }
      // Remember that this branch is now used
      usedBranches.add(key);
    }
  });

// A TypeScript type for a validated saved graph
export type StoredGraph = z.infer<typeof storedGraphSchema>;

// The board people see the first time they open the app (the assignment's example, extended)
export const STARTER_GRAPH: StoredGraph = {
  // Three decision nodes
  nodes: [
    // The root question
    { id: "n1", position: { x: 60, y: 120 }, data: { prompt: "Is this a support request?" } },
    // Where YES goes
    { id: "n2", position: { x: 460, y: 20 }, data: { prompt: "Is the customer reporting a billing problem?" } },
    // Where NO goes
    { id: "n3", position: { x: 460, y: 320 }, data: { prompt: "Is the customer interested in buying?" } },
  ],
  // Two edges leaving the root node
  edges: [
    // The YES edge from n1 to n2
    { id: "e1", source: "n1", target: "n2", type: "yes" },
    // The NO edge from n1 to n3
    { id: "e2", source: "n1", target: "n3", type: "no" },
  ],
};

// Build a full React Flow edge from our minimal saved shape
export function buildEdge(id: string, source: string, target: string, branch: Branch): Edge {
  // Return an edge whose type, handle and arrow color all follow the branch
  return {
    // Unique id for this edge
    id,
    // Where the edge starts
    source,
    // Where the edge ends
    target,
    // Leave from the handle named "yes" or "no"
    sourceHandle: branch,
    // Use our custom edge component registered under the same name
    type: branch,
    // Draw a colored arrowhead at the end
    markerEnd: { type: MarkerType.ArrowClosed, color: BRANCH_COLORS[branch] },
  };
}

// Convert a validated saved graph into live React Flow nodes and edges
export function fromStoredGraph(graph: StoredGraph): { nodes: DecisionNodeType[]; edges: Edge[] } {
  // Return both lists
  return {
    // Turn each saved node into a React Flow node of our custom type
    nodes: graph.nodes.map((node) => ({
      // Keep the id
      id: node.id,
      // Use our custom node type
      type: NODE_TYPE,
      // Keep the position
      position: node.position,
      // Keep the prompt
      data: { prompt: node.data.prompt },
    })),
    // Turn each saved edge into a full React Flow edge
    edges: graph.edges.map((edge) => buildEdge(edge.id, edge.source, edge.target, edge.type)),
  };
}

// Convert live React Flow state into the minimal shape we save
export function toStoredGraph(nodes: DecisionNodeType[], edges: Edge[]): StoredGraph {
  // Return only the fields we care about, dropping React Flow's internal extras
  return {
    // Keep id, position and prompt for each node
    nodes: nodes.map((node) => ({
      // The node id
      id: node.id,
      // The node position
      position: { x: node.position.x, y: node.position.y },
      // The prompt text
      data: { prompt: node.data.prompt },
    })),
    // Keep id, endpoints and branch for each edge; ignore edges with an unknown type
    edges: edges.flatMap((edge) => {
      // Check that the edge type is "yes" or "no"
      const branch = branchSchema.safeParse(edge.type);
      // Skip anything else
      if (!branch.success) return [];
      // Keep the edge in its minimal form
      return [{ id: edge.id, source: edge.source, target: edge.target, type: branch.data }];
    }),
  };
}

// Read the saved graph from localStorage, returning null if it is missing or invalid
export function loadGraph(): StoredGraph | null {
  // Wrap everything because localStorage and JSON.parse can both throw
  try {
    // Read the raw text saved earlier
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Nothing saved yet
    if (!raw) return null;
    // Validate the parsed JSON against our schema
    const result = storedGraphSchema.safeParse(JSON.parse(raw));
    // Return the data only if it passed every rule
    return result.success ? result.data : null;
  } catch {
    // Any failure means "no usable save", so the caller falls back to the starter graph
    return null;
  }
}

// Write the current graph to localStorage
export function saveGraph(nodes: DecisionNodeType[], edges: Edge[]): void {
  // Wrap in try/catch because storage can be full or disabled
  try {
    // Convert to the minimal shape and save as JSON text
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStoredGraph(nodes, edges)));
  } catch {
    // Saving is a convenience, so a failure should never crash the editor
  }
}

// Check whether adding an edge from source to target would create a loop
export function wouldCreateCycle(
  // The edges that already exist
  edges: { source: string; target: string }[],
  // The node the new edge would start from
  source: string,
  // The node the new edge would point to
  target: string
): boolean {
  // A node pointing at itself is the smallest possible loop
  if (source === target) return true;
  // Start walking forward from the target node
  const stack = [target];
  // Remember nodes we already visited so we never walk in circles
  const seen = new Set<string>();
  // Keep walking while there are nodes left to visit
  while (stack.length > 0) {
    // Take the next node to visit
    const current = stack.pop() as string;
    // If we can reach the source, the new edge would close a loop
    if (current === source) return true;
    // Skip nodes we have already visited
    if (seen.has(current)) continue;
    // Mark this node as visited
    seen.add(current);
    // Queue every node that this node points to
    for (const edge of edges) {
      // Only follow edges that leave the current node
      if (edge.source === current) stack.push(edge.target);
    }
  }
  // We never reached the source, so the new edge is safe
  return false;
}
