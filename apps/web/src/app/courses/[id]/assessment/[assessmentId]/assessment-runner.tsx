"use client";

import { useState, useTransition } from "react";
import { scoreObjectiveAnswer, submitAssessmentAnswers } from "../../../../actions";
import { instantFeedbackMessage, locksInstantChoice } from "./assessment-state";

export type ClientQuestion = {
  questionId: string;
  kind: string;
  difficulty: number;
  prompt: string;
  codeContext?: string;
  starterCode?: string;
  options?: { id: string; text: string }[];
  pairs?: { leftId: string; left: string; rightId: string; right: string }[];
};

type Result = {
  questionId: string;
  correct: boolean | null;
  earnedPoints: number;
  possiblePoints: number;
  weakPoints: string[];
  feedback: string;
};

const shuffleStable = <T,>(items: readonly T[], seed: number) =>
  items
    .map((item, position) => ({ item, key: Math.sin(seed + position * 97) }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

const isChoiceKind = (kind: string) => kind === "mcq" || kind === "prediction";
const givesInstantFeedback = (kind: string) => kind === "mcq";
const isFreeTextKind = (kind: string) => ["fill_blank", "short_answer", "scenario", "identify_issue", "pseudocode"].includes(kind);

export function AssessmentRunner({
  assessmentId,
  courseId,
  lessonId,
  questions,
}: {
  assessmentId: string;
  courseId: string;
  lessonId: string;
  questions: ClientQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | Record<string, string>>>({});
  const [mcqFeedback, setMcqFeedback] = useState<Record<string, boolean | null>>({});
  const [results, setResults] = useState<Result[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const question = questions[index];
  const isLast = index === questions.length - 1;

  if (!question) return null;

  if (results) {
    return (
      <section className="panel module-box section-gap">
        <h2>Results</h2>
        <p className="helper-text">Score: {Math.round((score ?? 0) * 100)}%</p>
        <ul className="lesson-list-block">
          {results.map((result) => {
            const match = questions.find((item) => item.questionId === result.questionId);
            return (
              <li key={result.questionId}>
                <p>{match?.prompt}</p>
                {result.correct === null ? (
                  <span className="status purple">{result.earnedPoints}/{result.possiblePoints} points</span>
                ) : result.correct ? (
                  <span className="status good">Correct</span>
                ) : (
                  <span className="status danger">Review this</span>
                )}
                <p className="helper-text">{result.feedback}</p>
                {result.weakPoints.length > 0 ? (
                  <ul>
                    {result.weakPoints.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="topline section-gap">
          <a className="button ghost-button" href={`/courses/${courseId}/lesson/${lessonId}`}>Back to lesson</a>
          <a className="button ghost-button" href={`/courses/${courseId}/lessons`}>Roadmap</a>
        </div>
      </section>
    );
  }

  const setTextAnswer = (value: string) =>
    setAnswers((current) => ({ ...current, [question.questionId]: value }));

  const setMatchingChoice = (leftId: string, rightId: string) =>
    setAnswers((current) => {
      const existing = current[question.questionId];
      const record = typeof existing === "object" && existing !== null ? existing : {};
      const next = { ...record };
      for (const [otherLeft, chosen] of Object.entries(next)) {
        if (otherLeft !== leftId && chosen === rightId) delete next[otherLeft];
      }
      if (rightId === "") delete next[leftId];
      else next[leftId] = rightId;
      return { ...current, [question.questionId]: next };
    });

  const pickOption = (optionId: string) => {
    if (locksInstantChoice(mcqFeedback[question.questionId])) return;
    setAnswers((current) => ({ ...current, [question.questionId]: optionId }));
    if (!givesInstantFeedback(question.kind)) return;
    startTransition(async () => {
      const outcome = await scoreObjectiveAnswer(assessmentId, question.questionId, optionId);
      setMcqFeedback((current) => ({ ...current, [question.questionId]: outcome?.correct ?? null }));
    });
  };

  const submitAll = () => {
    setError("");
    const payload = questions.map((item) => ({
      questionId: item.questionId,
      response: answers[item.questionId] ?? "",
    }));
    startTransition(async () => {
      const response = await submitAssessmentAnswers(assessmentId, payload);
      if (!response) {
        setError("Could not submit your answers. Try again.");
        return;
      }
      setResults(response.results);
      setScore(response.attempt.score);
    });
  };

  const currentAnswer = answers[question.questionId];

  return (
    <div>
      <p className="helper-text">Question {index + 1} of {questions.length} · Difficulty {question.difficulty}/5</p>
      <section className="panel module-box">
        <h3>{question.prompt}</h3>
        {question.codeContext ? <pre className="lesson-code"><code>{question.codeContext}</code></pre> : null}

        {isChoiceKind(question.kind) && question.options ? (
          <div className="chips">
            {question.options.map((option) => (
              <button
                className={`chip${currentAnswer === option.id ? " active" : ""}`}
                disabled={(givesInstantFeedback(question.kind) && locksInstantChoice(mcqFeedback[question.questionId])) || pending}
                key={option.id}
                onClick={() => pickOption(option.id)}
                type="button"
              >
                {option.text}
              </button>
            ))}
          </div>
        ) : null}

        {question.kind === "fill_blank" ? (
          <input
            onChange={(event) => setTextAnswer(event.target.value)}
            placeholder="Type your answer"
            type="text"
            value={typeof currentAnswer === "string" ? currentAnswer : ""}
          />
        ) : null}

        {question.kind === "matching" && question.pairs ? (
          <ul className="lesson-list-block">
            {question.pairs.map((pair) => {
              const chosen = typeof currentAnswer === "object" && currentAnswer !== null
                ? currentAnswer[pair.leftId] ?? ""
                : "";
              return (
                <li key={pair.leftId}>
                  <span>{pair.left}</span>{" "}
                  <select
                    onChange={(event) => setMatchingChoice(pair.leftId, event.target.value)}
                    value={chosen}
                  >
                    <option value="">Choose…</option>
                    {shuffleStable(question.pairs ?? [], index + 7).map((candidate) => (
                      <option key={candidate.rightId} value={candidate.rightId}>{candidate.right}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        ) : null}

        {isFreeTextKind(question.kind) && question.kind !== "fill_blank" ? (
          <>
            {question.starterCode ? <pre className="lesson-code"><code>{question.starterCode}</code></pre> : null}
            <textarea
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder={question.kind === "pseudocode" ? "Sketch your approach in pseudocode" : "Write your answer"}
              rows={5}
              value={typeof currentAnswer === "string" ? currentAnswer : ""}
            />
          </>
        ) : null}

        {givesInstantFeedback(question.kind) && mcqFeedback[question.questionId] !== undefined ? (
          <p className={`status ${mcqFeedback[question.questionId] === null ? "gray" : mcqFeedback[question.questionId] ? "good" : "danger"}`}>
            {instantFeedbackMessage(mcqFeedback[question.questionId])}
          </p>
        ) : null}
      </section>

      {error ? <p className="status danger">{error}</p> : null}
      <div className="topline section-gap">
        <button className="button ghost-button" disabled={index === 0 || pending} onClick={() => setIndex(index - 1)} type="button">Previous</button>
        {!isLast ? (
          <button className="button" disabled={pending} onClick={() => setIndex(index + 1)} type="button">Next</button>
        ) : (
          <button className="button" disabled={pending} onClick={submitAll} type="button">Submit assessment</button>
        )}
      </div>
    </div>
  );
}
