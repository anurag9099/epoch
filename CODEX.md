# CODEX.md

This file is the working reference for Epoch as it exists after the recent product, intelligence, Unity, proof, and deployment work.

It is meant to answer:

- what Epoch is now
- how the frontend is structured
- how the backend is structured
- how the intelligence layer works
- how Unity works
- how telemetry, proof, and nudges work
- what changed during this implementation cycle
- how the repos and deployment setup are organized

## 1. Product Definition

### Current Brand
- `Epoch`
- `Focused Paths for AI Engineers`
- `Turn effort into visible capability`

### Current Target User
- software engineers moving toward ML systems work
- junior AI / ML engineers deepening into systems, training, transformers, and RL-adjacent applied work

### Current Product Thesis
Epoch should not behave like a broad AI resource library or generic “AI roadmap generator.”  
It should behave like a focused execution system:

- one active path
- one current mission
- one bounded next step
- evidence and artifacts instead of vague “progress”

### Current Target Role / Path
- target role naming is currently `ML System Engineer`
- RL is included as a specialization in the current path framing, not as a separate full track

## 2. Repo / Environment Layout

### Repos
- Source repo: `/home/ec2-user/codex-code/epoch`
- Sandbox mirror: `/home/ec2-user/codex-code/epoch-sandbox`
- Real deploy repo: `/home/ec2-user/epoch`

### Intended Roles
- `epoch`: source of truth for code changes
- `epoch-sandbox`: live testing copy, usually run on `3001`
- `/home/ec2-user/epoch`: production/deployment repo, GitLab remote, Docker on `3000`

### Deployment Remote
- GitLab remote lives on `/home/ec2-user/epoch`
- active pushed branch for recent work: `dev`

## 3. UX / Frontend Structure

### Shell Model
Epoch now uses a 3-zone shell:

- left rail: brand, active path, navigation, progress
- center pane: mission-led workspace
- right rail: Unity

### Major Screens

#### `/`
Mission-control home screen, centered around:
- path header
- current mission
- mission state
- today’s briefing
- this week
- phase progress
- proof
- telemetry
- recovery
- focus commitments

#### `/phases`
- overall path/phase surface
- phase navigation and progress

#### `/phases/[id]`
- detail view for one phase
- tasks grouped within the phase

#### `/learn/[taskId]`
- content/learning page
- supports mission status visibility

#### `/lab/[taskId]`
- lab IDE with a true desktop multi-pane layout
- split focus between guide, coding area, and Unity
- proof capture surfaced inline

#### `/labs`
- canonical lab catalog
- duplicates deduped by phase/title rules
- filterable lab index

#### `/quiz/[taskId]`
- quiz flow
- completion can trigger analyzer updates

#### `/lens`
- `For You` now matters more than broad discovery
- recommendation explanations are signal-backed

#### `/resume`
- effectively evolving into proof/artifact view
- old resume metaphors are being generalized into capability proof

#### `/goals`
- focus commitments and bounded learning targets

### Design / Theme
- warm-academic token system remains in CSS
- Google font dependency was removed from build
- typography now uses local font stacks through CSS variables:
  - display: serif stack
  - body: local sans stack

## 4. Navigation and Shell Logic

### Desktop
- Sidebar is always visible
- sidebar can now collapse into a compact icon rail
- lab routes default to a collapsed sidebar instead of removing it entirely
- Center workspace adapts to pane width
- Unity can remain embedded and controlled without blocking nav

### Mobile
- separate mobile nav/header path
- Unity is handled differently than desktop rail
- `Focus` is now reachable from the mobile top bar without overcrowding the bottom nav

### Sidebar
Sidebar currently shows:
- `Epoch`
- descriptor
- shell controls
- compact theme toggle
- active path block
- navigation links
- phase progress list

### Shell State
Shell state is now centralized through:
- `components/layout/ShellProvider.tsx`
- `components/layout/AppShell.tsx`

The provider controls:
- desktop sidebar collapse state
- lab-specific default collapse behavior
- shared shell width tokens applied to the layout grid

## 5. Data / Domain Model

Main schema is still broad and somewhat overloaded, but the functional domains are:

### Curriculum
- phases
- tasks
- task segments
- quiz questions
- quiz attempts/results
- lab fields/results

### Proof
- resume bullets (legacy)
- proof artifacts (newer first-class layer)

### Telemetry
- daily log
- streaks
- user events

### Recommendations / Signals
- topic scores
- user signals
- recommendations

### Feed / Lens
- feed items
- saved items

### Chat / Unity
- chat sessions
- chat messages
- Unity memory

### Learner framing
- path/profile helpers in `lib/path.ts` and `lib/profile.ts`

## 6. Backend / API Model

Epoch is API-driven internally. The app pages are mostly client-heavy and fetch from internal routes.

### Dashboard / State
- `/api/dashboard`
  - aggregates mission, progress, proof, telemetry, nudges, and briefing context

