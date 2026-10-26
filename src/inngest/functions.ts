// Import the error type that tells Inngest "do not retry this"
import { NonRetriableError } from "inngest";
// Import the shared Inngest client we created in Phase 1
import { inngest } from "./client";
// Import the YES/NO decision helper and its error type
import { askYesNo, InvalidDecisionError } from "@/lib/decide";
import { demoStepDelay } from "@/lib/demo-delay";
// Import the logbook helpers
import { completeRun, failRun, markRunning, recordStep, setActiveNode } from "@/lib/run-store";
// Import the graph helpers and the event schema
import { getEntryNodeIds, nextNodeId, runEventSchema, validateRunnableGraph } from "@/lib/workflow-engine";

// The Phase 1 smoke-test function, kept so the dashboard check still works
export const helloWorld = inngest.createFunction(
  // Give the function a unique ID shown in the dashboard
  { id: "hello-world" },
  // Tell Inngest which event triggers this function
  { event: "test/hello" },
  // The handler receives the event payload and a "step" toolkit
  async ({ event, step }) => {
    // Wrap work in step.run so Inngest tracks it as a retryable, logged step
    const greeting = await step.run("build-greeting", async () => {
      // Use the name from the event if provided, otherwise say "world"
      return `Hello, ${event.data?.name ?? "world"}!`;
    });
    // Return the result so it appears in the run output
    return { greeting };
  }
);

// The workflow runner: walks the graph one node at a time, using one Inngest step per node
export const runWorkflow = inngest.createFunction(
  {
    // A unique ID shown in the dashboard
    id: "run-workflow",
    // Retry infrastructure problems (rate limits, network errors) up to 3 times
    retries: 3,
    // Runs once if the whole function ends in failure, so the logbook always shows the failure
    onFailure: async ({ event, error }) => {
      // Recover the original run id from the failed event
      const original = runEventSchema.safeParse(event.data.event.data);
      // Mark the run as failed in the logbook if we could read the id
      if (original.success) failRun(original.data.runId, error.message);
    },
  },
  // Start whenever a "workflow/run" event arrives
  { event: "workflow/run" },
  // The handler receives the event and the step toolkit
  async ({ event, step }) => {
    // Validate the event payload; a malformed event can never succeed, so do not retry it
    const parsed = runEventSchema.safeParse(event.data);
    // Reject malformed events
    if (!parsed.success) throw new NonRetriableError("Invalid workflow/run event payload.");
    // Pull out the pieces we need
    const { runId, input, graph } = parsed.data;

    // Validate the graph again on the server, because the client can never be trusted
    const problems = validateRunnableGraph(graph);
    // Refuse to run a broken graph, without retrying
    if (problems.length > 0) throw new NonRetriableError(problems.join(" "));

    // Index nodes by id for quick lookup during traversal
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node] as const));

    // Step 1: flip the run to "running" in the logbook
    await step.run("mark-running", async () => {
      // Update the logbook
      markRunning(runId);
      // Return something JSON-friendly
      return { ok: true };
    });

    // Start at the single entry node
    let currentId: string | null = getEntryNodeIds(graph)[0] ?? null;
    // Remember the path we took
    const path: Array<{ nodeId: string; answer: "YES" | "NO" }> = [];
    // Track the execution order
    let order = 0;

    // Keep walking until a branch has no outgoing edge
    while (currentId !== null) {
      // This is the next node to execute
      order += 1;
      // Look the node up
      const node = nodesById.get(currentId);
      // A missing node means the graph is corrupt
      if (!node) throw new NonRetriableError(`Node ${currentId} is missing from the graph.`);
      // Safety net: we can never visit more nodes than exist
      if (order > graph.nodes.length) throw new NonRetriableError("Traversal visited more nodes than exist.");
      // Freeze the order for use inside the step callback
      const stepOrder = order;

      // Each node is exactly one Inngest step
      const result = await step.run(`decide-${node.id}`, async () => {
        // Tell the logbook which node we are working on
        setActiveNode(runId, { nodeId: node.id, prompt: node.data.prompt, order: stepOrder });
        // Start the stopwatch
        const startedAt = Date.now();
        try {
          // Ask the model, with strict parsing and one stricter retry inside
          await demoStepDelay();
          const decision = await askYesNo(node.data.prompt, input);
          // Write the successful result to the logbook
          recordStep(runId, {
            // Position in the execution order
            order: stepOrder,
            // Which node this was
            nodeId: node.id,
            // The question it asked
            prompt: node.data.prompt,
            // It finished normally
            status: "completed",
            // The validated answer
            answer: decision.answer,
            // How many attempts it took
            attempts: decision.attempts,
            // What the model said
            rawReplies: decision.rawReplies,
            // No error
            error: null,
            // How long it took
            durationMs: Date.now() - startedAt,
          });
          // Return the answer so Inngest saves it for replays
          return { answer: decision.answer, attempts: decision.attempts };
        } catch (error) {
          // Invalid model output: mark this node as errored and stop the whole run
          if (error instanceof InvalidDecisionError) {
            // Write the errored node to the logbook
            recordStep(runId, {
              // Position in the execution order
              order: stepOrder,
              // Which node this was
              nodeId: node.id,
              // The question it asked
              prompt: node.data.prompt,
              // It ended in an error
              status: "errored",
              // There is no valid answer
              answer: null,
              // Both attempts were used
              attempts: error.rawReplies.length,
              // What the model said each time
              rawReplies: error.rawReplies,
              // Why it errored
              error: error.message,
              // How long it took
              durationMs: Date.now() - startedAt,
            });
            // Retrying the whole step would not help, so tell Inngest to give up and fail the run
            throw new NonRetriableError(error.message);
          }
          // Anything else (rate limit, network error) is an infrastructure problem: let Inngest retry the step
          throw error;
        }
      });

      // Remember what happened at this node
      path.push({ nodeId: node.id, answer: result.answer });
      // Follow the YES or NO edge to the next node (null ends the loop)
      currentId = nextNodeId(graph, node.id, result.answer);
    }

    // Final step: mark the run as completed in the logbook
    await step.run("finish-run", async () => {
      // Update the logbook
      completeRun(runId);
      // Return something JSON-friendly
      return { ok: true };
    });

    // The function's return value appears in the Inngest dashboard
    return { runId, nodesVisited: path.length, path };
  }
);

// Export the list of all functions so the API route can register them
export const functions = [helloWorld, runWorkflow];
