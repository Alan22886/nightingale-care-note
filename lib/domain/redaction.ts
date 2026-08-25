export type RedactionCategory = 'NAME' | 'ID' | 'PHONE' | 'EMAIL' | 'ADDRESS' | 'DOB';
export type RedactionResult = { redacted: string; categories: RedactionCategory[] };
const RULES: Array<[RedactionCategory, RegExp]> = [
  ['EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['PHONE', /(?:\+65[\s-]?)?[689]\d{3}[\s-]?\d{4}\b/g],
  ['ID', /\b[STFGM]\d{7}[A-Z]\b/gi],
  ['DOB', /\b(?:DOB|date of birth)\s*[:\-]?\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/gi],
  ['ADDRESS', /\b\d{1,4}\s+[A-Za-z][A-Za-z\s]+(?:Road|Rd|Street|St|Avenue|Ave|Lane|Ln|Drive|Dr)\b[^\n,]*/gi],
  ['NAME', /\bSarah Tan\b/gi],
];
export function redactBeforeProvider(raw: string): RedactionResult {
  const categories: RedactionCategory[] = []; let redacted = raw;
  for (const [category, pattern] of RULES) redacted = redacted.replace(pattern, () => { categories.push(category); return `[${category}]`; });
  return { redacted, categories: [...new Set(categories)] };
}
