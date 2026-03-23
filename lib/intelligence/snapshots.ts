import { get, query } from "../db";
import { getTrackedMinutesByTopic } from "../session-analytics";
import { clamp, topicMap } from "./common";
import type { PaceSnapshot, TopicSnapshot } from "./types";

export async function buildTopicSnapshots(): Promise<TopicSnapshot[]> {
  const [topics, trackedMinutesByTopic, topicQuizRows, phaseQuizRows, labRows, chatRows, recentEventRows] =
    await Promise.all([
      query("SELECT * FROM topic_scores"),
      getTrackedMinutesByTopic(30),
      query(
        `SELECT topic,
                COUNT(*) as total,
                SUM(CASE WHEN payload LIKE '%"is_correct":true%' THEN 1 ELSE 0 END) as correct
         FROM user_events
         WHERE event_type = 'quiz_answer'
           AND topic IS NOT NULL
           AND created_at >= datetime('now', '-30 days')
         GROUP BY topic`
      ),
      query(
        `SELECT t.phase_id,
                COUNT(*) as total,
                SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as correct
         FROM quiz_attempts qa
         JOIN quiz_questions qq ON qa.question_id = qq.id
         JOIN tasks t ON qq.task_id = t.id
         GROUP BY t.phase_id`
      ),
      query(
        `SELECT phase_id,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as completed
         FROM tasks
         WHERE type = 'lab'
         GROUP BY phase_id`
      ),
      query(
        `SELECT topic, COUNT(*) as c
         FROM user_events
         WHERE event_type = 'chat_question'
           AND topic IS NOT NULL
           AND created_at >= datetime('now', '-7 days')
         GROUP BY topic`
      ),
      query(
        `SELECT topic, COUNT(*) as c
         FROM user_events
         WHERE topic IS NOT NULL
           AND created_at >= datetime('now', '-14 days')
         GROUP BY topic`
      ),
    ]);

  const topicQuizMap = new Map(
    topicQuizRows.map((row) => [
      row.topic as string,
      {
        total: (row.total as number) ?? 0,
        correct: (row.correct as number) ?? 0,
      },
    ])
  );
  const phaseQuizMap = new Map(
    phaseQuizRows.map((row) => [
      row.phase_id as number,
      {
        total: (row.total as number) ?? 0,
        correct: (row.correct as number) ?? 0,
      },
    ])
  );
  const labMap = new Map(
    labRows.map((row) => [
      row.phase_id as number,
      {
        total: (row.total as number) ?? 0,
        completed: (row.completed as number) ?? 0,
      },
    ])
  );
  const chatMap = new Map(chatRows.map((row) => [row.topic as string, (row.c as number) ?? 0]));
  const eventMap = new Map(recentEventRows.map((row) => [row.topic as string, (row.c as number) ?? 0]));

  return topics.map((topicRow) => {
    const topic = topicRow.topic as string;
    const phaseId = (topicRow.phase_id as number) ?? topicMap.get(topic)?.phase ?? 1;
    const topicQuiz = topicQuizMap.get(topic);
    const phaseQuiz = phaseQuizMap.get(phaseId);
    const quizAttempts = topicQuiz?.total ?? phaseQuiz?.total ?? 0;
    const quizCorrect = topicQuiz?.correct ?? phaseQuiz?.correct ?? 0;
    const quizAccuracy = quizAttempts > 0 ? Math.round((quizCorrect / quizAttempts) * 100) : 50;

    const labStats = labMap.get(phaseId);
    const labTotal = labStats?.total ?? 0;
    const labCompleted = labStats?.completed ?? 0;
    const labCompletionRate = labTotal > 0 ? Math.round((labCompleted / labTotal) * 100) : 50;

    const trackedMinutes = trackedMinutesByTopic.get(topic) ?? 0;
    const chatQuestions = chatMap.get(topic) ?? 0;
    const recentEvents = eventMap.get(topic) ?? 0;
    const timeScore = clamp(Math.round((trackedMinutes / 150) * 100), 0, 100);
    const confusionPenalty = clamp(chatQuestions * 12 + Math.max(0, 2 - recentEvents) * 4, 0, 100);

    const score = clamp(
      Math.round(
        quizAccuracy * 0.42 +
          labCompletionRate * 0.28 +
          timeScore * 0.18 +
          (100 - confusionPenalty) * 0.12
      ),
      0,
      100
    );

    return {
      topic,
      phase_id: phaseId,
      score,
      quizAccuracy,
      quizAttempts,
      labCompletionRate,
      labCompleted,
      labTotal,
      trackedMinutes,
      chatQuestions,
      recentEvents,
    };
  });
}

export async function buildPaceSnapshot(currentDay: number): Promise<PaceSnapshot> {
  const [totalTasks, totalDone] = await Promise.all([
    get("SELECT COUNT(*) as c FROM tasks"),
    get("SELECT COUNT(*) as c FROM tasks WHERE status = 'complete'"),
  ]);
  const total = (totalTasks?.c as number) || 1;
  const done = (totalDone?.c as number) || 0;
  const expectedProgress = Math.round((currentDay / 42) * 100);
  const actualProgress = Math.round((done / total) * 100);
  const gap = expectedProgress - actualProgress;

  let prediction = "on_track";
  if (gap > 20) prediction = "falling_behind";
  else if (gap > 10) prediction = "slightly_behind";
  else if (gap < -5) prediction = "ahead";

  return {
    currentDay,
    expectedProgress,
    actualProgress,
    prediction,
  };
}
