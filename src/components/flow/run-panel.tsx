// Mark this as a client component because it uses state, effects and fetch
"use client";

// Import React hooks
import { useEffect, useState } from "react";
// Import Shadcn components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// Import the branch colors and the graph type
import { BRANCH_COLORS, type StoredGraph } from "@/lib/graph-schema";
// Import the run types
import type { RunRecord, StepRecord } from "@/lib/run-types";

// The panel needs the current graph so it can send it with the run request
type RunPanelProps = { graph: StoredGraph };

// Friendly labels for each run status
const STATUS_LABELS: Record<RunRecord["status"], string> = {
  // Waiting for Inngest
  queued: "Queued...",
  // Executing nodes
  running: "Running...",
  // Finished successfully
  completed: "Completed",
  // Stopped by an error
  failed: "Failed",
};

// One row in the execution trace
function StepRow({ step }: { step: StepRecord }) {
  // Did this node end in an error?
  const errored = step.status === "errored";
  // Render the row
  return (
    // Red background for errored nodes, neutral for the rest
    <li className={`rounded border p-2 text-xs ${errored ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
      {/* Top line: order and question on the left, answer on the right */}
      <div className="flex items-start justify-between gap-2">
        {/* The execution order and the node's question */}
        <span className="font-semibold text-slate-700">
          {step.order}. {step.prompt}
        </span>
        {/* The answer badge, or ERRORED */}
        {errored ? (
          <span className="shrink-0 font-bold text-red-600">ERRORED</span>
        ) : (
          <span
            className="shrink-0 font-bold"
            style={{ color: step.answer === "YES" ? BRANCH_COLORS.yes : BRANCH_COLORS.no }}
          >
            {step.answer}
          </span>
        )}
      </div>
      {/* Tell the user when the first reply was invalid but the retry worked */}
      {!errored && step.attempts > 1 ? (
        <p className="mt-1 text-amber-700">Needed a retry: the first reply was not a clean YES or NO.</p>
      ) : null}
      {/* Show the error message for errored nodes */}
      {errored ? <p className="mt-1 text-red-700">{step.error}</p> : null}
      {/* Show what the model actually said whenever something went wrong */}
      {step.rawReplies.length > 0 && (errored || step.attempts > 1) ? (
        <p className="mt-1 break-words text-slate-500">
          Model replies: {step.rawReplies.map((reply) => `"${reply}"`).join(" then ")}
        </p>
      ) : null}
    </li>
  );
}

// The panel that lets you run the workflow and watch its trace
export function RunPanel({ graph }: RunPanelProps) {
  // The text the workflow should evaluate
  const [input, setInput] = useState("");
  // The id of the run we are watching
  const [runId, setRunId] = useState<string | null>(null);
  // The latest logbook entry for that run
  const [run, setRun] = useState<RunRecord | null>(null);
  // Any problems to show the user
  const [errors, setErrors] = useState<string[]>([]);
  // True while the start request is in flight
  const [submitting, setSubmitting] = useState(false);

  // The panel is busy while submitting or while a watched run is unfinished
  const busy = submitting || (runId !== null && (run === null || run.status === "queued" || run.status === "running"));

  // Poll the status endpoint once per second while we are watching a run
  useEffect(() => {
    // Nothing to watch yet
    if (!runId) return;
    // Lets us ignore responses that arrive after cleanup
    let cancelled = false;
    // Count polls so we can give up after two minutes
    let polls = 0;
    // Start the polling timer
    const timer = setInterval(async () => {
      // Count this poll
      polls += 1;
      try {
        // Ask the server for the latest logbook entry
        const response = await fetch(`/api/workflows/status?runId=${encodeURIComponent(runId)}`);
        // Stop quietly if the component was unmounted or the run changed
        if (cancelled) return;
        // The run vanished (for example the dev server restarted)
        if (response.status === 404) {
          // Stop polling
          clearInterval(timer);
          // Explain what happened
          setErrors(["Lost track of the run. The dev server may have restarted."]);
          // Release the busy state
          setRunId(null);
          return;
        }
        // Ignore other temporary failures and try again on the next tick
        if (!response.ok) return;
        // Read the JSON body
        const data = await response.json();
        // Stop if cleanup happened while we were reading
        if (cancelled) return;
        // Show the latest logbook entry
        setRun(data.run as RunRecord);
        // Stop polling once the run is finished
        if (data.run.status === "completed" || data.run.status === "failed") clearInterval(timer);
      } catch {
        // Network blips are ignored; the next tick retries
      }
      // Give up after about two minutes
      if (polls >= 120) {
        // Stop polling
        clearInterval(timer);
        // Tell the user
        setErrors(["Stopped waiting after 2 minutes. Check the Inngest dashboard."]);
        // Release the busy state
        setRunId(null);
      }
    }, 1000);
    // Cleanup: stop polling when the run changes or the panel unmounts
    return () => {
      // Ignore late responses
      cancelled = true;
      // Stop the timer
      clearInterval(timer);
    };
  }, [runId]);

  // Start a new run
  async function startRun() {
    // Clear the previous results
    setErrors([]);
    setRun(null);
    setRunId(null);
    // Mark the request as in flight
    setSubmitting(true);
    try {
      // Send the graph and the input to the server
      const response = await fetch("/api/workflows/run", {
        // POST because we are creating a run
        method: "POST",
        // Tell the server the body is JSON
        headers: { "Content-Type": "application/json" },
        // The body: the current graph and the input text
        body: JSON.stringify({ graph, input }),
      });
      // Read the JSON reply
      const data = await response.json();
      // Show validation problems if the server refused the run
      if (!response.ok || !data.ok) {
        // Use the server's messages when present
        setErrors(Array.isArray(data.errors) ? data.errors : ["The run could not be started."]);
        return;
      }
      // Start watching the new run
      setRunId(data.runId);
    } catch {
      // The request itself failed
      setErrors(["Could not reach the server."]);
    } finally {
      // The request is no longer in flight
      setSubmitting(false);
    }
  }

  // Render the panel
  return (
    // A white card that scrolls if the trace gets long; "nowheel" stops the canvas zooming while you scroll it
    <div className="nowheel max-h-[75vh] w-80 space-y-3 overflow-y-auto rounded-lg border border-slate-300 bg-white p-3 text-slate-900 shadow-md">
      {/* The panel title */}
      <h2 className="text-sm font-semibold">Run workflow</h2>
      {/* The input text */}
      <Textarea
        // Give the field a name for accessibility and autofill
        name="run-input"
        // Describe the field for screen readers
        aria-label="Text for the workflow to evaluate"
        // The current text
        value={input}
        // Update the text as the user types
        onChange={(event) => setInput(event.target.value)}
        // Hint at what to write
        placeholder="Paste the message the workflow should evaluate..."
        // Styling
        className="min-h-20 bg-white text-sm text-slate-900"
      />
      {/* The run button, disabled while busy or when there is no input */}
      <Button onClick={startRun} disabled={busy || input.trim().length === 0} className="w-full">
        {busy ? "Running..." : "Run workflow"}
      </Button>

      {/* Show any validation or connection problems */}
      {errors.length > 0 ? (
        <ul className="space-y-1 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
          {errors.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      ) : null}

      {/* Show the execution trace once a run exists */}
      {run ? (
        <div className="space-y-2">
          {/* The overall status line */}
          <p className="text-xs font-semibold text-slate-600">Status: {STATUS_LABELS[run.status]}</p>
          {/* The ordered list of visited nodes */}
          <ol className="space-y-2">
            {run.steps.map((step) => (
              <StepRow key={step.order} step={step} />
            ))}
          </ol>
          {/* A summary of the path once the run finishes */}
          {run.status === "completed" ? (
            <p className="text-xs text-slate-600">
              Path: {run.steps.map((step) => step.answer).join(" -> ")} (end of branch)
            </p>
          ) : null}
          {/* The failure message if the run failed */}
          {run.status === "failed" ? <p className="text-xs font-semibold text-red-600">{run.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
