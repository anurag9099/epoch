# Epoch

Focused Paths for AI Engineers.  
Turn effort into visible capability.

Epoch is a proof-first AI/ML learning system for software engineers and junior ML engineers who want to move into ML systems work. It combines a structured roadmap, hands-on labs, quizzes, telemetry, personalized recommendations, proactive nudges, and an embedded AI study partner called Unity.

## What It Does

- Runs a curated learning path toward the `ML System Engineer` target role
- Keeps one active path in focus, with reinforcement learning surfaced as a specialization
- Turns lab progress and measurable outputs into proof artifacts
- Tracks study telemetry automatically during active sessions
- Detects confusion, drift, momentum, weak concepts, and proof gaps
- Uses Unity to keep the learner on-path with bounded, contextual help

## Product Surface

- `Home` mission-control dashboard
- `Path` phase roadmap and phase detail views
- `Build` lab index and lab IDE
- `Learn` content/task page
- `Quiz` assessment flow
- `For You` recommendation surface in Lens
- `Proof` artifact and evidence view
- `Focus` goals and commitments
- `Unity` embedded AI study partner

## Core Features

### Learning Path
- Curated multi-phase roadmap with seeded tasks, quizzes, labs, and milestones
- Current path framed around the `ML System Engineer` role
- RL specialization highlighted within the current path

### Labs
- Canonical lab index with duplicate titles deduped
- Full lab IDE with 3-pane desktop layout
- Field/result capture for measurements like loss, throughput, or benchmark outputs
- Prev/next navigation between canonical labs

### Proof
- Lab evidence can generate proof drafts
- Proof artifacts can be finalized with explanation, links, and context
- Dashboard and proof views surface the latest captured evidence

### Intelligence Layer
- Signal-driven instead of purely heuristic topic scoring
- Explicit signal families:
    - mastery
    - confusion
    - drift
    - momentum
    - proof gap
    - recommendation opportunity
- Signals feed:
    - dashboard briefing
    - Lens `For You`
    - nudges
    - Unity context

### Unity
- GPT-only path pinned to `gpt-5.4`
- Web search is the only enabled tool surface
- Attachment support for text, code, PDFs, DOCX, PPTX, XLSX, and images
- Context-aware opening state with current mission and active learning signals
- Learner-facing copy keeps Unity focused and on-path rather than broad/open-ended

### Telemetry
- Tracks mission sessions automatically while pages are active
- Batches `page_visit` and `session_time` events to `/api/events`
- Uses tracked time in dashboard, recovery state, and analyzer scoring

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS + custom CSS tokens
- SQLite locally via `better-sqlite3`
- Turso-compatible DB abstraction for production
- OpenAI SDK for Unity
- Monaco Editor for labs
- RSS parser + fetch for Lens feed sources

## Important Repos / Paths

- Source of truth: `/home/ec2-user/codex-code/epoch`
- Sandbox mirror for live testing: `/home/ec2-user/codex-code/epoch-sandbox`
- Real deploy repo on EC2: `/home/ec2-user/epoch`

## Local Development

```bash
npm install
npm run seed
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local`:

```bash
OPENAI_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
TURSO_URL=...
TURSO_AUTH_TOKEN=...
LLM_PROVIDER=...
LLM_MODEL=...
OLLAMA_BASE_URL=...
OLLAMA_API_KEY=...
```

Notes:
- `OPENAI_API_KEY` is required at runtime for Unity
- the current build no longer depends on fetching Google Fonts
- the OpenAI client is lazy-loaded so Docker builds can complete without runtime credentials baked into the image

## Build / Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Current source repo passes all three.

## Docker Deployment

The production deployment on EC2 uses Docker + Cloudflare tunnel.

Traffic flow:

```text
https://epoch.anuragslab.in
  -> Cloudflare
  -> cloudflared named tunnel
  -> localhost:3000
  -> Docker container
  -> SQLite db volume
```

Deploy commands in `/home/ec2-user/epoch`:

```bash
git pull
docker compose up -d --build
docker compose logs -f epoch
```

## Current Positioning

Epoch is no longer framed as a personal Anthropic prep dashboard.  
It is now positioned as a focused execution OS for AI/ML systems learning:

- one goal at a time
- one active mission
- one clear next step
- visible proof instead of vague progress

## Reference Docs

- `PLAN.md` — product / roadmap context
- `CLAUDE.md` — older project guide context
- `CODEX.md` — detailed current architecture and product reference
