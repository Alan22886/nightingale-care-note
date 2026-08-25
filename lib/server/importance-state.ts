import type { FeedbackAction, HighlightCategory } from '../domain/models'; import { updateClinicWeights } from '../domain/learning';
export let apiWeights:Record<HighlightCategory,number>={lab_abnormality:1,new_symptom:1,unresolved_task:1,medication_change:1,administrative:1};
export function resetWeights(){apiWeights={lab_abnormality:1,new_symptom:1,unresolved_task:1,medication_change:1,administrative:1};}
export function recordFeedback(category:HighlightCategory,action:FeedbackAction){apiWeights=updateClinicWeights(apiWeights,category,action);return apiWeights;}
