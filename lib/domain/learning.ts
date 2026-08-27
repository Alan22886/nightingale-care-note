import { clampMultiplier } from './importance.ts';
import type { FeedbackAction, HighlightCategory } from './models';
export const FEEDBACK_SIGNAL: Record<FeedbackAction, number> = { pin: 3, accept: 2, source_open: 1, dismiss: -2, acknowledge: 0 };
export function learnWeight(current: number, action: FeedbackAction, exposures = 1) {
  // Sparse feedback is deliberately shrunk. As exposure grows, one click has less leverage,
  // limiting fatigue and exposure bias while preserving the existing bounded adaptation.
  const exposureDenominator = Math.max(4, exposures);
  return clampMultiplier(current + FEEDBACK_SIGNAL[action] * (0.1 / exposureDenominator));
}
export function updateClinicWeights(weights: Record<HighlightCategory, number>, category: HighlightCategory, action: FeedbackAction, exposures = 1) {
  return { ...weights, [category]: learnWeight(weights[category] ?? 1, action, exposures) };
}
