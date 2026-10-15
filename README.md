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
- [ ] Phase 3: Durable AI Execution Engine
- [ ] Phase 4: Observability & Reliability Polish
