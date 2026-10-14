// Mark this file as a client component because React Flow needs the browser
"use client";

// Import the React Flow canvas plus its background grid and zoom controls
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
// Import React Flow's required default styles
import "@xyflow/react/dist/style.css";
// Import the Shadcn button to confirm Shadcn works
import { Button } from "@/components/ui/button";

// Define three starter nodes matching the assignment's example
const initialNodes: Node[] = [
  // The decision node, which asks the YES/NO question
  { id: "1", position: { x: 50, y: 150 }, data: { label: "Is this a support request?" } },
  // The node we visit when the answer is YES
  { id: "2", position: { x: 350, y: 50 }, data: { label: "Support Node" } },
  // The node we visit when the answer is NO
  { id: "3", position: { x: 350, y: 250 }, data: { label: "Sales Node" } },
];

// Define two edges connecting the decision node to its outcomes
const initialEdges: Edge[] = [
  // The YES path, with a label so it's visible on the canvas
  { id: "e1-2", source: "1", target: "2", label: "YES" },
  // The NO path
  { id: "e1-3", source: "1", target: "3", label: "NO" },
];

// The home page component
export default function Home() {
  // Render the page layout
  return (
    // A full-screen column layout
    <main className="flex h-screen flex-col">
      {/* A simple header bar with the title and a Shadcn button */}
      <header className="flex items-center justify-between border-b p-4">
        {/* The app title */}
        <h1 className="text-lg font-semibold">AI Decision Flow</h1>
        {/* A Shadcn button proving the component library is installed */}
        <Button variant="outline">Phase 1 ready</Button>
      </header>
      {/* The canvas container; React Flow needs an explicit height to render */}
      <div className="flex-1">
        {/* The React Flow canvas with our starter graph */}
        <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
          {/* A dotted background grid */}
          <Background />
          {/* Zoom and fit controls in the corner */}
          <Controls />
        </ReactFlow>
      </div>
    </main>
  );
}