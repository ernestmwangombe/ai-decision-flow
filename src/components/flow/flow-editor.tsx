// Mark this as a client component because it uses state, effects and localStorage
"use client";

// Import React hooks
import { useCallback, useEffect, useMemo, useState } from "react";
// Import React Flow's canvas, helpers and types
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
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
// Import the run panel from Phase 3
import { RunPanel } from "@/components/flow/run-panel";
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
} from "@/lib/graph-schema";

// Register our custom node; defined outside the component so React Flow does not re-create it
const nodeTypes = { decision: DecisionNode };

// Register our two edge types; also defined outside the component
const edgeTypes = { yes: YesEdge, no: NoEdge };

// The main editor component
export function FlowEditor() {
  // Live nodes plus the handler React Flow calls when nodes move or change
  const [nodes, setNodes, onNodesChange] = useNodesState<DecisionNodeType>([]);
  // Live edges plus the handler React Flow calls when edges change
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  // Tracks whether we have finished loading from localStorage
  const [hydrated, setHydrated] = useState(false);

  // The current graph in its minimal, validated shape, ready to send to the server
  const graph = useMemo(() => toStoredGraph(nodes, edges), [nodes, edges]);

  // On first load in the browser, restore the saved graph or fall back to the starter graph
  useEffect(() => {
    // Try the saved graph first; use the starter graph if nothing valid is saved
    const restored = fromStoredGraph(loadGraph() ?? STARTER_GRAPH);
    // Put the nodes on the canvas
    setNodes(restored.nodes);
    // Put the edges on the canvas
    setEdges(restored.edges);
    // Mark loading as finished so saving can begin
    setHydrated(true);
  }, [setNodes, setEdges]);

  // Save the graph every time it changes, but only after loading has finished
  useEffect(() => {
    // Never save before loading, or we would overwrite real data with an empty graph
    if (!hydrated) return;
    // Write the current graph to localStorage
    saveGraph(nodes, edges);
  }, [nodes, edges, hydrated]);

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
  }, [setNodes, setEdges]);

  // Render the canvas
  return (
    // React Flow needs its parent to have an explicit size
    <div className="h-full w-full">
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
        <Panel position="top-left" className="flex items-center gap-2">
          {/* Button that adds a new decision node */}
          <Button onClick={addNode}>+ Add decision node</Button>
          {/* Button that restores the starter graph */}
          <Button variant="outline" onClick={resetGraph}>
            Reset
          </Button>
          {/* A tiny counter showing how big the graph is, with correct singular and plural */}
          <span className="rounded bg-white px-2 py-1 text-xs text-slate-600 shadow-sm">
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"} · {edges.length}{" "}
            {edges.length === 1 ? "edge" : "edges"}
          </span>
        </Panel>
        {/* The run panel floating in the top-right corner */}
        <Panel position="top-right">
          <RunPanel graph={graph} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
