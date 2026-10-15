// Import the editor component we just built
import { FlowEditor } from "@/components/flow/flow-editor";

// The home page
export default function Home() {
  // Render a full-screen layout with a header and the editor
  return (
    // A full-height column
    <main className="flex h-screen flex-col">
      {/* A simple header bar */}
      <header className="flex items-center justify-between border-b p-4">
        {/* The app title */}
        <h1 className="text-lg font-semibold">AI Decision Flow</h1>
        {/* A short hint about the controls */}
        <p className="text-sm text-slate-500">
          Drag from the green handle for YES and the red handle for NO. Select a node or edge and press Delete to remove it.
        </p>
      </header>
      {/* The editor fills the remaining height */}
      <div className="flex-1">
        {/* The interactive flow editor */}
        <FlowEditor />
      </div>
    </main>
  );
}
