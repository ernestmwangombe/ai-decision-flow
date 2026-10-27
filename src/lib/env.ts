// Import Zod, a library that validates data against a schema
import { z } from "zod";

// Describe exactly what shape our environment variables must have
const envSchema = z.object({
  // The API key must be a non-empty string
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is missing in .env.local"),
  // The model name must be a non-empty string, with a sensible default
  GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
  // A dev-only switch that fakes bad model replies so we can test the retry and failure paths
  LLM_FAULT_INJECTION: z.enum(["none", "invalid-once", "invalid-always"]).default("none"),
  // A dev-only pause (in milliseconds) inside each node, so runs are slow enough to watch
  DEMO_STEP_DELAY_MS: z.coerce.number().int().min(0).max(10000).default(0),
});

// Export a function (not a constant) so validation runs only when we need it
export function getEnv() {
  // Read the raw values from process.env and validate them against the schema
  return envSchema.parse({
    // Pass the API key through for validation
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    // Pass the model name through for validation
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    // Treat an empty string like "not set" so the default ("none") applies
    LLM_FAULT_INJECTION: process.env.LLM_FAULT_INJECTION || undefined,
    // Treat an empty string like "not set" so the default (0) applies
    DEMO_STEP_DELAY_MS: process.env.DEMO_STEP_DELAY_MS || undefined,
  });
}
