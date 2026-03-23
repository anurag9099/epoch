# Epoch — Master Plan

> Living document. Updated with every feature, fix, or architectural change.
> Last updated: 2026-03-18

---

## What Epoch Is

A personalized AI/ML learning OS for preparing for the Anthropic ML Systems Engineer (RL Engineering) role. Single-user. 42-day roadmap. 7 phases. 103 tasks. An AI study partner (Unity) that understands everything you're doing.

---

## What's Been Built (Completed)

### Foundation (Day 1)
- [x] Next.js 14 + Tailwind + SQLite (better-sqlite3 local / Turso prod)
- [x] Database abstraction layer (local + Turso)
- [x] Seed data: 7 phases, 103 tasks, 49 quiz questions, 41 video segments, 27 lab fields, 3 resume bullets
- [x] Seed script (`npm run seed`)

### API Layer (16 routes)
- [x] Dashboard aggregate API
- [x] Phases CRUD + Tasks CRUD + Segments toggle
- [x] Quiz submission with pass/fail
- [x] Lab result saving → resume bullet auto-linking
- [x] Feed (RSS aggregation from arXiv, HuggingFace, Interconnects, etc.)
- [x] Streak tracking + daily log
- [x] Goals CRUD
- [x] Chat API (streaming SSE) + chat sessions + chat history

