import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSourceGrounding } from '../../lib/domain/assertions.ts';

function ground(sourceText, claim, kind = 'dosage', excerpt = sourceText) {
  const startOffset = sourceText.indexOf(excerpt);
  return validateSourceGrounding({ kind, claim, sourceText, startOffset, endOffset: startOffset < 0 ? -1 : startOffset + excerpt.length });
}

test('rejects a 500 mg source changed to 1000 mg', () => {
  assert.equal(ground('Metformin 500 mg twice daily', 'Metformin 1000 mg twice daily').releaseState, 'abstained');
});
test('rejects twice daily changed to once daily', () => {
  assert.equal(ground('Metformin 500 mg twice daily', 'Metformin 500 mg once daily').releaseState, 'abstained');
});
test('rejects an HbA1c 7.3 source changed to 8.3', () => {
  assert.equal(ground('HbA1c 7.3%', 'HbA1c 8.3%', 'lab').releaseState, 'abstained');
});
test('rejects a denied symptom changed to an asserted symptom', () => {
  assert.equal(ground('Patient denies chest pain.', 'Patient reports chest pain.', 'symptom').releaseState, 'abstained');
});
test('rejects no penicillin allergy changed to penicillin allergy', () => {
  assert.equal(ground('No penicillin allergy', 'Penicillin allergy', 'allergy').releaseState, 'abstained');
});
test('accepts deterministic BID and twice-daily equivalence', () => {
  assert.equal(ground('Metformin 500 mg BID', 'Metformin 500 mg twice daily').releaseState, 'grounded');
});
test('accepts harmless wording around the same medication and dose', () => {
  assert.equal(ground('Continuing metformin 500 mg twice daily', 'Metformin 500 mg twice daily continues').releaseState, 'grounded');
});
test('abstains when the exact source span is missing', () => {
  assert.equal(ground('Metformin 500 mg twice daily', 'Metformin 500 mg twice daily', 'dosage', 'missing span').releaseState, 'abstained');
});
