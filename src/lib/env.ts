// Import Zod, a library that validates data against a schema
import { z } from "zod";

// Describe exactly what shape our environment variables must have
const envSchema = z.object({
  // The API key must be a non-empty string
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is missing in .env.local"),
  // The model name must be a non-empty string, with a sensible default
  GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite-preview"),
});

// Export a function (not a constant) so validation runs only when we need it
export function getEnv() {
  // Read the raw values from process.env and validate them against the schema
  return envSchema.parse({
    // Pass the API key through for validation
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    // Pass the model name through for validation
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  });
}
