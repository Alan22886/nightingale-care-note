import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { failClosedHighlights, validateStoredProvenance } from '../../lib/server/provenance.ts';

const content = 'Metformin 500 mg twice daily';
const excerpt = '500 mg';
const start = content.indexOf(excerpt);
const entries = [{ id: 'entry', entry_versions: [{ id: 'version', content }] }];
const base = { id: 'highlight', provenance_spans: [{ source_entry_id: 'entry', source_version_id: 'version', start_offset: start, end_offset: start + excerpt.length, source_excerpt: excerpt, source_hash: createHash('sha256').update(excerpt).digest('hex') }] };
test('accepts a valid immutable provenance span', () => assert.equal(validateStoredProvenance(base, entries).valid, true));
test('fails closed on a malformed provenance span without throwing', async () => {
  const malformed = structuredClone(base);
  malformed.provenance_spans[0].end_offset += 1;
  assert.deepEqual(validateStoredProvenance(malformed, entries), { valid: false, reason: 'Provenance excerpt mismatch' });
  const audits = [];
  const db = { rpc: async (name, payload) => { audits.push({ name, payload }); return { data: null, error: null }; } };
  assert.deepEqual(await failClosedHighlights(db, [malformed], entries), []);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].name, 'record_provenance_failure');
});
test('fails closed on a provenance hash mismatch', () => {
  const malformed = structuredClone(base);
  malformed.provenance_spans[0].source_hash = '0'.repeat(64);
  assert.equal(validateStoredProvenance(malformed, entries).valid, false);
});