### Pages (8 routes)
- [x] Dashboard — hero-first layout (Today's Focus → stats chips → week calendar → phase tracks → feed/goals)
- [x] Phases — index grid + detail page with task list
- [x] Learn — video player (YouTube iframe, 52vh max) + segment tracker + notes + reading view
- [x] Lab — split-screen IDE (Monaco editor + lab guide + inline Unity chat)
- [x] Quiz — MCQ + freetext, one-at-a-time, results with retake
- [x] Feed (→ being renamed to Lens) — RSS items with source badges + filters
- [x] Resume — bullet cards with [X] placeholder tracking
- [x] Goals — add/edit/delete with category filters

### Unity (AI Study Partner)
- [x] LLM providers: OpenAI GPT (primary), AWS Bedrock Claude (secondary)
- [x] Streaming responses (SSE)
- [x] Chat sessions with history dropdown
- [x] Context-aware system prompt (phase, task, quiz scores, notes, lab results, goals)
- [x] Fixed inset panel on desktop (position: fixed, rounded 20px card)
- [x] Expand/collapse to full modal
- [x] Inline Unity in lab IDE (3rd pane, code + output aware)
- [x] Contextual suggested prompts (change per page)
- [x] Persists across page navigation (single session per mount)

### Design: "Warm Academic"
- [x] Palette: cream (#faf7f2), surface (#f2ede4), sunken (#e9e3d8), teal (#2a7c6f), rust (#c45c2a), gold (#b08d3c)
- [x] Fonts: Lora (serif headings), DM Sans (body)
- [x] Grain texture overlay
- [x] Custom scrollbars (3px, warm)
- [x] Sidebar (240px) + MobileNav (top bar + bottom nav)
- [x] Cards: no shadows, 8px radius, 1px warm border
- [x] Buttons: 6px radius, teal primary, cream secondary
- [x] Progress bars: 2-3px height, teal fill

### Lab IDE
- [x] 3-pane layout: Lab Guide (280px) | Monaco Editor (flex:1) | Unity Chat (300px)
- [x] Monaco Editor with custom epoch-dark theme (#16120e)
- [x] File tabs (train.py, model.py)
- [x] Output panel with Output/History tabs
- [x] localStorage checkpoint saves (debounced 1s)
- [x] Run history (last 5 runs)
- [x] Open in Colab for GPU labs
- [x] Lab config data (static for lab 10, fallback for others)
- [x] Global ChatPanel hidden on lab page via CSS :has()

### Infrastructure
- [x] PWA manifest (Android installable)
- [x] Light/dark → single Warm Academic theme
- [x] shadcn/ui installed (dialog, dropdown, tabs, tooltip, input, textarea, separator, accordion)
- [x] Responsive: desktop 3-column, mobile bottom nav + FAB

---

## What's Being Built Next (The Intelligence Layer)

### Overview

An adaptive learning intelligence that watches how you learn and actively fills your knowledge gaps. Three components: Observer → Analyzer → Actor.

### Task 1: Schema — Intelligence Layer Tables

**New tables:**

```sql
-- Every meaningful user action
user_events (id, event_type, topic, phase_id, task_id, payload JSON, created_at)

-- Derived insights
user_signals (id, signal_type, topic, confidence 0-1, evidence JSON, is_active, created_at, updated_at)

-- Topic mastery scores
topic_scores (id, topic UNIQUE, score 0-100, phase_id, quiz_score, lab_completed, time_spent_minutes, last_activity, updated_at)

-- Personalized recommendations
recommendations (id, source, title, url, content_type, reason, topic, priority 0-1, status, created_at)

-- Bookmarked items
saved_items (id, feed_item_id, recommendation_id, notes, created_at)

-- Generated lab configs (cached LLM output)
generated_lab_configs (id, task_id UNIQUE, config_json, generated_by, quality_rating, regenerate_count, created_at)

-- Unity cross-session memory
unity_memory (id, memory_type, content, source_session_id, is_active, created_at)
```

**Seed data additions:**
- Topic taxonomy: 30-40 fixed topics mapping to roadmap
- Topic tags on quiz questions (hardcoded in seed data)
- Curated resources: ~100 articles/videos/repos from ROADMAP.md

**Decisions:**
- Topic tagging: hardcoded in seed data, LLM auto-tag as fallback
- No daily cost cap — learning ROI > API cost

### Task 2: Observer — Event Tracking

**File:** `lib/observer.ts`

Tracks events from API routes (server-side) and from client (batched, flushed every 10s):

| Event | Source | Trigger |
|-------|--------|---------|
| quiz_answer | Server | POST /api/quiz/submit — per question with topic tag |
| task_complete | Server | PATCH /api/tasks/[id] status=complete |
| task_skip | Analyzer | Task scheduled_day passed without completion |
| lab_result | Server | POST /api/lab/[fieldId] |
| chat_question | Server | POST /api/chat — extract topic from message |
| feed_read | Server | GET /api/feed?markRead= |
| page_visit | Client | ChatPanel pathname change (batched) |
| note_saved | Server | PATCH /api/tasks/[id] with notes |
| session_time | Client | Time on page (batched on unload) |

**Client-side batching:**
- Collect events in memory array
- Flush every 10 seconds via POST /api/events
- Also flush on page unload (navigator.sendBeacon)

**New API route:** POST /api/events (bulk insert)

### Task 3: Analyzer — Pattern Detection

**File:** `lib/analyzer.ts`

**Runs when:** after quiz submission, after task completion, on first page load of the day (lazy, cached 5 min)

**Produces:**

1. **Topic scores** (0-100 per topic):
   - Quiz accuracy on topic × 40%
   - Lab completion for topic × 30%
   - Time spent on topic × 15%
   - Chat question frequency × 15% (inverse — more questions = lower score)

2. **Signals:**
   - `weak_topic`: score < 50 with recent activity
   - `strong_topic`: score > 70
   - `struggling_task`: task open > 3 days
   - `skipped_content`: reading/video never opened past scheduled day
   - `confusion_pattern`: same topic in 3+ chat messages
   - `study_pattern`: daily/hourly activity patterns
   - `pace_alert`: behind/ahead of 42-day schedule

3. **Pace prediction:**
   - Current day vs expected progress
   - "At this pace, Phase 3 finishes Day 38 instead of Day 28"

### Task 4: Recommendation Engine + Lab Generator

**File:** `lib/recommender.ts` + `lib/lab-generator.ts`

**Cap:** 5 active recommendations at any time

**Three content types:**

| Type | Source | When |
|------|--------|------|
| Article/Blog | Feed items + curated resources | Topic score < 50, matching content exists |
| Video | YouTube links from roadmap | User prefers video (tracked by observer) |
| Practice Lab | LLM-generated | Score < 40 AND no existing lab for topic |

**Recommendation includes:**
- Title
- Why it's recommended (human-readable reason tied to specific gap)
- Priority (gap severity × recency)
- Content type badge

**Deduplication:** Don't show same topic 3 times. Max 2 items per topic.

**Auto-archive:** When topic score rises above 60, archive related recommendations.

**Lab generator (two modes):**

Mode A — Generate config for existing labs without one:
- User opens lab → no config in DB → call LLM → generate steps/code/hints/measurements → save to DB
- Subsequent loads: instant from DB
- "Regenerate" button if quality is poor

Mode B — Create NEW lab tasks from gaps:
- Analyzer detects score < 40 on topic with no existing lab
- LLM generates a focused 20-30 min practice lab
- Inserts new task into DB + generated config
- Appears in Lens → For You + Dashboard suggested task

**Generated lab code style:** Scaffolded with TODO comments where user must fill in code. Not complete — forces the user to think.

### Task 5: Rename Feed → Lens + 3 Tabs

**Route:** `/lens` (rename from `/feed`)

**Sidebar nav:** Feed → Lens

**Three tabs:**

| Tab | Content |
|-----|---------|
| **Latest** | Chronological RSS feed (existing functionality) |
| **For You** | Personalized recommendations — articles, videos, practice labs with reason lines |
| **Saved** | Bookmarked items with optional notes |

**For You card design:**
```
┌─────────────────────────────────────────┐
│ 📄 Understanding FSDP Sharding          │
│ PyTorch Docs · Article · 8 min read     │
│                                          │
│ "You got 2 questions wrong about FSDP   │
│  sharding strategies. This tutorial      │
│  explains FULL_SHARD vs SHARD_GRAD_OP   │
│  with diagrams."                         │
│                                          │
│ [Read →]               [Dismiss] [Save]  │
└─────────────────────────────────────────┘
```

**Latest tab enhancement:**
- Items matching user's weak topics get a teal "Relevant to your gaps" badge
- Read items: muted styling

**Bookmark:** Save button on every item. Saved tab shows all with optional notes.

### Task 6: Unity Full App Awareness

**Update:** `lib/chat-context.ts`

**Token budget (~1,400 tokens):**

```
CURRENT PAGE: /lens (user is browsing research)

FEED (5 latest):
- "GRPO: Group Relative Policy Optimization" (arXiv, 2h ago)
- "TRL v0.15: OpenEnv integration" (HuggingFace, 1d ago)
...

BEHAVIOR PROFILE:
- Strong: training_loops (82), backpropagation (78), sft (71)
- Weak: fsdp_sharding (32), deepspeed_zero (28), gradient_accumulation (45)
- Struggling: Phase 2 FSDP lab (3 days, incomplete)
- Pattern: heavy Mon-Wed, drops Thu-Fri. Avg session 45 min.
- Pace: Day 14/42, 28% done (should be 33%) — slightly behind

ACTIVE RECOMMENDATIONS:
- "FSDP Tutorial" (priority 0.9) — not started
- Practice Lab: "ZeRO Stage Comparison" (priority 0.85) — not started

RECENT NOTES (3):
- Phase 2 Lab: "DDP gives 1.85x. Need to try FSDP next."
- Phase 1 Video: "Attention scaling = divide by sqrt(d_k)"
...

MEMORY (from previous sessions):
- User prefers code examples over theory
- Confused about KL penalty — explained twice
- Committed to finishing FSDP lab by Wednesday
```

### Task 7: Unity Cross-Session Memory

**Table:** `unity_memory`

After each session with 3+ exchanges, Unity summarizes key takeaways:
- Facts learned ("User now understands DDP all-reduce")
- Preferences ("Prefers code examples")
- Commitments ("Will finish FSDP lab by Wednesday")
- Confusions ("Still unclear on KL penalty")

**Cap:** Last 20 memories. Oldest get archived when new ones arrive.

**Implementation:** After chat stream ends + session has 3+ messages, call LLM: "Summarize key facts, preferences, and confusions from this conversation in 2-3 bullet points."

### Task 8: Proactive Nudges

**Rules:**
- Max 1 nudge per session (30 min inactivity = new session)
- Max 3 nudges per day
- 48-hour cooldown per topic
- Dismissable with "Got it" button

**Delivery:** Unity chat messages (not page-level toasts) — feels conversational, not robotic.

**Triggers:**

| Trigger | Nudge |
|---------|-------|
| New feed item matches weak topic | "A new paper about FSDP just appeared in Lens — relevant to what you're struggling with." |
| Streak about to break (no activity by 8 PM) | "Your 12-day streak is at risk. Even 15 minutes keeps momentum." |
| Quiz failed twice on same topic | "Before retrying, check the FSDP article I added to your For You tab." |
| Lab result outside expected range | "Your loss is 5.2 after 5K steps — higher than expected. Want me to review your code?" |
| Phase completion | "Phase 2 done! Gap report: FSDP is weakest (score 32). I've created a practice lab." |
| User idle 3+ days on a task | "You've been on the FSDP lab for 3 days. Stuck? Let me help." |

### Task 9: Dynamic Lab Generation

**Two modes:**

**Mode A — Config for existing labs:**
- Check `generated_lab_configs` table → if exists, use it (instant)
- If not, call LLM to generate (10-15 sec, show progress UI)
- Save to DB for future loads
- User can rate (1-5 stars) or regenerate

**Mode B — New labs from gaps:**
- Analyzer detects topic score < 40 with no existing lab
- LLM generates focused practice lab (title, objective, 3-4 steps with scaffolded code + TODOs, measurements with targets, checklist)
- Inserts as new task in DB
- Appears in: Lens → For You, Dashboard suggested task, Unity nudge

**Generated code style:** Scaffolded with TODO markers:
```python
# ── Step 2: Define model ──
class GPT(nn.Module):
    def __init__(self, vocab_size, n_embd=384):
        super().__init__()
        # TODO: Add token embedding (vocab_size → n_embd)
        # TODO: Add positional embedding (block_size → n_embd)
        # TODO: Add transformer blocks
        # TODO: Add final layer norm + linear head
        pass
```

---

## Execution Order

| # | Task | Effort | Depends On |
|---|------|--------|-----------|
| 1 | Schema + seed curated resources + topic tags | 20 min | — |
| 2 | Observer (event tracking + batch API) | 25 min | Schema |
| 3 | Analyzer (topic scores + signals + pace) | 30 min | Observer |
| 4 | Recommender + lab generator | 35 min | Analyzer |
| 5 | Rename Feed → Lens + 3 tabs UI | 25 min | Recommender |
| 6 | Unity full app awareness (context rewrite) | 25 min | All above |
| 7 | Unity cross-session memory | 15 min | Unity awareness |
| 8 | Proactive nudges | 20 min | Memory + analyzer |
| 9 | Dynamic lab generation (Mode A + B) | 30 min | Lab generator |

**Total: ~3.5 hours**

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Cost cap | None | Learning ROI > API cost |
| Topic tagging | Hardcoded in seed, LLM fallback | Reliability + coverage |
| Generated lab code | Scaffolded with TODOs | Forces user to think |
| Nudge delivery | Unity chat messages | Conversational, not robotic |
| Recommendation cap | 5 active items | Prevents overwhelm |
| Page name | "Lens" (was "Feed") | Implies active exploration |
| Observer batching | Client: flush every 10s. Server: immediate | Prevents SQLite contention |
| Analyzer frequency | Lazy — on demand, cached 5 min | Not on every page load |
| Memory cap | 20 entries, oldest archived | Prevents context bloat |
| Token budget | ~1,400 tokens for Unity context | Keeps costs manageable |

---

## Changelog

| Date | Change | Files |
|------|--------|-------|
| 2026-03-18 | Initial build: all 8 pages, 16 API routes, Unity chatbot | 75+ files |
| 2026-03-18 | Warm Academic redesign | globals.css, tailwind.config.ts, all components |
| 2026-03-18 | Unity: fixed inset panel, expand/collapse, session persistence | ChatPanel.tsx, layout.tsx |
| 2026-03-18 | Dashboard: hero-first layout, stat chips, phase tracks | page.tsx |
| 2026-03-18 | Lab IDE: 3-pane split-screen with Monaco editor | lab/[taskId]/page.tsx |
| 2026-03-18 | Lab configs: static JSON for lab 10 | data/lab-configs.json |
| 2026-03-18 | Intelligence layer plan created | PLAN.md |
| 2026-03-18 | Task 1: Schema + seed (7 new tables, 36 topic scores, curated resources) | schema.ts, seed.ts, data/*.json |
| 2026-03-18 | Task 2: Observer (event tracking wired into all API routes) | observer.ts, topic-matcher.ts, 5 API routes |
| 2026-03-18 | Task 3: Analyzer (topic scores, signals, pace prediction) | analyzer.ts, api/analyze |
| 2026-03-18 | Task 4: Recommender (curated + feed matching, 5-item cap) | recommender.ts, api/recommendations |
| 2026-03-18 | Task 5: Feed → Lens rename + 3 tabs (Latest, For You, Saved) | lens/page.tsx, sidebar, mobile nav |
| 2026-03-18 | Task 6: Unity full app awareness (feed, behavior, memory in context) | chat-context.ts |
| 2026-03-18 | Task 7: Unity cross-session memory (20-entry cap, auto-summarize) | unity-memory.ts, chat route |
| 2026-03-18 | Task 8: Proactive nudges (streak, struggling, feed match, quiz fail) | nudges.ts, ChatPanel |
| 2026-03-18 | Task 9: Dynamic lab generation (Mode A: existing, Mode B: gap-driven) | lab-generator.ts, lab page |

---

## Files Reference

```
Key files to know:
├── PLAN.md                          ← this file
├── CLAUDE.md                        ← project guide for AI assistants
├── app/page.tsx                     ← dashboard
├── app/lab/[taskId]/page.tsx        ← split-screen lab IDE
├── components/chat/ChatPanel.tsx    ← Unity global panel
├── lib/chat-context.ts             ← Unity system prompt builder
├── lib/llm/provider.ts             ← LLM factory (OpenAI + Bedrock)
├── lib/schema.ts                   ← all SQL tables
├── lib/streak.ts                   ← streak + daily log logic
├── lib/feed-fetcher.ts             ← RSS aggregation
├── data/lab-configs.json           ← static lab configs
├── data/lab-steps.json             ← static lab steps (legacy)
├── scripts/seed.ts                 ← database seeder

Created (intelligence layer — all complete):
├── lib/observer.ts                 ← event tracking
├── lib/analyzer.ts                 ← pattern detection + topic scores
├── lib/recommender.ts              ← recommendation engine
├── lib/lab-generator.ts            ← dynamic lab config generation
├── data/curated-resources.json     ← 100 hand-picked articles/videos/repos
├── data/topic-taxonomy.json        ← 30-40 fixed topics with aliases
├── app/lens/page.tsx           ← renamed from /feed, 3 tabs
├── app/api/events/route.ts         ← bulk event ingestion
├── app/api/recommendations/route.ts
├── app/api/lab/generate-config/route.ts
```
