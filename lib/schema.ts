export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS phases (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  order_num INTEGER NOT NULL,
  start_week INTEGER NOT NULL,
  end_week INTEGER NOT NULL,
  gate_check_text TEXT,
  status TEXT DEFAULT 'locked' CHECK(status IN ('locked','active','complete'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  phase_id INTEGER NOT NULL REFERENCES phases(id),
  type TEXT NOT NULL CHECK(type IN ('video','reading','lab','quiz')),
  title TEXT NOT NULL,
  description TEXT,
  content_url TEXT,
  estimated_minutes INTEGER,
  order_num INTEGER NOT NULL,
  status TEXT DEFAULT 'todo' CHECK(status IN ('todo','in_progress','complete')),
  scheduled_day INTEGER,
  notes TEXT,
  takeaways TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS task_segments (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  label TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  completed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  question TEXT NOT NULL,
  type TEXT DEFAULT 'mcq' CHECK(type IN ('mcq','freetext')),
  options_json TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  order_num INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id),
  result_id INTEGER NOT NULL REFERENCES quiz_results(id),
  user_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  attempted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lab_fields (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  field_name TEXT NOT NULL,
  field_unit TEXT,
  placeholder_text TEXT,
  resume_placeholder TEXT,
  order_num INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_results (
  id INTEGER PRIMARY KEY,
  field_id INTEGER NOT NULL UNIQUE REFERENCES lab_fields(id),
  value TEXT NOT NULL,
  terminal_output TEXT,
  notes TEXT,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_bullets (
  id INTEGER PRIMARY KEY,
  bullet_text TEXT NOT NULL,
  placeholder TEXT NOT NULL,
  linked_field_id INTEGER REFERENCES lab_fields(id),
  filled_value TEXT,
  status TEXT DEFAULT 'empty' CHECK(status IN ('empty','filled'))
);

CREATE TABLE IF NOT EXISTS proof_artifacts (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  field_id INTEGER UNIQUE REFERENCES lab_fields(id),
  title TEXT NOT NULL,
  artifact_type TEXT DEFAULT 'metric' CHECK(artifact_type IN ('metric','project','evaluation','writeup')),
  proof_statement TEXT NOT NULL,
  explanation TEXT,
  evidence_summary TEXT,
  metric_label TEXT,
  metric_value TEXT,
  metric_unit TEXT,
  repo_url TEXT,
  artifact_url TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','ready','exported')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_log (
  id INTEGER PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  minutes_spent INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS streaks (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_active_date TEXT
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New conversation',
  phase_id INTEGER REFERENCES phases(id),
  task_id INTEGER REFERENCES tasks(id),
  model TEXT DEFAULT 'gpt',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY,
  session_id INTEGER REFERENCES chat_sessions(id),
  phase_id INTEGER REFERENCES phases(id),
  task_id INTEGER REFERENCES tasks(id),
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  model TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_value TEXT,
  current_value TEXT,
  category TEXT DEFAULT 'learning' CHECK(category IN ('learning','resume','career','project')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','achieved','dropped')),
  phase_id INTEGER REFERENCES phases(id),
  created_at TEXT DEFAULT (datetime('now')),
  achieved_at TEXT
);

CREATE TABLE IF NOT EXISTS learner_profile (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  learner_name TEXT NOT NULL DEFAULT 'Builder',
  current_role TEXT NOT NULL DEFAULT 'Software Engineer',
  target_role TEXT NOT NULL DEFAULT 'ML System Engineer',
  active_path_name TEXT NOT NULL DEFAULT 'ML Systems Path',
  primary_specialization TEXT NOT NULL DEFAULT 'Reinforcement Learning',
  weekly_hours INTEGER NOT NULL DEFAULT 10,
  mission_statement TEXT NOT NULL DEFAULT 'Build systems that train, align, and evaluate frontier models.',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feed_items (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  summary TEXT,
  published_at TEXT,
  fetched_at TEXT DEFAULT (datetime('now')),
  is_read INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_events (
  id INTEGER PRIMARY KEY,
  event_type TEXT NOT NULL,
  topic TEXT,
  phase_id INTEGER,
  task_id INTEGER,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_signals (
  id INTEGER PRIMARY KEY,
  signal_type TEXT NOT NULL,
  topic TEXT,
  confidence REAL DEFAULT 0.5,
  evidence TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS topic_scores (
  id INTEGER PRIMARY KEY,
  topic TEXT UNIQUE NOT NULL,
  score INTEGER DEFAULT 50,
  phase_id INTEGER,
  quiz_score REAL,
  lab_completed INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  last_activity TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  content_type TEXT,
  reason TEXT NOT NULL,
  topic TEXT,
  priority REAL DEFAULT 0.5,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','dismissed','completed','archived')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_items (
  id INTEGER PRIMARY KEY,
  feed_item_id INTEGER REFERENCES feed_items(id),
  recommendation_id INTEGER REFERENCES recommendations(id),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generated_lab_configs (
  id INTEGER PRIMARY KEY,
  task_id INTEGER UNIQUE NOT NULL REFERENCES tasks(id),
  config_json TEXT NOT NULL,
  generated_by TEXT DEFAULT 'gpt',
  quality_rating INTEGER,
  regenerate_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS unity_memory (
  id INTEGER PRIMARY KEY,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  source_session_id INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(scheduled_day);
CREATE INDEX IF NOT EXISTS idx_segments_task ON task_segments(task_id);
CREATE INDEX IF NOT EXISTS idx_quiz_q_task ON quiz_questions(task_id);
CREATE INDEX IF NOT EXISTS idx_lab_fields_task ON lab_fields(task_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_task ON proof_artifacts(task_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON proof_artifacts(status);
CREATE INDEX IF NOT EXISTS idx_feed_source ON feed_items(source);
CREATE INDEX IF NOT EXISTS idx_feed_published ON feed_items(published_at);
CREATE INDEX IF NOT EXISTS idx_daily_log_date ON daily_log(date);
CREATE INDEX IF NOT EXISTS idx_quiz_results_task ON quiz_results(task_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_result ON quiz_attempts(result_id);
CREATE INDEX IF NOT EXISTS idx_chat_phase ON chat_messages(phase_id);
CREATE INDEX IF NOT EXISTS idx_chat_task ON chat_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_topic ON user_events(topic);
CREATE INDEX IF NOT EXISTS idx_events_created ON user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_signals_type ON user_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_topic ON user_signals(topic);
CREATE INDEX IF NOT EXISTS idx_signals_active ON user_signals(is_active);
CREATE INDEX IF NOT EXISTS idx_topic_scores_topic ON topic_scores(topic);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_topic ON recommendations(topic);
CREATE INDEX IF NOT EXISTS idx_saved_feed ON saved_items(feed_item_id);
CREATE INDEX IF NOT EXISTS idx_generated_labs_task ON generated_lab_configs(task_id);
CREATE INDEX IF NOT EXISTS idx_unity_memory_active ON unity_memory(is_active);
CREATE INDEX IF NOT EXISTS idx_profile_specialization ON learner_profile(primary_specialization);
`;
