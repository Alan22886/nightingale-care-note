import assert from 'node:assert/strict';
import test from 'node:test';
import { detectTypedConflict } from '../../lib/domain/conflicts.ts';

const assertion = (id, kind, claim, authorRole = 'clinician') => ({ id, kind, claim, authorRole });
test('detects allergy polarity conflict', () => assert.equal(detectTypedConflict(assertion('a','allergy','No penicillin allergy'), assertion('b','allergy','Penicillin allergy documented'))?.scope, 'allergy'));
test('detects medication active versus discontinued conflict', () => assert.equal(detectTypedConflict(assertion('a','medication','Metformin active'), assertion('b','medication','Metformin discontinued'))?.scope, 'medication'));
test('detects medication dosage conflict', () => assert.equal(detectTypedConflict(assertion('a','dosage','Metformin 500 mg twice daily'), assertion('b','dosage','Metformin 1000 mg twice daily'))?.scope, 'dosage'));
test('does not flag compatible duplicate assertions', () => assert.equal(detectTypedConflict(assertion('a','dosage','Metformin 500 mg BID'), assertion('b','dosage','Metformin 500 mg twice daily')), null));
test('does not flag newer identical information', () => assert.equal(detectTypedConflict(assertion('a','medication','Metformin active'), assertion('b','medication','Metformin active')), null));
test('labels human-human conflicts', () => assert.equal(detectTypedConflict(assertion('a','dosage','Metformin 500 mg BID','clinician'), assertion('b','dosage','Metformin 1000 mg BID','staff'))?.participants, 'human-human'));
test('labels AI-human conflicts', () => assert.equal(detectTypedConflict(assertion('a','dosage','Metformin 500 mg BID','system'), assertion('b','dosage','Metformin 1000 mg BID','clinician'))?.participants, 'ai-human'));
