export type SignalType =
  | "mastery"
  | "confusion"
  | "drift"
  | "momentum"
  | "proof_gap"
  | "recommendation_opportunity";

export interface LearningSignal {
  signal_type: SignalType;
  topic: string;
  confidence: number;
  evidence: string;
}

export interface TopicSnapshot {
  topic: string;
  phase_id: number;
  score: number;
  quizAccuracy: number;
  quizAttempts: number;
  labCompletionRate: number;
  labCompleted: number;
  labTotal: number;
  trackedMinutes: number;
  chatQuestions: number;
  recentEvents: number;
}

export interface PaceSnapshot {
  currentDay: number;
  expectedProgress: number;
  actualProgress: number;
  prediction: string;
}

export interface LearningState {
  topicSnapshots: TopicSnapshot[];
  signals: LearningSignal[];
  pace: PaceSnapshot;
}

export interface ActiveSignal extends LearningSignal {
  id?: number;
  created_at?: string;
  updated_at?: string;
}
