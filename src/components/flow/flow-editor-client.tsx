// Mark this as a client component, because only client components may turn server rendering off
"use client";

// Import Next.js's helper for loading a component lazily
import dynamic from "next/dynamic";

// Load the editor only in the browser; it reads localStorage, so it cannot render on the server
const FlowEditor = dynamic(() => import("@/components/flow/flow-editor").then((module) => module.FlowEditor), {
  // Never render this component on the server
  ssr: false,
  // Show a short message while the editor code loads
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading editor...</div>,
});

// The component the page uses
export function FlowEditorClient() {
  // Render the browser-only editor
  return <FlowEditor />;
}
