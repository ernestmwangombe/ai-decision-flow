// The lifecycle of a whole run
export type RunStatus = "queued" | "running" | "completed" | "failed";

// The outcome of one node's step
export type StepStatus = "completed" | "errored";

// The node currently being processed
export type ActiveNode = {
  // The id of the node being processed
  nodeId: string;
  // The question that node asks
  prompt: string;
  // Its position in the execution order (1 = first node visited)
  order: number;
};

// One logbook entry: what happened at one node
export type StepRecord = {
  // Execution order, starting at 1
  order: number;
  // The node that was evaluated
  nodeId: string;
  // The question the node asked
  prompt: string;
  // Whether the node finished normally or ended in an error
  status: StepStatus;
  // The validated answer, or null if the node errored
  answer: "YES" | "NO" | null;
  // How many model attempts were used (1 or 2)
  attempts: number;
  // The raw model replies, trimmed, kept for debugging
  rawReplies: string[];
  // The error message if the node errored
  error: string | null;
  // How long the node took in milliseconds
  durationMs: number;
};

// The full logbook for one run
export type RunRecord = {
  // A unique id for the run
  runId: string;
  // Where the run is in its lifecycle
  status: RunStatus;
  // The text the workflow is evaluating
  input: string;
  // Every node visited so far, in execution order
  steps: StepRecord[];
  // The node currently being processed, or null
  active: ActiveNode | null;
  // The failure message if the run failed
  error: string | null;
  // When the run was created (ISO timestamp)
  startedAt: string;
  // When the run finished (ISO timestamp), or null while still going
  finishedAt: string | null;
};
