// Import the OpenAI SDK, which we reuse to talk to Gemini
import OpenAI from "openai";
// Import our validated environment loader
import { getEnv } from "./env";

// Export a function that builds a ready-to-use LLM client
export function getLlm() {
  // Load and validate the environment variables
  const env = getEnv();

  // Return an object bundling the client, the model name and the fault setting together
  return {
    // Create an OpenAI-SDK client pointed at Google's OpenAI-compatible endpoint
    client: new OpenAI({
      // Authenticate with the Gemini API key
      apiKey: env.GEMINI_API_KEY,
      // Redirect all requests from OpenAI's servers to Google's compatibility layer
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      // Turn off the SDK's own retries, because Inngest owns retrying (no double retries)
      maxRetries: 0,
      // Give up on a single model request after 30 seconds
      timeout: 30_000,
    }),
    // Pass along the model name so callers never hardcode it
    model: env.GEMINI_MODEL,
    // Pass along the fault-injection setting for the decision code
    fault: env.LLM_FAULT_INJECTION,
  };
}
