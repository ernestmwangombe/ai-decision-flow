// Import the Inngest class used to create a client
import { Inngest } from "inngest";

// Create and export one shared Inngest client for the whole app
export const inngest = new Inngest({
  // A unique ID that identifies this app inside the Inngest dev dashboard
  id: "ai-decision-flow",
});
