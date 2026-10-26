// Import Zod so saved history is validated when it is loaded
import { z } from "zod";
// Import the run type
import type { RunRecord } from "./run-types";

// The localStorage key; the v1 suffix lets us change the format later
export const HISTORY_KEY = "ai-decision-flow:history:v1";
// Keep only the most recent runs
export const MAX_HISTORY = 25;

// Schema for one step in a saved run
const stepSchema = z.object({
  // Position in the execution order
  order: z.number().int(),
  // The node that was evaluated
  nodeId: z.string(),
  // The question the node asked
  prompt: z.string(),
  // Whether the node finished normally or errored
  status: z.enum(["completed", "errored"]),
  // The validated answer, or null if the node errored
  answer: z.enum(["YES", "NO"]).nullable(),
  // How many model attempts were used
  attempts: z.number().int(),
  // The trimmed raw model replies
  rawReplies: z.array(z.string()),
  // The error message, if any
  error: z.string().nullable(),
  // How long the node took
  durationMs: z.number(),
});

// Schema for one saved run
const runSchema = z.object({
  // The run id
  runId: z.string(),
  // The final status
  status: z.enum(["queued", "running", "completed", "failed"]),
  // The text that was evaluated
  input: z.string(),
  // Every step of the run
  steps: z.array(stepSchema),
  // The node that was active (null for finished runs)
  active: z.object({ nodeId: z.string(), prompt: z.string(), order: z.number().int() }).nullable(),
  // The failure message, if any
  error: z.string().nullable(),
  // When the run started
  startedAt: z.string(),
  // When the run finished
  finishedAt: z.string().nullable(),
});

// Schema for the whole saved list
const historySchema = z.array(runSchema);

// Read the saved history, returning an empty list if it is missing or invalid
export function loadHistory(): RunRecord[] {
  // localStorage and JSON.parse can both throw
  try {
    // Read the saved text
    const raw = window.localStorage.getItem(HISTORY_KEY);
    // Nothing saved yet
    if (!raw) return [];
    // Validate the parsed JSON
    const result = historySchema.safeParse(JSON.parse(raw));
    // Use it only if it passed every rule
    return result.success ? result.data : [];
  } catch {
    // Any failure means "no usable history"
    return [];
  }
}

// Write the history list to localStorage
function saveHistory(runs: RunRecord[]): void {
  // Saving is a convenience, so a failure must never crash the app
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(runs));
  } catch {
    // Ignore storage errors such as a full disk or disabled storage
  }
}

// Add a finished run to the history (newest first) and return the updated list
export function addToHistory(run: RunRecord): RunRecord[] {
  // Only finished runs belong in the history
  if (run.status !== "completed" && run.status !== "failed") return loadHistory();
  // Put the run first, drop any older copy of it, and trim the list
  const next = [run, ...loadHistory().filter((existing) => existing.runId !== run.runId)].slice(0, MAX_HISTORY);
  // Save the new list
  saveHistory(next);
  // Return it so the UI can update
  return next;
}

// Delete the saved history
export function clearHistory(): void {
  // Removing can throw if storage is disabled
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
}
