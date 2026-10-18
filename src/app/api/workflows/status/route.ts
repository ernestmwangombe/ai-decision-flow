// Import Next.js's helper for returning JSON responses
import { NextResponse } from "next/server";
// Import the logbook lookup
import { getRun } from "@/lib/run-store";

// Handle GET requests to /api/workflows/status?runId=...
export async function GET(request: Request) {
  // Read the run id from the query string
  const runId = new URL(request.url).searchParams.get("runId");
  // A run id is required
  if (!runId) {
    // Tell the client what is missing
    return NextResponse.json({ ok: false, errors: ["runId is required."] }, { status: 400 });
  }
  // Look the run up in the logbook
  const run = getRun(runId);
  // Unknown runs (for example after a dev-server restart) return 404
  if (!run) {
    // Explain the likely reason
    return NextResponse.json(
      { ok: false, errors: ["Run not found. The dev server may have restarted."] },
      { status: 404 }
    );
  }
  // Return the logbook entry
  return NextResponse.json({ ok: true, run });
}
