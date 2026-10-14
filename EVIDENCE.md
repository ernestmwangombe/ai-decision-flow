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

## Upcoming evidence

- [ ] Phase 2: interactive editor (add nodes, connect nodes, edit prompts, YES/NO edges, saved graph)
- [ ] Phase 3: end-to-end workflow run with AI branching and execution order
- [ ] Phase 4: polish features (for example logs panel, import/export, animated edges)
