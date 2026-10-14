// Import the shared Inngest client we created above
import { inngest } from "./client";

// Define a simple function that runs whenever a "test/hello" event arrives
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

// Export the list of all functions so the API route can register them
export const functions = [helloWorld];
