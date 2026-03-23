# Epoch — Project Guide

## What is this
A personalized AI/ML self-learning OS. Tracks progress through a 6-week ML Systems Engineer roadmap. Features an AI study partner (Unity), adaptive intelligence layer, split-screen lab IDE, and personalized content recommendations. "Warm Academic" aesthetic — cream backgrounds, Lora serif headings, teal accents.

## Stack
- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS + inline styles with CSS custom properties ("Warm Academic" theme)
- **Database:** SQLite via `lib/db.ts` abstraction (better-sqlite3 local, @libsql/client Turso prod)
- **AI:** OpenAI GPT (primary), AWS Bedrock Claude (secondary) via `lib/llm/`
- **Editor:** Monaco Editor (@monaco-editor/react) for lab IDE
- **Markdown:** marked + dompurify for Unity chat rendering
- **Icons:** Lucide React
- **Feed:** rss-parser for RSS/Atom, native fetch for Reddit/arXiv

## Key Commands
```bash
npm run dev          # Dev server (port 3000) — use `next start` for production
npm run build        # Production build
npm run seed         # Seed local database from data/ JSON files
npm run seed:prod    # Seed Turso (needs TURSO_URL + TURSO_AUTH_TOKEN)
```

## Env Vars (.env.local)
```
OPENAI_API_KEY=...          # Required for Unity chat
AWS_ACCESS_KEY_ID=...       # Optional (Bedrock)
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
TURSO_URL=...               # Production only
TURSO_AUTH_TOKEN=...
```

**IMPORTANT:** Next.js `next start` bakes env vars at build time. After changing `.env.local`, must rebuild (`rm -rf .next && npm run build`) AND `unset OPENAI_API_KEY` in shell (shell env overrides .env.local).

## Design: "Warm Academic"
- **Palette:** page #faf7f2, surface #f2ede4, sunken #e9e3d8, hero #eef5f2, briefing #f2ede4
- **Accents:** teal #2a7c6f (CTAs, progress, active), rust #c45c2a (warnings, phase badges), gold #b08d3c (quiz, achievements)
- **Fonts:** Lora serif (headings, --font-display), DM Sans (body, --font-body)
- **Rules:** No shadows, 8px card radius, 6px button radius, grain texture overlay, 3px scrollbars
- **Code blocks:** dark bg #16120e, DM Mono, warm syntax colors (keywords gold, functions teal, strings green)

## Desktop Layout
```
[Sidebar 240px] [Main Content flex:1, margin-right:582px] [Unity Panel 550px fixed]
```
- Sidebar: nav (Dashboard, Phases, AI Lab, Lens, Resume, Goals), phase progress bars, lab count badge
- Unity: position:fixed, top/right/bottom 16px, border-radius 20px, expand/collapse to 680px modal
- Lab IDE: overrides layout — 3-pane (Guide 280px | Monaco Editor flex:1 | Inline Unity 300px)

## Pages (10 routes)
- **Dashboard** `/` — nudge banner → daily briefing → hero focus → stats chips → week calendar → phase tracks → feed/goals grid
- **Phases** `/phases`, `/phases/[id]` — index grid + detail with task list
- **AI Lab** `/labs` — grouped grid (in-progress/available/completed/locked), filter bar, difficulty badges
- **Lab IDE** `/lab/[taskId]` — split-screen: guide + Monaco editor + inline Unity chat
- **Learn** `/learn/[taskId]` — video player (52vh max) + segments + notes + reading view
- **Quiz** `/quiz/[taskId]` — MCQ + freetext, one-at-a-time, results with retake
- **Lens** `/lens` — 3 tabs: Latest (RSS), For You (recommendations), Saved (bookmarks). Handles ?highlight= and ?tab= query params for deep links.
- **Resume** `/resume` — bullet cards with [X] placeholder tracking
- **Goals** `/goals` — add/edit/delete with category filters

## API Routes (30+)
```
/api/dashboard          # Aggregate dashboard data
/api/phases, /api/phases/[id]  # Phase CRUD
/api/tasks/[id]         # Task CRUD + segments toggle
/api/quiz/[taskId]/submit  # Quiz submission
/api/lab/[fieldId]      # Lab result saving → resume linking
/api/lab/generate-config   # Dynamic lab config generation
/api/labs               # All labs with metadata
/api/resume             # Resume bullets with fill status
/api/feed, /api/feed/refresh  # RSS aggregation
/api/lens → redirect to /api/feed
/api/streak, /api/daily-log   # Activity tracking
/api/chat, /api/chat/history, /api/chat/sessions  # Unity streaming + sessions
/api/goals              # Goals CRUD
/api/events             # Bulk user event ingestion
/api/analyze            # Analyzer (topic scores, signals, pace)
/api/recommendations    # Personalized recommendations CRUD
/api/saved              # Bookmarked items
/api/nudges             # Proactive nudge checking with deep-link CTAs
/api/web-search         # DuckDuckGo + arXiv search
```

