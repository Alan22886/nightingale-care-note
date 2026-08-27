import assert from 'node:assert/strict';
import test from 'node:test';
import { hasDeterministicSafetyFloor, rankHighlights } from '../../lib/domain/importance.ts';
import { FEEDBACK_SIGNAL } from '../../lib/domain/learning.ts';

const item = (id, risk, status = 'suggested') => ({ id, category: 'new_symptom', level: risk >= .9 ? 'Critical' : 'Follow-up', components: { risk, unresolved: 0, recency: 0, clinicalChange: 0, conflict: 0, confirmation: 0 }, status, pinned: false });
test('safety-floor items remain surfaced after a dismissed state', () => {
  const protectedItem = item('protected', .95, 'dismissed');
  assert.equal(hasDeterministicSafetyFloor(protectedItem), true);
  assert.deepEqual(rankHighlights([protectedItem, item('ordinary', .2, 'dismissed')], { new_symptom: 1 }).map(({ id }) => id), ['protected']);
});
test('acknowledgement does not train clinical ordering', () => assert.equal(FEEDBACK_SIGNAL.acknowledge, 0));
