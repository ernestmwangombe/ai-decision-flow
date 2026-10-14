// Import the serve helper that adapts Inngest to Next.js route handlers
import { serve } from "inngest/next";
// Import the shared client
import { inngest } from "@/inngest/client";
// Import the list of registered functions
import { functions } from "@/inngest/functions";

// Create the GET, POST and PUT handlers Inngest needs, and export them
export const { GET, POST, PUT } = serve({
  // Tell the handler which client we're using
  client: inngest,
  // Tell it which functions to expose
  functions,
});
