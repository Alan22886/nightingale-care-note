import { clampMultiplier } from './importance';
import type { FeedbackAction, HighlightCategory } from './models';
export const FEEDBACK_SIGNAL: Record<FeedbackAction, number> = { pin: 3, accept: 2, source_open: 1, dismiss: -2 };
export function learnWeight(current: number, action: FeedbackAction) {
  return clampMultiplier(current + FEEDBACK_SIGNAL[action] * 0.025);
}
export function updateClinicWeights(weights: Record<HighlightCategory, number>, category: HighlightCategory, action: FeedbackAction) {
  return { ...weights, [category]: learnWeight(weights[category] ?? 1, action) };
}
