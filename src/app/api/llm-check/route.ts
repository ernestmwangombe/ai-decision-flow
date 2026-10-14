// Import Next.js's helper for returning JSON responses
import { NextResponse } from "next/server";
// Import our Gemini client factory
import { getLlm } from "@/lib/llm";

// Handle GET requests to /api/llm-check
export async function GET() {
  // Wrap everything so failures return readable errors instead of crashing
  try {
    // Build the client and read the model name
    const { client, model } = getLlm();

    // Send a tiny prompt that forces a one-word answer
    const completion = await client.chat.completions.create({
      // Use the model from the environment
      model,
      // Temperature 0 makes answers as deterministic as possible
      temperature: 0,
      // The conversation: a single user message
      messages: [
        // Ask for exactly one word so we can verify obedience
        { role: "user", content: "Reply with exactly one word: YES" },
      ],
    });

    // Pull the text out of the first choice, defaulting to an empty string
    const answer = completion.choices[0]?.message?.content ?? "";

    // Return success along with the model's raw answer
    return NextResponse.json({ ok: true, model, answer });
  } catch (error) {
    // Convert the unknown error into a readable message
    const message = error instanceof Error ? error.message : "Unknown error";
    // Return the failure with a 500 status code
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