## Intelligence Layer
```
Observer → Analyzer → Recommender → Nudges → Unity Context
```
- **Observer** (`lib/observer.ts`): tracks quiz_answer, task_complete, lab_result, chat_question, feed_read, page_visit events
- **Topic Matcher** (`lib/topic-matcher.ts`): matches text against 36-topic taxonomy
- **Analyzer** (`lib/analyzer.ts`): topic scoring (0-100), gap detection, confusion patterns, pace prediction, auto-creates gap labs
- **Recommender** (`lib/recommender.ts`): matches weak topics to curated resources + feed items, 5-item cap
- **Lab Generator** (`lib/lab-generator.ts`): Mode A (generate config for existing labs), Mode B (create new labs from gaps)
- **Nudges** (`lib/nudges.ts`): 3-tier urgency (low/medium/high), deep-link CTAs to specific content
- **Unity Memory** (`lib/unity-memory.ts`): cross-session memory, 20-entry cap, auto-summarize
- **Unity Context** (`lib/chat-context.ts`): 1400-token budget — feed items, behavior profile, signals, notes, memory, recommendations, app page map

## Unity (AI Study Partner)
- Streaming SSE via `/api/chat`
- Strict scope: ONLY ML/AI/training topics — off-topic questions get redirected
- Auto web search: `[SEARCH_NEEDED: query]` in response triggers server-side DuckDuckGo + arXiv search
- Rich chat: markdown rendering (marked.js), dark code blocks with copy button, message actions (edit/retry/copy/thumbs)
- File attachments: .py .txt .csv .json .md .pdf + image paste
- 3-tier nudge delivery: LOW (dot on sidebar), MEDIUM (pinned card in chat), HIGH (banner in content area)
- Session persistence in localStorage per page path
- Chat sessions with history dropdown

## Database (20 tables)
Core: phases, tasks, task_segments, quiz_questions, quiz_results, quiz_attempts, lab_fields, lab_results, resume_bullets, daily_log, streaks, feed_items, goals
Chat: chat_sessions, chat_messages
Intelligence: user_events, user_signals, topic_scores, recommendations, saved_items, generated_lab_configs, unity_memory

## Key Patterns
- All pages are client components ("use client") fetching from /api/ routes
- Task completion: PATCH task → TimeLoggerModal → POST daily-log → refetch
- Lab results with resume_placeholder auto-update resume_bullets table
- Lab IDE: overrides parent layout via CSS `:has(.lab-ide-root)` to remove padding/margin
- Global ChatPanel hidden on lab page via `.global-unity-panel` CSS class
- Nudges carry deep-link CTAs: `/lens?highlight=topic`, `/lab/[id]`, `/learn/[id]`
- Feed renamed to "Lens" throughout (sidebar, mobile nav, all links)
- Server restart required after .env.local changes: `fuser -k 3000/tcp; rm -rf .next; npm run build; unset OPENAI_API_KEY; npx next start -p 3000`

## File Reference
```
lib/
  db.ts, db-local.ts, db-turso.ts  # Database abstraction
  schema.ts           # 20 tables + indexes
  streak.ts           # Streak + daily log
  feed-fetcher.ts     # RSS aggregation
  observer.ts         # Event tracking
  topic-matcher.ts    # Topic taxonomy matching
  analyzer.ts         # Topic scores + signals
  recommender.ts      # Recommendation engine
  lab-generator.ts    # Dynamic lab generation
  unity-memory.ts     # Cross-session memory
  nudges.ts           # 3-tier nudge system with deep links
  chat-context.ts     # Unity system prompt builder (~1400 tokens)
  llm/provider.ts     # LLM factory → bedrock.ts + openai.ts

data/
  phases.json, tasks.json, quiz-questions.json, video-segments.json
  lab-fields.json, resume-bullets.json
  lab-configs.json    # Static lab configs (lab 10)
  lab-steps.json      # Static lab steps (legacy)
  topic-taxonomy.json # 36 topics with aliases
  curated-resources.json  # 40+ articles/videos/repos

components/
  layout/    # Sidebar (240px), MobileNav
  chat/      # ChatPanel, ChatMessage (markdown), ChatInput (attachments), MarkdownRenderer, UnityLogo, ModelSelector, ContextBadge, ExpandIcon
  dashboard/ # StreakBar, PhaseTimeline, DailyFocus, TodayChecklist, WeeklyHeatmap, StatsRow, FeedPreview, GoalsPreview, ResumeProgress
  ui/        # Card, Button, Badge, ProgressBar, ProgressRing, TimeLoggerModal, EmptyState, Toast, Skeleton, NudgeBanner
  learn/     # VideoPlayer, SegmentTracker, NotesEditor, ReadingView
  lab/       # ResultField, TerminalOutput, LabForm
  quiz/      # QuestionCard, AnswerOptions, QuizResults
  feed/      # FeedItem, FeedFilter, SourceBadge
  resume/    # BulletCard, PlaceholderStatus
  goals/     # GoalCard, AddGoalModal
```

## Deploy
- **Local:** `npm run build && npx next start -p 3000`
- **Production:** Vercel (free) + Turso (free) — set env vars in Vercel dashboard
- **PWA:** manifest.json + SVG icons for Android install

## Docs
- `PLAN.md` — master plan with changelog + architecture decisions
- `CLAUDE.md` — this file
- Spec: `anthropic-ml-systems-roadmap/docs/superpowers/specs/2026-03-16-ml-forge-design.md`
- Plan: `anthropic-ml-systems-roadmap/docs/superpowers/plans/2026-03-16-ml-forge-plan.md`
