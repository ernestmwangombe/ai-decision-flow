// Import the shared run types
import type { ActiveNode, RunRecord, StepRecord } from "./run-types";

// Keep only the most recent runs so memory never grows without limit
const MAX_RUNS = 50;

// Next.js can load this file more than once in dev, so the store lives on globalThis to stay shared
const globalStore = globalThis as unknown as { __aiDecisionFlowRuns?: Map<string, RunRecord> };

// Reuse the existing store if there is one, otherwise create it
const runs: Map<string, RunRecord> = globalStore.__aiDecisionFlowRuns ?? new Map<string, RunRecord>();

// Remember the store on globalThis for the next load
globalStore.__aiDecisionFlowRuns = runs;

// Create a new run record in the "queued" state
export function createRun(runId: string, input: string): RunRecord {
  // Build the record
  const record: RunRecord = {
    // The run id
    runId,
    // Waiting for Inngest to pick it up
    status: "queued",
    // The text being evaluated
    input,
    // No steps yet
    steps: [],
    // Nothing active yet
    active: null,
    // No error yet
    error: null,
    // Timestamp for when we created it
    startedAt: new Date().toISOString(),
    // Not finished yet
    finishedAt: null,
  };
  // Save it in the store
  runs.set(runId, record);
  // Drop the oldest runs when we are over the limit
  while (runs.size > MAX_RUNS) {
    // Maps iterate in insertion order, so the first key is the oldest run
    const oldest = runs.keys().next().value;
    // Stop if there is nothing to delete
    if (oldest === undefined) break;
    // Delete the oldest run
    runs.delete(oldest);
  }
  // Return the new record
  return record;
}

// Look up a run by id
export function getRun(runId: string): RunRecord | null {
  // Return the record or null if it is unknown
  return runs.get(runId) ?? null;
}

// Move a queued run into the "running" state
export function markRunning(runId: string): void {
  // Find the record
  const record = runs.get(runId);
  // Only a queued run can start running
  if (record && record.status === "queued") record.status = "running";
}

// Remember which node is being processed right now
export function setActiveNode(runId: string, active: ActiveNode): void {
  // Find the record
  const record = runs.get(runId);
  // Store the active node if the run exists
  if (record) record.active = active;
}

// Save one step's outcome; saving the same order twice replaces it, so replays never duplicate entries
export function recordStep(runId: string, step: StepRecord): void {
  // Find the record
  const record = runs.get(runId);
  // Ignore unknown runs (for example after a dev-server restart)
  if (!record) return;
  // Replace any earlier entry with the same order, add the new one, and keep the list sorted
  record.steps = [...record.steps.filter((existing) => existing.order !== step.order), step].sort(
    (a, b) => a.order - b.order
  );
  // This node is finished, so nothing is active now
  record.active = null;
}

// Mark a run as successfully finished
export function completeRun(runId: string): void {
  // Find the record
  const record = runs.get(runId);
  // Ignore unknown runs
  if (!record) return;
  // Set the final status
  record.status = "completed";
  // Nothing is active anymore
  record.active = null;
  // Record when it finished
  record.finishedAt = new Date().toISOString();
}

// Mark a run as failed, and flag the node it was working on if that node has no entry yet
export function failRun(runId: string, message: string): void {
  // Find the record
  const record = runs.get(runId);
  // Ignore unknown runs and never overwrite a successful run
  if (!record || record.status === "completed") return;
  // Remember the active node before we clear it
  const active = record.active;
  // If a node was in progress and has no logbook entry, add an errored entry for it
  if (active && !record.steps.some((step) => step.order === active.order)) {
    // Add the errored entry
    record.steps.push({
      // Same position it would have had
      order: active.order,
      // The node that was running
      nodeId: active.nodeId,
      // The question it asked
      prompt: active.prompt,
      // It errored
      status: "errored",
      // There is no valid answer
      answer: null,
      // We do not know how many attempts were used
      attempts: 0,
      // No replies were captured
      rawReplies: [],
      // Why it failed
      error: message,
      // Unknown duration
      durationMs: 0,
    });
  }
  // Set the final status
  record.status = "failed";
  // Store the failure message
  record.error = message;
  // Nothing is active anymore
  record.active = null;
  // Record when it ended
  record.finishedAt = new Date().toISOString();
}
