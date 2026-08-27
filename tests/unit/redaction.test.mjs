import assert from 'node:assert/strict';
import test from 'node:test';
import { redactBeforeProvider } from '../../lib/domain/redaction.ts';

const context = { knownNames: ['Jason Lee', 'Marcus Lim', 'Maya Tan', '陈小明'] };
const fixtures = [
  'I spoke with Jason Lee yesterday.',
  'Dr Marcus Lim reviewed the medication.',
  'Jason Lee and Maya Tan attended together.',
  '18 Orchard Road\nSingapore 238823',
  JSON.stringify({ patient: 'Jason Lee', medication: 'metformin 500 mg BID' }),
  'Patient=Jason Lee\nClinician=Dr Marcus Lim',
  '患者：陈小明，HbA1c 7.3%',
  'Jason Lee · S1234567A · +65 9123 4567 · jason@example.com · DOB: 12/04/1972 · 18 Orchard Road',
];

test('redacts contextual known names across prose and structured fixtures', () => {
  let falseNegatives = 0;
  for (const raw of fixtures) {
    const result = redactBeforeProvider(raw, context);
    for (const name of context.knownNames) if (raw.includes(name) && result.redacted.includes(name)) falseNegatives += 1;
  }
  assert.equal(falseNegatives, 0);
});
test('redacts titled proper names without removing clinical facts', () => {
  const raw = 'Dr Marcus Lim reviewed metformin 500 mg BID. HbA1c 7.3% on 24 Aug 2026.';
  const result = redactBeforeProvider(raw, context);
  assert.equal(result.redacted.includes('Marcus Lim'), false);
  for (const clinical of ['metformin 500 mg BID', 'HbA1c 7.3%', '24 Aug 2026']) assert.ok(result.redacted.includes(clinical));
});
test('retains ordinary capitalized clinical phrases to avoid broad false positives', () => {
  const raw = 'Renal Function remains stable. Blood Pressure reviewed.';
  const result = redactBeforeProvider(raw, context);
  assert.equal(result.redacted, raw);
});
