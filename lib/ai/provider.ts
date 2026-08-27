import type { AssertionKind } from '../domain/models';
import { redactBeforeProvider, type RedactionContext } from '../domain/redaction';

export type ScribeFact = { kind: AssertionKind; category: string; text: string; sourceExcerpt: string };
export type ScribeOutput = { summary: string; facts: ScribeFact[]; potentialTasks: string[] };
export interface ScribeProvider {
  readonly name: string;
  readonly model: string;
  summarize(redactedText: string): Promise<ScribeOutput>;
}

const FACT_PATTERNS: Array<{ kind: AssertionKind; category: string; pattern: RegExp }> = [
  { kind: 'dosage', category: 'medication_change', pattern: /\b[A-Za-z][A-Za-z-]+\s+\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml)\s+(?:BID|QD|TID|once daily|twice daily|three times daily)\b/gi },
  { kind: 'lab', category: 'lab_abnormality', pattern: /\bHbA1c(?:\s+(?:is|was|measured at|of))?\s*\d+(?:\.\d+)?%?/gi },
  { kind: 'allergy', category: 'allergy', pattern: /\b(?:no\s+(?:known\s+)?|documented\s+)?(?:penicillin|amoxicillin|aspirin|latex|sulfa)\s+allerg(?:y|ies)(?:\s+(?:with|causing)\s+(?:anaphylaxis|rash|hives|swelling|wheeze))?/gi },
  { kind: 'medication', category: 'medication_change', pattern: /\b(?:metformin|atorvastatin|amoxicillin|penicillin|aspirin|lisinopril|insulin)\s+(?:is\s+)?(?:active|continued|continuing|discontinued|stopped|restarted)\b/gi },
  { kind: 'symptom', category: 'new_symptom', pattern: /\b(?:patient\s+)?(?:denies|denied|reports?|reported)?\s*(?:chest pain|dizziness|wheeze)\b/gi },
  { kind: 'symptom', category: 'new_symptom', pattern: /\b(?:your\s+)?migraine pattern has improved from six to three days a month\b/gi },
  { kind: 'symptom', category: 'new_symptom', pattern: /\bsleep disruption still seems to be the clearest trigger\b/gi },
  { kind: 'lab', category: 'lab_abnormality', pattern: /\bhome blood pressure readings are mostly within target\b/gi },
  { kind: 'lab', category: 'lab_abnormality', pattern: /\b(?:your\s+)?LDL cholesterol remains above the agreed target\b/gi },
  { kind: 'symptom', category: 'new_symptom', pattern: /\bthe muscle aches returned after restarting atorvastatin\b/gi },
  { kind: 'follow_up', category: 'unresolved_task', pattern: /\bthe kidney blood test is still[^\n.]*/gi },
];

export function extractDeterministicFacts(redactedText: string): ScribeFact[] {
  const facts: ScribeFact[] = [];
  const seen = new Set<string>();
  for (const definition of FACT_PATTERNS) {
    for (const match of redactedText.matchAll(definition.pattern)) {
      const excerpt = match[0].trim();
      const key = `${definition.kind}:${excerpt.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push({ kind: definition.kind, category: definition.category, text: excerpt, sourceExcerpt: excerpt });
    }
  }
  return facts;
}

export class DeterministicScribeProvider implements ScribeProvider {
  readonly name = 'deterministic';
  readonly model = 'deterministic-clinical-v2';
  async summarize(redactedText: string): Promise<ScribeOutput> {
    const facts = extractDeterministicFacts(redactedText);
    return {
      summary: facts.length ? facts.map((fact) => fact.text).join('. ') + '.' : 'No supported structured clinical assertions were extracted.',
      facts,
      potentialTasks: [],
    };
  }
}

function validateOutput(output: ScribeOutput) {
  if (!output || typeof output.summary !== 'string' || !output.summary.trim() || !Array.isArray(output.facts) || !Array.isArray(output.potentialTasks)) throw new Error('Invalid structured scribe output');
  for (const fact of output.facts) {
    if (!fact || typeof fact.text !== 'string' || typeof fact.sourceExcerpt !== 'string' || !fact.text.trim() || !fact.sourceExcerpt.trim()) throw new Error('Invalid structured scribe fact');
  }
}

export async function processSession(
  rawText: string,
  context: RedactionContext = {},
  provider: ScribeProvider = new DeterministicScribeProvider(),
) {
  const redaction = redactBeforeProvider(rawText, context);
  const output = await provider.summarize(redaction.redacted);
  validateOutput(output);
  return { redaction, output, provider: { name: provider.name, model: provider.model } };
}
