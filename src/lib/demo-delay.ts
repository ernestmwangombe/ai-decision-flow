// Import our validated environment loader
import { getEnv } from "./env";

// Wait for the configured demo delay; does nothing in production or when the delay is 0
export async function demoStepDelay(): Promise<void> {
  // Never slow down production runs
  if (process.env.NODE_ENV === "production") return;
  // Read the delay from the validated environment
  const ms = getEnv().DEMO_STEP_DELAY_MS;
  // Wait only if a delay was requested
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}
