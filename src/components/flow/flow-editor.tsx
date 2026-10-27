// Mark this as a client component because it uses state, effects and localStorage
"use client";

// Import React hooks and the change-event type
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
// Import React Flow's canvas, helpers and types
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type OnConnect,
} from "@xyflow/react";
// Import React Flow's required default styles
import "@xyflow/react/dist/style.css";
// Import the Shadcn button for the toolbar
import { Button } from "@/components/ui/button";
// Import our custom node and edge components
import { DecisionNode } from "@/components/flow/decision-node";
import { NoEdge, YesEdge } from "@/components/flow/branch-edges";
// Import the import-review dialog
import { ImportReviewDialog } from "@/components/flow/import-review-dialog";
// Import the run panel
import { RunPanel } from "@/components/flow/run-panel";
// Import the context that carries run state to nodes and edges
import { RunStateContext } from "@/components/flow/run-state-context";
// Import the graph helpers, schemas and starter data
import {
  NODE_TYPE,
  STARTER_GRAPH,
  branchSchema,
  buildEdge,
  fromStoredGraph,
  loadGraph,
  saveGraph,
  toStoredGraph,
  wouldCreateCycle,
  type DecisionNodeType,
  type StoredGraph,
} from "@/lib/graph-schema";
// Import the export and import helpers
import { MAX_IMPORT_BYTES, buildExportFile, downloadTextFile, parseImportText } from "@/lib/graph-io";
// Import the run type and the function that turns a run into visuals
import type { RunRecord } from "@/lib/run-types";
import { deriveRunVisualState } from "@/lib/run-visual";

// Register our custom node; defined outside the component so React Flow does not re-create it
const nodeTypes = { decision: DecisionNode };

// Register our two edge types; also defined outside the component
const edgeTypes = { yes: YesEdge, no: NoEdge };

// An imported file that is waiting for the user to review it
type PendingImport = {
  // The file name, shown in the dialog
  fileName: string;
  // The validated graph
  graph: StoredGraph;
  // Indexes of prompts that look like instructions
  flagged: number[];
};

