import { redactBeforeProvider } from '../domain/redaction';
export type ScribeOutput = { summary: string; facts: Array<{ category: string; text: string; sourceExcerpt: string }>; potentialTasks: string[] };
export interface ScribeProvider { summarize(redactedText: string): Promise<ScribeOutput>; }
export class DeterministicScribeProvider implements ScribeProvider {
  async summarize(redactedText: string): Promise<ScribeOutput> {
    if (!redactedText.includes('[NAME]')) throw new Error('Provider input was not redacted');
    return { summary: 'Patient reports dizziness after a recent medication adjustment.', facts: [{ category: 'new_symptom', text: 'Dizziness after medication change', sourceExcerpt: 'dizziness since the medication adjustment last week' }], potentialTasks: ['Clinician medication review'] };
  }
}
export async function processSession(rawText: string, provider: ScribeProvider = new DeterministicScribeProvider()) {
  const redaction = redactBeforeProvider(rawText); const output = await provider.summarize(redaction.redacted);
  if (!output.summary || !Array.isArray(output.facts) || !Array.isArray(output.potentialTasks)) throw new Error('Invalid structured scribe output');
  return { redaction, output };
}
