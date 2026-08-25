import type { HighlightCategory } from '../domain/models';
export const sourceEntries={ai_session:{id:'ai_session',version:{id:'ai_session-v1',content:'Patient reports episodes of dizziness since the medication adjustment last week.'}},doctor_review:{id:'doctor_review',version:{id:'doctor_review-v2',content:'HbA1c has increased from 7.1% to 8.3% since the previous review.'}},nurse_followup:{id:'nurse_followup',version:{id:'nurse_followup-v1',content:'Renal function laboratory follow-up remains pending.'}}};
export const apiHighlights=[
  make('h1','lab_abnormality','doctor_review','HbA1c has increased from 7.1% to 8.3%'),
  make('h2','new_symptom','ai_session','dizziness since the medication adjustment last week',true),
  make('h3','unresolved_task','nurse_followup','Renal function laboratory follow-up remains pending.'),
];
function make(id:string,category:HighlightCategory,sourceEntryId:keyof typeof sourceEntries,excerpt:string,ai=false){const source=sourceEntries[sourceEntryId];const start=source.version.content.indexOf(excerpt);return{id,category,ai,provenance:{sourceEntryId,sourceVersionId:source.version.id,startOffset:start,endOffset:start+excerpt.length,sourceExcerpt:excerpt}};}