### Curriculum
- `/api/phases`
- `/api/phases/[id]`
- `/api/tasks/[id]`
- `/api/tasks/[id]/segments/[segId]`

### Labs
- `/api/labs`
  - now returns canonical lab list
- `/api/lab/[fieldId]`
  - stores field measurements
  - returns proof-related metadata
- `/api/lab/generate-config`

### Quiz
- `/api/quiz/[taskId]/submit`

### Proof
- `/api/resume`
- `/api/proof-artifacts`
- `/api/proof-artifacts/[id]/export`

### Intelligence / Recommendations
- `/api/analyze`
- `/api/recommendations`
- `/api/nudges`

### Telemetry
- `/api/events`
- `/api/daily-log`
- `/api/streak`

### Feed / Lens
- `/api/feed`
- `/api/feed/refresh`
- `/api/saved`

### Unity
- `/api/chat`
- `/api/chat/history`
- `/api/chat/sessions`
- `/api/unity/context`
- `/api/web-search`

## 7. Intelligence Layer

This was one of the major areas we changed.

### Old Problem
The earlier intelligence layer looked broad but shallow:
- topic scoring was doing too much
- telemetry was incomplete
- recommendations could look personalized without enough real evidence

### Current Direction
Signals are now more explicitly modularized under `lib/intelligence`.

### Signal Families
- `mastery`
- `confusion`
- `drift`
- `momentum`
- `proof-gap`
- `recommendation-opportunity`

### Important Files
- `lib/intelligence/common.ts`
- `lib/intelligence/snapshots.ts`
- `lib/intelligence/mastery.ts`
- `lib/intelligence/confusion.ts`
- `lib/intelligence/drift.ts`
- `lib/intelligence/momentum.ts`
- `lib/intelligence/proof-gap.ts`
- `lib/intelligence/recommendation-opportunity.ts`
- `lib/intelligence/signals.ts`
- `lib/intelligence/presenter.ts`

### How It Works
1. raw learner activity is captured
2. snapshot/read context is built
3. signal modules derive focused learner-state signals
4. presenter converts those signals into product-readable copy/state
5. those outputs power:
   - dashboard briefing
   - Lens explanations
   - Unity focus context
   - nudge surfaces

### Current Presenter Behaviors
- user-facing copy was softened away from overly technical phrases
- earlier wording like `Stabilize transformers` was replaced with simpler variants like:
  - `Focus now`
  - `Next up`
  - `Needs attention`
  - `Coming up`

## 8. Unity

Unity is the AI study partner embedded inside Epoch.

### Model Policy
- visible model badges were removed from UI
- backend is pinned to `gpt-5.4`
- no user model switching in the current UX

### Scope
Unity is intentionally narrower than ChatGPT:
- it is meant to keep the learner focused
- tool scope is bounded
- currently only web search is intentionally enabled as a tool surface

### Attachments
Attachment handling was significantly upgraded.

#### Supported
- code/text files
- images
- PDF
- DOCX
- PPTX
- XLSX

#### Important Files
- `lib/chat-attachments.ts`
- `lib/document-extractor.ts`
- `components/chat/ChatInput.tsx`
- `components/chat/ChatMessage.tsx`
- `components/chat/ChatPanel.tsx`
- `app/api/chat/route.ts`

### Unity Context
Unity now opens with more useful context instead of a generic empty state.

It can surface:
- current mission
- focus signal
- action needed / notice
- bounded prompt cards

### Header Status Logic
We explicitly fixed a misleading behavior:
- earlier, the header could flip into a red issue state if the assistant message merely contained the word `error`
- that was replaced with structured status behavior tied to actual nudges or focus state

### Focus Labels
The current idea is:
- short, simple status label
- actual action in a supporting line
- avoid sounding like internal ML diagnostics

### Desktop Expand Behavior
Unity desktop expand/collapse was reworked so it behaves more like a single moving surface:
- one desktop panel instance stays mounted
- expand uses an animated frame transition instead of rendering a second duplicate panel
- the backdrop fades independently
- the panel now feels like it detaches and moves into focus rather than popping open as a separate window

## 9. Nudges

Nudges were not removed, but they were reshaped.

### Current State
- high urgency can still surface strongly
- medium and low are more integrated into the shell and Unity context
- dashboard recovery card and sidebar indicators are part of that direction

### Important File
- `lib/nudges.ts`

### Known Product Concern
Feedback correctly pointed out that nudges had become less visible than they should be.  
The current structure is better than the earlier banner-only feel, but the nudge system is still a work-in-progress in terms of perfect surfacing.

## 10. Telemetry / Session Tracking

This is one of the biggest “make it real” upgrades.

### What Changed
- opening a mission page now starts real background session tracking
- events are batched into `/api/events`
- tracked time is visible in dashboard telemetry and recovery state
- analyzer uses real tracked time, not only manual inputs

### Important Files
- `components/telemetry/LearningSessionTracker.tsx`
- `components/telemetry/MissionSessionStatus.tsx`
- `lib/session-analytics.ts`
- `lib/recovery.ts`
- `/api/events`
- `/api/daily-log`
- `/api/dashboard`