// The editor itself; it must live inside ReactFlowProvider so it can call fitView
function FlowEditorInner() {
  // Load the saved graph once, on the first render (this component only ever renders in the browser)
  const [initialGraph] = useState(() => fromStoredGraph(loadGraph() ?? STARTER_GRAPH));
  // Live nodes plus the handler React Flow calls when nodes move or change
  const [nodes, setNodes, onNodesChange] = useNodesState<DecisionNodeType>(initialGraph.nodes);
  // Live edges plus the handler React Flow calls when edges change
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialGraph.edges);
  // The run currently shown in the panel, used to light up nodes and edges
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null);
  // An imported file waiting for review
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  // Problems found while importing
  const [importErrors, setImportErrors] = useState<string[]>([]);
  // A reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  // React Flow's helper for re-centering the view
  const { fitView } = useReactFlow();

  // The current graph in its minimal, validated shape
  const graph = useMemo(() => toStoredGraph(nodes, edges), [nodes, edges]);
  // The visual state for the run being shown
  const visual = useMemo(() => deriveRunVisualState(graph, activeRun), [graph, activeRun]);

  // Save the graph to localStorage every time it changes
  useEffect(() => {
    // Write the current graph to localStorage
    saveGraph(nodes, edges);
  }, [nodes, edges]);

  // Decide whether a drag between two handles is allowed
  const isValidConnection = useCallback(
    (candidate: Connection | Edge) => {
      // Reject connections that are missing an endpoint
      if (!candidate.source || !candidate.target) return false;
      // Reject connections that would create a loop
      return !wouldCreateCycle(edges, candidate.source, candidate.target);
    },
    [edges]
  );

  // Handle a completed connection between two nodes
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      // Work out the branch from the handle the user dragged from
      const branch = branchSchema.safeParse(connection.sourceHandle);
      // Ignore anything that did not start from the YES or NO handle
      if (!branch.success) return;
      // Update the edge list
      setEdges((current) => [
        // Keep every edge except an older edge using the same handle on the same node
        ...current.filter((edge) => !(edge.source === connection.source && edge.sourceHandle === branch.data)),
        // Add the new edge, styled by its branch
        buildEdge(crypto.randomUUID(), connection.source, connection.target, branch.data),
      ]);
    },
    [setEdges]
  );

  // Add a fresh, empty decision node to the canvas
  const addNode = useCallback(() => {
    // Update the node list
    setNodes((current) => {
      // Use the count to stagger new nodes so they do not stack exactly
      const offset = (current.length % 6) * 40;
      // Return the old nodes plus the new one
      return [
        ...current,
        {
          // A unique id for the new node
          id: crypto.randomUUID(),
          // Use our custom node type
          type: NODE_TYPE,
          // Place it near the top-left, shifted by the offset
          position: { x: 80 + offset, y: 80 + offset },
          // Start with an empty prompt
          data: { prompt: "" },
        },
      ];
    });
  }, [setNodes]);

  // Replace everything on the canvas with the starter graph
  const resetGraph = useCallback(() => {
    // Rebuild the starter graph as live React Flow objects
    const restored = fromStoredGraph(STARTER_GRAPH);
    // Replace the nodes
    setNodes(restored.nodes);
    // Replace the edges
    setEdges(restored.edges);
    // Re-center the view on the starter graph
    window.setTimeout(() => {
      void fitView({ padding: 0.2 });
    }, 50);
  }, [setNodes, setEdges, fitView]);

  // Download the current graph as a JSON file
  const exportGraph = useCallback(() => {
    // Build a file name from the current time, such as ai-decision-flow-2026-10-18T10-30-00.json
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    // Trigger the download
    downloadTextFile(`ai-decision-flow-${stamp}.json`, buildExportFile(graph));
  }, [graph]);

  // Read a file the user picked and validate it
  const onImportFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    // The first selected file, if any
    const file = event.target.files?.[0];
    // Reset the input so picking the same file again still triggers this handler
    event.target.value = "";
    // Clear old problems
    setImportErrors([]);
    // Nothing was selected
    if (!file) return;
    // Refuse oversized files before reading them
    if (file.size > MAX_IMPORT_BYTES) {
      setImportErrors([`The file is larger than ${Math.round(MAX_IMPORT_BYTES / 1000)} KB.`]);
      return;
    }
    // Reading can fail, so guard it
    try {
      // Read the file as text
      const text = await file.text();
      // Validate it with Zod and our safety rules
      const result = parseImportText(text);
      // Show the problems if validation failed
      if (!result.ok) {
        setImportErrors(result.errors);
        return;
      }
      // Hold the graph until the user has reviewed its prompts
      setPendingImport({ fileName: file.name.slice(0, 80), graph: result.graph, flagged: result.flagged });
    } catch {
      // The browser could not read the file
      setImportErrors(["The file could not be read."]);
    }
  }, []);

  // The user accepted the reviewed import
  const confirmImport = useCallback(() => {
    // Nothing to import
    if (!pendingImport) return;
    // Turn the validated graph into live React Flow objects
    const restored = fromStoredGraph(pendingImport.graph);
    // Replace the nodes
    setNodes(restored.nodes);
    // Replace the edges
    setEdges(restored.edges);
    // Clear the old run visuals, because the ids no longer match
    setActiveRun(null);
    // Close the dialog
    setPendingImport(null);
    // Re-center the view on the imported graph
    window.setTimeout(() => {
      void fitView({ padding: 0.2 });
    }, 50);
  }, [pendingImport, setNodes, setEdges, fitView]);

  // Render the canvas
  return (
    // React Flow needs its parent to have an explicit size
    <div className="h-full w-full">
      {/* Share the run's visual state with every node and edge */}
      <RunStateContext.Provider value={visual}>
        <ReactFlow
          // The live nodes
          nodes={nodes}
          // The live edges
          edges={edges}
          // Apply node moves and changes
          onNodesChange={onNodesChange}
          // Apply edge changes
          onEdgesChange={onEdgesChange}
          // Handle new connections
          onConnect={onConnect}
          // Block loops and incomplete connections while dragging
          isValidConnection={isValidConnection}
          // Register our custom node types
          nodeTypes={nodeTypes}
          // Register our custom edge types
          edgeTypes={edgeTypes}
          // Zoom to fit the graph on first render
          fitView
          // Keep the canvas light so it matches our node colors
          colorMode="light"
        >
          {/* A dotted background grid */}
          <Background />
          {/* Zoom and fit controls */}
          <Controls />
          {/* A small overview map in the corner */}
          <MiniMap pannable zoomable />
          {/* A toolbar floating in the top-left corner */}
          <Panel position="top-left" className="flex flex-wrap items-center gap-2">
            {/* Button that adds a new decision node */}
            <Button onClick={addNode}>+ Add decision node</Button>
            {/* Button that restores the starter graph */}
            <Button variant="outline" onClick={resetGraph}>
              Reset
            </Button>
            {/* Button that downloads the graph as JSON */}
            <Button variant="outline" onClick={exportGraph} disabled={nodes.length === 0}>
              Export JSON
            </Button>
            {/* Button that opens the file picker */}
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Import JSON
            </Button>
            {/* The hidden file input that the Import button triggers */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onImportFile}
              aria-label="Import workflow JSON file"
            />
            {/* A tiny counter showing how big the graph is, with correct singular and plural */}
            <span className="rounded bg-white px-2 py-1 text-xs text-slate-600 shadow-sm">
              {nodes.length} {nodes.length === 1 ? "node" : "nodes"} · {edges.length}{" "}
              {edges.length === 1 ? "edge" : "edges"}
            </span>
          </Panel>
          {/* The run panel floating in the top-right corner */}
          <Panel position="top-right">
            <RunPanel graph={graph} onRunChange={setActiveRun} />
          </Panel>
          {/* Import problems, shown at the top center until dismissed */}
          {importErrors.length > 0 ? (
            <Panel position="top-center">
              <div role="alert" className="w-96 space-y-1 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-700 shadow-md">
                {/* A heading for the problem list */}
                <p className="font-semibold">The file could not be imported</p>
                {/* Every problem on its own line */}
                <ul className="list-disc pl-4">
                  {importErrors.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
                {/* A button to dismiss the message */}
                <button type="button" onClick={() => setImportErrors([])} className="font-semibold underline">
                  Dismiss
                </button>
              </div>
            </Panel>
          ) : null}
        </ReactFlow>
      </RunStateContext.Provider>
      {/* The review dialog appears when a valid file is waiting to be imported */}
      {pendingImport ? (
        <ImportReviewDialog
          fileName={pendingImport.fileName}
          graph={pendingImport.graph}
          flagged={pendingImport.flagged}
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      ) : null}
    </div>
  );
}

// The exported editor wraps the inner component in React Flow's provider
export function FlowEditor() {
  // The provider lets the inner component use React Flow hooks such as useReactFlow
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
}
