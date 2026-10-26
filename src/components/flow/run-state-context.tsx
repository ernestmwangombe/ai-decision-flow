// Mark this as a client component because it uses React context
"use client";

// Import React's context helpers
import { createContext, useContext } from "react";
// Import the run state type and its empty default
import { EMPTY_RUN_VISUAL_STATE, type RunVisualState } from "@/lib/run-visual";

// The context that carries the current run's visual state to every node and edge
export const RunStateContext = createContext<RunVisualState>(EMPTY_RUN_VISUAL_STATE);

// A small hook so components can read the state with one call
export function useRunVisualState(): RunVisualState {
  // Return whatever the nearest provider supplies
  return useContext(RunStateContext);
}
