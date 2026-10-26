// Import Zod to validate the imported file
import { z } from "zod";
// Import the saved-graph schema and type from Phase 2
import { storedGraphSchema, type StoredGraph } from "./graph-schema";
// Import the prompt limit and the loop detector from Phase 3
import { MAX_PROMPT_LENGTH, hasCycle } from "./workflow-engine";

// The largest file we will read (about 200 KB)
export const MAX_IMPORT_BYTES = 200_000;
// The most nodes an imported graph may have
export const MAX_IMPORT_NODES = 50;
// The largest canvas coordinate we accept, so nodes cannot be placed absurdly far away
const MAX_COORDINATE = 100_000;
// Ids may only contain letters, digits, underscores and hyphens
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

// The shape of an exported file: a label, a version and the graph
const exportFileSchema = z.object({
  // Identifies files made by this app
  app: z.literal("ai-decision-flow"),
  // The file format version, so we can change it later
  version: z.literal(1),
  // When the file was exported
  exportedAt: z.string(),
  // The graph itself, validated with the same rules as saved graphs
  graph: storedGraphSchema,
});

// Phrases that look like instructions aimed at the model rather than a question
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above)\s+(instructions|rules)/i,
  /disregard\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above)/i,
  /system\s+prompt/i,
  /answer\s+(yes|no)\s+to\s+(every|all|any)/i,
  /always\s+(answer|reply|respond)\s+(with\s+)?(yes|no)/i,
  /you\s+must\s+(always\s+)?(answer|reply|respond)/i,
];

// A rough check for prompts that read like instructions; a human still has to review them
export function looksLikeInstruction(text: string): boolean {
  // True if any pattern matches
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(text));
}

// The result of reading an import file: either a graph to review, or a list of problems
export type ImportResult =
  | { ok: true; graph: StoredGraph; flagged: number[] }
  | { ok: false; errors: string[] };

// Read and validate the text of an import file
export function parseImportText(text: string): ImportResult {
  // Refuse oversized files before parsing anything
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, errors: [`The file is larger than ${Math.round(MAX_IMPORT_BYTES / 1000)} KB.`] };
  }
  // Holds the parsed JSON
  let json: unknown;
  // Parsing can throw on invalid JSON
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["The file is not valid JSON."] };
  }
  // Validate the overall shape with Zod
  const parsed = exportFileSchema.safeParse(json);
  // Report the first few problems in readable form
  if (!parsed.success) {
    const errors = parsed.error.issues
      .slice(0, 6)
      .map((issue) => (issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ${issue.message}` : issue.message));
    return { ok: false, errors };
  }
  // The graph passed the schema, so now apply our own safety rules
  const graph = parsed.data.graph;
  // Collect problems here
  const errors: string[] = [];
  // An empty graph is useless
  if (graph.nodes.length === 0) errors.push("The graph has no nodes.");
  // Very large graphs are rejected
  if (graph.nodes.length > MAX_IMPORT_NODES) errors.push(`The graph has more than ${MAX_IMPORT_NODES} nodes.`);
  // Check every node
  graph.nodes.forEach((node, index) => {
    // Ids must be plain, so they can never carry markup or odd property names
    if (!SAFE_ID.test(node.id)) errors.push(`Node ${index + 1} has an id with unsupported characters.`);
    // Keep nodes inside a sensible canvas area
    if (Math.abs(node.position.x) > MAX_COORDINATE || Math.abs(node.position.y) > MAX_COORDINATE) {
      errors.push(`Node ${index + 1} is positioned outside the allowed area.`);
    }
    // Prompts must respect the same length limit used when running
    if (node.data.prompt.length > MAX_PROMPT_LENGTH) {
      errors.push(`Node ${index + 1} has a prompt longer than ${MAX_PROMPT_LENGTH} characters.`);
    }
  });
  // Check every edge id
  graph.edges.forEach((edge, index) => {
    if (!SAFE_ID.test(edge.id)) errors.push(`Edge ${index + 1} has an id with unsupported characters.`);
  });
  // Loops would make a run never finish
  if (hasCycle(graph)) errors.push("The graph contains a loop.");
  // Stop here if anything was wrong
  if (errors.length > 0) return { ok: false, errors: errors.slice(0, 8) };
  // Find the prompts that look like instructions, so the review dialog can highlight them
  const flagged = graph.nodes
    .map((node, index) => (looksLikeInstruction(node.data.prompt) ? index : -1))
    .filter((index) => index >= 0);
  // Return the graph for review
  return { ok: true, graph, flagged };
}

// Turn the current graph into the text of an export file
export function buildExportFile(graph: StoredGraph): string {
  // Wrap the graph with the label, version and timestamp
  const file = { app: "ai-decision-flow", version: 1, exportedAt: new Date().toISOString(), graph };
  // Pretty-print with two spaces so the file is easy to read and diff
  return JSON.stringify(file, null, 2);
}

// Ask the browser to download some text as a file
export function downloadTextFile(filename: string, text: string): void {
  // Wrap the text in a blob
  const blob = new Blob([text], { type: "application/json" });
  // Make a temporary URL for the blob
  const url = URL.createObjectURL(blob);
  // Create a hidden link that points at it
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // Add it to the page, click it, and remove it again
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Release the temporary URL
  URL.revokeObjectURL(url);
}
