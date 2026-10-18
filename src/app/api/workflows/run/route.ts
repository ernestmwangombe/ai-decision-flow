// Import Next.js's helper for returning JSON responses
import { NextResponse } from "next/server";
// Import the shared Inngest client so we can send events
import { inngest } from "@/inngest/client";
// Import the logbook helpers
import { createRun, failRun } from "@/lib/run-store";
// Import the request schema and graph validator
import { runRequestSchema, validateRunnableGraph } from "@/lib/workflow-engine";

// Handle POST requests to /api/workflows/run
export async function POST(request: Request) {
  // Holds the parsed JSON body
  let body: unknown;
  // Reading the body can fail if it is not valid JSON
  try {
    // Parse the body
    body = await request.json();
  } catch {
    // Tell the client the body was unreadable
    return NextResponse.json({ ok: false, errors: ["Request body must be valid JSON."] }, { status: 400 });
  }

  // Validate the shape of the request with Zod
  const parsed = runRequestSchema.safeParse(body);
  // Reject invalid requests with readable messages
  if (!parsed.success) {
    // Turn each Zod issue into a short message
    const errors = parsed.error.issues.map((issue) =>
      issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ${issue.message}` : issue.message
    );
    // Respond with 400 Bad Request
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  // Check that the graph is actually runnable (one entry node, no loops, no empty prompts)
  const problems = validateRunnableGraph(parsed.data.graph);
  // Reject unrunnable graphs
  if (problems.length > 0) {
    // Respond with 400 Bad Request and every problem found
    return NextResponse.json({ ok: false, errors: problems }, { status: 400 });
  }

  // Create a unique id for this run
  const runId = crypto.randomUUID();
  // Create the logbook entry so the UI can start polling immediately
  createRun(runId, parsed.data.input);

  // Hand the work to Inngest
  try {
    // Send the event that triggers the runWorkflow function
    await inngest.send({
      // The event name the function listens for
      name: "workflow/run",
      // The payload: run id, input text and the graph
      data: { runId, input: parsed.data.input, graph: parsed.data.graph },
    });
  } catch {
    // Mark the run as failed so the logbook is honest
    failRun(runId, "Could not reach Inngest.");
    // Tell the client what to check
    return NextResponse.json(
      { ok: false, errors: ["Could not reach the Inngest dev server. Is it running on http://localhost:8288?"] },
      { status: 502 }
    );
  }

  // 202 Accepted: the work has been queued, not finished
  return NextResponse.json({ ok: true, runId }, { status: 202 });
}
