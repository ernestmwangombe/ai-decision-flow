# Evidence

Screenshots proving each deliverable works. Each section lists what is shown and the result.

## Phase 1: Project Scaffolding & Environment

Verified locally on 2026-10-14 with the Next.js app on `http://localhost:3000` and the Inngest dev server on `http://localhost:8288`.

| # | Check | Result |
|---|-------|--------|
| 1 | React Flow canvas renders | Pass |
| 2 | Inngest `hello-world` function runs end to end | Pass |
| 3 | Gemini responds through the OpenAI SDK | Pass |
| 4 | Next.js serves the Inngest endpoint | Pass |

### 1. React Flow canvas and Shadcn UI

The home page at `http://localhost:3000` renders the three-node starter graph from the assignment's example: "Is this a support request?" branches to "Support Node" on YES and "Sales Node" on NO. The header button is a Shadcn `Button`, which confirms Shadcn is installed and working.

![React Flow canvas showing the decision node with YES and NO edges](docs/evidence/01-react-flow-canvas.png)

### 2. Inngest function run

The `hello-world` function was invoked from the Inngest dev dashboard with `{"data": {"name": "Ernest"}}`. The run status is **Completed**, the trace shows `build-greeting` as its own tracked step, and the output is `{"greeting": "Hello, Ernest!"}`. This is the same one-node-one-step pattern Phase 3 will use for AI decision nodes.

![Inngest dashboard showing a completed hello-world run with output Hello, Ernest!](docs/evidence/02-inngest-hello-world-run.png)

### 3. Gemini through the OpenAI SDK

`GET /api/llm-check` sends a one-word prompt to `gemini-3.1-flash-lite-preview` using the OpenAI SDK pointed at Google's OpenAI-compatible endpoint. The response is `"ok": true` with `"answer": "YES"`, which proves the API key, model name, and environment validation all work.

![Browser showing the llm-check JSON response with ok true and answer YES](docs/evidence/03-gemini-llm-check.png)

### 4. Inngest endpoint served by Next.js

`GET /api/inngest` returns the SDK's introspection response: `"mode": "dev"` and `"function_count": 1`. This is the endpoint the Inngest dev server syncs against to discover registered functions.

![Browser showing the Inngest endpoint JSON with mode dev and function_count 1](docs/evidence/04-inngest-endpoint.png)

## Phase 2: Visual Flow Editor & Graph Model

Verified locally on `http://localhost:3000`.

| # | Check | Result |
|---|-------|--------|
| 1 | Project type-checks with no errors | Pass |
| 2 | Add a node and connect it with YES and NO edges | Pass |
| 3 | Delete a node; the graph persists across a page refresh | Pass |
| 4 | Reset restores the starter graph | Pass |
| 5 | Corrupted saved data is rejected and replaced safely | Pass |
| 6 | Browser DevTools shows no errors | Pass |

### 1. TypeScript type-check

`npx tsc --noEmit` completes with no output, meaning the custom node, custom edges, Zod schemas and editor all compile cleanly. The check was run again after the polish changes (right-angle edge routing and correct singular/plural counters) and still passes.

![Terminal showing npx tsc --noEmit finishing with no errors before and after the polish changes](docs/evidence/05-phase2-typecheck.png)

### 2. Adding nodes and connecting them with YES and NO edges

A fourth node was added with the **+ Add decision node** button. Its green YES handle and its red NO handle were both connected to the "Is the customer interested in buying?" node. The counter reads 4 nodes and 4 edges, and each edge has its own color and label (green YES, red NO). Edges are drawn with right-angle routing so they no longer loop around nodes.

![Editor with four nodes and four edges, each edge labeled YES or NO](docs/evidence/06-phase2-add-and-connect.png)

### 3. Deleting a node and persisting state

The "billing problem" node was deleted (its connecting edge is removed with it) and the page was refreshed. The editor reloads with 2 nodes and 1 edge, which shows the graph is saved to `localStorage` and restored on load.

![Editor after deleting a node and refreshing, showing two nodes and one edge](docs/evidence/07-phase2-delete-persists.png)

### 4. Resetting to the starter graph

Clicking **Reset** brings back the three-node starter graph (3 nodes, 2 edges).

![Editor after clicking Reset, showing the three-node starter graph](docs/evidence/08-phase2-reset.png)

### 5. Rejecting corrupted saved data

The saved graph in `localStorage` was replaced by hand with an invalid value: an edge pointing at two nodes (`ghost` and `phantom`) that do not exist. The page in this screenshot still shows the previous four-node graph because it has not been reloaded yet.

![DevTools showing a corrupted localStorage value with the editor still displaying the previous graph](docs/evidence/09-phase2-corrupt-storage.png)

After a refresh, the Zod integrity check rejects the invalid save and the editor shows the three-node starter graph instead of crashing. The same storage key now holds a valid starter graph again, because the editor replaced the bad save with good data.

![DevTools showing the starter graph on the canvas and a valid graph restored in localStorage](docs/evidence/10-phase2-self-healed.png)

### 6. Clean browser console

With the four-node graph saved in `localStorage`, the DevTools Issues panel reports 0 errors and 0 warnings. The only entries are four informational notices about form fields missing an `id` or `name` attribute, which come from the prompt textareas and do not affect behavior.

![DevTools Issues panel showing zero errors and zero warnings beside the saved graph in localStorage](docs/evidence/11-phase2-no-console-errors.png)

## Upcoming evidence

- [ ] Phase 3: end-to-end workflow run with AI branching and execution order
- [ ] Phase 4: polish features (for example logs panel, import/export, animated edges)