### Event Types
Important examples:
- `page_visit`
- `session_time`
- `task_complete`
- `lab_result`
- `chat_question`

## 11. Proof / Artifact Flow

This is one of the sharpest product differentiators.

### Current Direction
Epoch is moving from “resume bullet filler” to “proof artifact system.”

### What Exists
- field/result capture in labs
- proof snapshots
- artifact drafts generated from lab evidence
- proof finalization flow
- proof visibility on dashboard and proof page

### Important Files
- `lib/proof.ts`
- `lib/artifacts.ts`
- `components/proof/FinalizeProofModal.tsx`
- `components/proof/ArtifactCard.tsx`
- `/api/proof-artifacts`
- `/api/proof-artifacts/[id]/export`

### Product Logic
The intent is:
- capture measurable output
- attach meaning and explanation
- turn that into visible capability evidence

## 12. Labs and Build Surface

### Lab Catalog Fixes
We fixed:
- duplicate labs showing in the lab index
- broken next-lab navigation
- awkward desktop lab layout

### Important Files
- `lib/labs.ts`
- `app/api/labs/route.ts`
- `app/api/tasks/[id]/route.ts`
- `app/lab/[taskId]/page.tsx`

### Current Lab Behavior
- lab list is deduped into canonical labs
- desktop lab layout uses a proper multi-pane arrangement
- lab pages now preserve the main sidebar instead of deleting the shell
- the lab canvas gets space back through sidebar collapse rather than by removing navigation
- next/prev navigation is lab-aware rather than generic task-order-only

## 13. Branding / Icons

### Current State
- shell branding is text-only again
- logo image was tried in the sidebar and removed because it looked off in the narrow rail
- favicon/app icons were regenerated and reorganized

### Important Note
The browser icon path went through a few iterations:
- app-level favicon route
- public icon fallback conflict
- final cleanup toward a coherent public icon set

## 14. Build / Deployment Fixes

Two major production blockers were fixed.

### Blocker 1: Google Fonts
Problem:
- `next/font/google` tried to fetch fonts during build
- environments without Google DNS access failed at webpack build

Fix:
- removed `next/font/google` imports from `app/layout.tsx`
- switched to local font stacks via CSS variables in `app/globals.css`

### Blocker 2: OpenAI Client at Import Time
Problem:
- OpenAI client was instantiated at module load time
- Docker build lacked runtime `OPENAI_API_KEY`
- `next build` failed while collecting page data for API routes

Fix:
- `lib/llm/openai.ts` now lazy-loads the client only when needed

## 15. Deployment State

### Deploy Flow
1. source repo changes happen in `codex-code/epoch`
2. deploy repo on EC2 is `/home/ec2-user/epoch`
3. `dev` branch was created and pushed to GitLab
4. Docker deployment on port `3000` rebuilds from that repo

### Deployment Files
The deploy repo depends on:
- `.dockerignore`
- `Dockerfile`
- `docker-compose.yml`

Those were missing from the source repo and had to be restored into `dev` from the deploy repo’s existing history.

### Known Operational Detail
`docker-compose.yml` still contains the obsolete top-level `version` field warning, but that is not a blocker.

## 16. Current Source of Truth

Use:
- `/home/ec2-user/codex-code/epoch`

Do not treat:
- `/home/ec2-user/codex-code/epoch-sandbox`

as the authoritative repo. It is only the testing mirror.

## 17. Major Changes Done in This Cycle

High-level list of work completed:

- repositioned Epoch around focused paths and visible capability
- rebuilt the home/dashboard into a mission-control structure
- tightened the shell and Unity integration
- improved lab layout and canonical lab navigation
- restored the desktop sidebar on lab pages with collapsible shell behavior
- added mobile access to the Focus section
- added telemetry-backed mission/session tracking
- connected tracked time into dashboard and analyzer
- added proof snapshots and artifact draft/finalization flow
- moved recommendations and briefing toward signal-backed presentation
- modularized the intelligence layer into explicit signal families
- upgraded Unity document attachments and extraction support
- pinned Unity backend behavior to `gpt-5.4`
- removed misleading Unity issue heuristics
- softened user-facing focus phrasing
- removed build-time Google font dependency
- fixed Docker build by lazy-loading OpenAI client
- created and pushed `dev` branch in the real deploy repo

## 18. What Still Needs Care

Even after this work, these areas still deserve scrutiny:

- schema is still broad and can be cleaner by domain
- nudge surfacing can be improved further
- Unity polish can still go further around session restore and attachment-heavy turns
- proof export/share can be pushed further
- Unity polish can still improve around message/session UX
- deploy-only files should ideally also live in the source repo to avoid future sync mistakes

## 19. Recommended Working Rule

When changing Epoch:
- edit `codex-code/epoch`
- validate there first
- sync intentionally to deploy repo
- do not use `epoch-sandbox` as the long-term canonical branch target
