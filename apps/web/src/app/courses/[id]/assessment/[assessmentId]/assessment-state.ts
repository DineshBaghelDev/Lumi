export type InstantFeedback = boolean | null | undefined;

export const locksInstantChoice = (feedback: InstantFeedback) => typeof feedback === "boolean";

export const instantFeedbackMessage = (feedback: InstantFeedback) => {
  if (feedback === null) return "Could not check this answer yet. You can still submit or try again.";
  return feedback ? "Correct." : "Not quite - keep this in mind for scoring.";
};
