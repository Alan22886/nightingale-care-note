export type RedactionCategory = 'NAME' | 'ID' | 'PHONE' | 'EMAIL' | 'ADDRESS' | 'DOB';
export type RedactionResult = { redacted: string; categories: RedactionCategory[] };
export type RedactionContext = { knownNames?: string[] };
const RULES: Array<[RedactionCategory, RegExp]> = [
  ['EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['PHONE', /(?:\+65[\s-]?)?[689]\d{3}[\s-]?\d{4}\b/g],
  ['ID', /\b[STFGM]\d{7}[A-Z]\b/gi],
  ['DOB', /\b(?:DOB|date of birth)\s*[:\-]?\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/gi],
  ['ADDRESS', /\b\d{1,4}\s+[A-Za-z][A-Za-z\s]+(?:Road|Rd|Street|St|Avenue|Ave|Lane|Ln|Drive|Dr)\b[^,.;\n]*(?:\s*\n\s*(?:Singapore\s*)?\d{6})?/gi],
  ['NAME', /\b(?:Dr|Mr|Ms|Mdm)\s+[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,3}\b/gu],
  ['NAME', /\b(?:Patient|Name)\s*:\s*[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,3}\b/gu],
];
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function redactBeforeProvider(raw: string, context: RedactionContext = {}): RedactionResult {
  const categories: RedactionCategory[] = []; let redacted = raw;
  for (const [category, pattern] of RULES) redacted = redacted.replace(pattern, () => { categories.push(category); return `[${category}]`; });
  const names = [...new Set(['Sarah Tan', ...(context.knownNames ?? [])].map((name) => name.trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
  for (const name of names) {
    redacted = redacted.replace(new RegExp(escapeRegExp(name), 'giu'), () => { categories.push('NAME'); return '[NAME]'; });
  }
  return { redacted, categories: [...new Set(categories)] };
}
