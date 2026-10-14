// Import the OpenAI SDK, which we reuse to talk to Gemini
import OpenAI from "openai";
// Import our validated environment loader
import { getEnv } from "./env";

// Export a function that builds a ready-to-use LLM client
export function getLlm() {
  // Load and validate the environment variables
  const env = getEnv();

  // Return an object bundling the client and the model name together
  return {
    // Create an OpenAI-SDK client pointed at Google's OpenAI-compatible endpoint
    client: new OpenAI({
      // Authenticate with the Gemini API key
      apiKey: env.GEMINI_API_KEY,
      // Redirect all requests from OpenAI's servers to Google's compatibility layer
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    }),
    // Pass along the model name so callers never hardcode it
    model: env.GEMINI_MODEL,
  };
}
