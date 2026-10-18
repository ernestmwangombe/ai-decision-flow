# AI Decision Flow

A visual AI workflow builder. Each node is an AI decision step that answers YES or NO, and execution follows the matching edge. The canvas is built with React Flow, execution is orchestrated by Inngest, and decisions come from Gemini through the OpenAI-compatible API.

See [EVIDENCE.md](EVIDENCE.md) for screenshots of each phase working.

## Tech Stack

- Next.js (App Router) + TypeScript
- React Flow (`@xyflow/react`)
- Inngest (durable workflow execution)
- OpenAI SDK pointed at Google's Gemini endpoint
- Shadcn UI + Tailwind CSS
- Zod (environment validation)

## Getting Started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and add your Google AI Studio API key
3. Start the app: `npm run dev`
4. Start Inngest in a second terminal: `npx inngest-cli dev -u http://localhost:3000/api/inngest`
5. Open http://localhost:3000 (app) and http://localhost:8288 (Inngest dashboard)

## Verifying the Setup

- `http://localhost:3000` shows the React Flow canvas
- `http://localhost:3000/api/llm-check` returns `{"ok":true,...,"answer":"YES"}`
- In the Inngest dashboard, invoke `hello-world` with `{"data": {"name": "Ernest"}}` and confirm the run completes

## Phases

- [x] Phase 1: Project Scaffolding & Environment
- [x] Phase 2: Visual Flow Editor & Graph Model
- [x] Phase 3: Durable AI Execution Engine
- [ ] Phase 4: Observability & Reliability Polish

## Running a Workflow

1. Build your graph on the canvas. Drag from the green handle for YES and the red handle for NO. Start with one entry node, and write each prompt as a yes/no question.
2. Type the text to evaluate into the **Run workflow** panel and click **Run workflow**.
3. Each node runs as its own Inngest step. Gemini must answer exactly YES or NO. An invalid reply gets one stricter retry; a second invalid reply fails the run and marks that node as errored.
4. Watch the trace in the panel, or open http://localhost:8288 to see each `decide-*` step.

The decision prompt keeps the question in the system message and sends the run input alone, inside a delimiter with a random per-call token, so text in the input cannot pose as instructions.

Testing the failure paths: set `LLM_FAULT_INJECTION=invalid-once` or `invalid-always` in `.env.local` (development only), restart `npm run dev`, and run again.

Note: run history is kept in server memory and resets when the dev server restarts.
