import type { Highlight, HighlightCategory, ScoreComponents } from './models';

export const SCORE_WEIGHTS = {
  risk: 4, unresolved: 3, recency: 2, clinicalChange: 3, conflict: 2.5, confirmation: 1,
} as const;
export const LEARNING_BOUNDS = { min: 0.8, max: 1.35 } as const;

export function baseScore(c: ScoreComponents) {
  return c.risk * SCORE_WEIGHTS.risk + c.unresolved * SCORE_WEIGHTS.unresolved +
    c.recency * SCORE_WEIGHTS.recency + c.clinicalChange * SCORE_WEIGHTS.clinicalChange +
    c.conflict * SCORE_WEIGHTS.conflict + c.confirmation * SCORE_WEIGHTS.confirmation;
}
export function scoreHighlight(h: Highlight, multipliers: Record<HighlightCategory, number>) {
  return baseScore(h.components) * clampMultiplier(multipliers[h.category] ?? 1);
}
export function rankHighlights(items: Highlight[], multipliers: Record<HighlightCategory, number>) {
  return [...items].filter((h) => h.status !== 'dismissed').sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return scoreHighlight(b, multipliers) - scoreHighlight(a, multipliers);
  });
}
export function clampMultiplier(value: number) { return Math.min(LEARNING_BOUNDS.max, Math.max(LEARNING_BOUNDS.min, value)); }
export function scoreReasons(h: Highlight, multiplier = 1) {
  const labels: string[] = [];
  if (h.components.risk >= .7) labels.push('Elevated clinical attention');
  if (h.components.unresolved) labels.push('Unresolved action');
  if (h.components.recency >= .7) labels.push('Recent information');
  if (h.components.clinicalChange) labels.push(h.category === 'new_symptom' ? 'New symptom' : 'Meaningful clinical change');
  if (h.components.conflict) labels.push('Conflicting information detected');
  if (h.components.confirmation) labels.push('Clinician confirmed');
  if (multiplier > 1.05) labels.push('Frequently confirmed by this clinic');
  return labels;
}
