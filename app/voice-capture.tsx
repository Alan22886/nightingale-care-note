'use client';

import { useEffect, useMemo, useState } from 'react';

type CaptureState = 'idle' | 'recording' | 'paused' | 'processing' | 'ready';
type Notice = (message: string) => void;
type VoiceFixture = {
  patientShortName: string;
  clinicianLine: string;
  patientLines: [string, string];
  facts: Array<{ label: string; value: string }>;
  summary: string;
  followUp: string;
  sourceSegments: string[];
  patientBullets: string[];
};

const fixtures: Record<string, VoiceFixture> = {
  'Sarah Tan': {
    patientShortName: 'Sarah',
    clinicianLine: 'We reviewed your blood sugar and blood pressure today.',
    patientLines: ['I have continued metformin 500 mg twice daily.', 'The kidney blood test is still [unclear].'],
    facts: [{ label: 'Medication', value: 'Metformin 500 mg twice daily' }, { label: 'Follow-up', value: 'Kidney function blood test remains pending' }],
    summary: 'Diabetes and blood pressure care reviewed. Sarah reports continuing metformin 500 mg twice daily. Kidney function laboratory follow-up remains pending.',
    followUp: 'Complete the kidney function blood test.',
    sourceSegments: ['continued metformin 500 mg twice daily', 'kidney blood test is still…'],
    patientBullets: ['Your clinician reviewed your diabetes and blood pressure care.', 'Your kidney function blood test is still pending.', 'Your current record says metformin 500 mg twice daily.'],
  },
  'Daniel Koh': {
    patientShortName: 'Daniel',
    clinicianLine: 'Your migraine pattern has improved from six to three days a month.',
    patientLines: ['Sleep disruption still seems to be the clearest trigger.', 'I will keep using the trigger diary.'],
    facts: [{ label: 'Symptom pattern', value: 'Migraine frequency improved to three days monthly' }, { label: 'Trigger', value: 'Sleep disruption remains the most consistent trigger' }],
    summary: 'Migraine frequency has improved from six to three days monthly. Sleep disruption remains the most consistent trigger, with no new neurological warning symptoms reported.',
    followUp: 'Bring the completed migraine trigger diary.',
    sourceSegments: ['improved from six to three days a month', 'Sleep disruption still seems to be the clearest trigger'],
    patientBullets: ['Your migraine frequency has improved to around three days a month.', 'Sleep disruption remains your most consistent trigger.', 'No new neurological warning symptoms were reported.'],
  },
  'Farah Aziz': {
    patientShortName: 'Farah',
    clinicianLine: 'Home blood pressure readings are mostly within target.',
    patientLines: ['I recorded morning and evening readings for seven days.', 'The evening readings sometimes looked higher.'],
    facts: [{ label: 'Pattern', value: 'Home blood pressure readings mostly within target' }, { label: 'Monitoring', value: 'Seven-day home blood pressure log completed' }],
    summary: 'Home blood pressure readings are mostly within target. One elevated evening pattern needs confirmation, and the completed seven-day log is ready for review.',
    followUp: 'Review the seven-day home blood pressure log.',
    sourceSegments: ['Home blood pressure readings are mostly within target', 'morning and evening readings for seven days'],
    patientBullets: ['Most of your home blood pressure readings are within target.', 'Some evening readings may need a closer look.', 'Your seven-day home monitoring log is complete.'],
  },
  'Jason Lee': {
    patientShortName: 'Jason',
    clinicianLine: 'The night-time wheeze is now happening twice weekly.',
    patientLines: ['We reviewed my inhaler technique today.', 'I will use the spacer regularly.'],
    facts: [{ label: 'Symptom', value: 'Night-time wheeze occurring twice weekly' }, { label: 'Technique', value: 'Inhaler technique reviewed and spacer use reinforced' }],
    summary: 'Night-time wheeze has increased to twice weekly. Inhaler technique was reviewed and regular spacer use was reinforced.',
    followUp: 'Review the symptom diary after regular preventer use.',
    sourceSegments: ['night-time wheeze is now happening twice weekly', 'use the spacer regularly'],
    patientBullets: ['Your night-time wheeze is occurring about twice weekly.', 'Your inhaler technique was reviewed.', 'Regular spacer use was reinforced.'],
  },
  'Mei Nordin': {
    patientShortName: 'Mei',
    clinicianLine: 'Your LDL cholesterol remains above the agreed target.',
    patientLines: ['The muscle aches returned after restarting atorvastatin.', 'They are still mild and unchanged.'],
    facts: [{ label: 'Result', value: 'LDL cholesterol remains above target' }, { label: 'Tolerance', value: 'Mild muscle aches after restarting atorvastatin' }],
    summary: 'LDL cholesterol remains above the agreed target. Mei reports mild, unchanged muscle aches after restarting atorvastatin; review is planned before any dose adjustment.',
    followUp: 'Complete the medication tolerance review.',
    sourceSegments: ['LDL cholesterol remains above the agreed target', 'muscle aches returned after restarting atorvastatin'],
    patientBullets: ['Your LDL cholesterol remains above the agreed target.', 'You reported mild muscle aches after restarting atorvastatin.', 'A medication review is planned before any dose change.'],
  },
};

function fixtureFor(patientName: string): VoiceFixture {
  return fixtures[patientName] ?? {
    patientShortName: patientName.split(' ')[0],
    clinicianLine: 'We reviewed the current care plan today.',
    patientLines: ['I understand the current plan.', 'I will follow up with the care team.'],
    facts: [{ label: 'Review', value: 'Current care plan reviewed' }],
    summary: `Current care plan reviewed with ${patientName}.`,
    followUp: 'Follow up with the care team as planned.',
    sourceSegments: ['reviewed the current care plan'],
    patientBullets: ['Your current care plan was reviewed.', 'Follow up with your care team as planned.'],
  };
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function MicIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function useDemoCapture(autoComplete = true) {
  const [state, setState] = useState<CaptureState>('idle');
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);
  useEffect(() => {
    if (state !== 'processing' || !autoComplete) return;
    const timer = window.setTimeout(() => setState('ready'), 1300);
    return () => window.clearTimeout(timer);
  }, [autoComplete, state]);
  function reset() { setSeconds(0); setState('idle'); }
  return { state, seconds, setState, reset };
}

export function ClinicalVoiceCapture({ role, patientName, clinicianName, onNotice }: { role: 'clinician' | 'staff'; patientName: string; clinicianName: string; onNotice: Notice }) {
  const capture = useDemoCapture(false);
  const captureState = capture.state;
  const setCaptureState = capture.setState;
  const fixture = useMemo(() => fixtureFor(patientName), [patientName]);
  const [runtimeResult, setRuntimeResult] = useState<Record<string, unknown> | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [language, setLanguage] = useState('English / Mixed');
  const [speakerSeparation, setSpeakerSeparation] = useState(true);
  const [noisyMode, setNoisyMode] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    if (captureState !== 'processing') return;
    if (role !== 'clinician') {
      const timer = window.setTimeout(() => setCaptureState('ready'), 500);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    void fetch('/api/scribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientId: '20000000-0000-4000-8000-000000000007',
        rawText: [fixture.clinicianLine, ...fixture.patientLines].join('\n'),
      }),
      signal: controller.signal,
    }).then(async (response) => {
      const result = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(result.error ?? 'Runtime scribe processing failed'));
      setRuntimeResult(result);
    }).catch((reason) => {
      if (controller.signal.aborted) return;
      const message = reason instanceof Error ? reason.message : 'Runtime scribe processing failed';
      setRuntimeError(message);
      onNotice(message);
    }).finally(() => { if (!controller.signal.aborted) setCaptureState('ready'); });
    return () => controller.abort();
  }, [captureState, fixture, onNotice, role, setCaptureState]);
  const runtimeGrounded = (runtimeResult?.groundedAssertions as Array<Record<string, unknown>> | undefined) ?? [];
  const runtimeWithheld = (runtimeResult?.withheldAssertions as Array<Record<string, unknown>> | undefined) ?? [];
  const runtimeReview = (runtimeResult?.needsReviewAssertions as Array<Record<string, unknown>> | undefined) ?? [];
  if (capture.state === 'processing') return <div className="capture-processing" aria-live="polite"><span className="capture-spinner"/><h3>Preparing a structured draft…</h3><p>Separating speakers, checking source grounding, and applying PHI redaction before the sample LLM boundary.</p><small>Demo processing · no audio was recorded or transmitted</small></div>;
  if (capture.state === 'ready') return <div className="capture-results"><div className="capture-demo-label">Synthetic consult example · {role === 'clinician' ? 'Runtime safety pipeline' : 'Staff preview only'}</div><section className="transcript-preview"><header><div><span className="eyebrow">Speaker-labelled preview</span><h3>Sample transcript</h3></div><span>02:14 sample</span></header><p><b>{clinicianName}</b><span>“{fixture.clinicianLine}”</span></p><p><b>{fixture.patientShortName}</b><span>“{fixture.patientLines[0]}”</span></p><p className="uncertain-segment"><b>{fixture.patientShortName}</b><span>“{fixture.patientLines[1]}” <em>Review transcript quality before saving</em></span></p></section><section className="extracted-facts"><span className="eyebrow">Runtime safety result</span><h3>Grounded, withheld, and review assertions</h3><ul>{runtimeGrounded.map((fact) => <li key={String(fact.id)}><strong>{String(fact.kind)}</strong>{String(fact.claim)}<span>Grounded</span></li>)}{runtimeWithheld.map((fact) => <li className="needs-review" key={String(fact.id)}><strong>{String(fact.kind)}</strong>{String(fact.review_reason ?? fact.claim)}<span>Withheld</span></li>)}{runtimeReview.map((fact) => <li className="needs-review" key={String(fact.id)}><strong>{String(fact.kind)}</strong>{String(fact.claim)}<span>Needs review</span></li>)}{role !== 'clinician' && <li><strong>Access</strong>Staff preview does not invoke privileged clinical generation.<span>Not persisted</span></li>}{runtimeError && <li className="needs-review"><strong>Runtime</strong>{runtimeError}<span>Withheld</span></li>}</ul><small>The deterministic provider output passed through contextual redaction, grounding, conflict, risk-floor, provenance, and internal-draft persistence. Synthetic UI runs are stored only against hidden QA-0001.</small></section><section className="draft-summary"><span className="eyebrow">Suggested clinical summary</span><h3>Review before release</h3><p>{String(runtimeResult?.summary ?? fixture.summary)}</p></section><section className="structured-draft"><div><span className="eyebrow">Persisted draft state</span><h3>Consult follow-up draft</h3></div><dl><div><dt>Grounded</dt><dd>{runtimeGrounded.length}</dd></div><div><dt>Withheld / review</dt><dd>{runtimeWithheld.length + runtimeReview.length}</dd></div><div><dt>Release</dt><dd>{role === 'clinician' ? 'Internal QA draft' : 'Not persisted'}</dd></div></dl></section>{reviewing && <div className="review-gate" role="status"><strong>Review mode enabled</strong><span>Confirm every assertion against its highlighted source before any release decision.</span></div>}<div className="capture-actions"><button className="quiet-button" onClick={() => { setRuntimeResult(null); setRuntimeError(null); capture.reset(); }}>Discard view</button><button className="quiet-button" onClick={() => { setReviewing(true); onNotice('Draft opened for source review'); }}>Review source</button><button className="primary-button" disabled>{role === 'clinician' ? 'Internal QA draft created' : 'Staff preview only'}</button></div></div>;
  return <div className="capture-ready"><div className={`record-orb state-${capture.state}`}><MicIcon/><span/></div><div className="capture-clock"><strong>{formatTime(capture.seconds)}</strong><span>{capture.state === 'idle' ? 'Ready for synthetic demo' : capture.state === 'paused' ? 'Paused' : 'Recording preview'}</span></div><p>This interface demonstrates how an ambient consultation could become a source-grounded draft. It does not access your microphone or send audio.</p>{capture.state === 'idle' && <button className="primary-button capture-start" onClick={() => capture.setState('recording')}><MicIcon/> Start voice capture demo</button>}{capture.state === 'recording' && <div className="record-controls"><button className="quiet-button" onClick={() => capture.setState('paused')}>Pause</button><button className="primary-button" onClick={() => capture.setState('processing')}>Stop &amp; prepare draft</button></div>}{capture.state === 'paused' && <div className="record-controls"><button className="quiet-button" onClick={() => capture.setState('recording')}>Resume</button><button className="primary-button" onClick={() => capture.setState('processing')}>Stop &amp; prepare draft</button></div>}<div className="speaker-preview" aria-label="Speaker activity preview"><span><i/> {clinicianName}</span><span><i/> {patientName}</span><small>Speaker separation enabled</small></div><details className="capture-options"><summary>Capture settings</summary><label><span>Speech language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English / Mixed</option><option>English</option><option>Mandarin / English</option><option>Malay / English</option></select></label><label><input type="checkbox" checked={speakerSeparation} onChange={(event) => setSpeakerSeparation(event.target.checked)}/> Speaker separation enabled</label><label><input type="checkbox" checked={noisyMode} onChange={(event) => setNoisyMode(event.target.checked)}/> Noisy environment mode</label></details><div className="capture-safety-notes"><span>PHI is redacted before sample LLM processing.</span><span>Outputs remain drafts until a care-team member reviews them.</span></div></div>;
}

export function PatientVoiceCapture({ patientName, onNotice }: { patientName: string; onNotice: Notice }) {
  const capture = useDemoCapture();
  const fixture = useMemo(() => fixtureFor(patientName), [patientName]);
  const [complete, setComplete] = useState(false);
  if (complete) return <div className="patient-capture-complete"><span aria-hidden="true">✓</span><h3>Saved for this demo session</h3><p>No audio or summary was sent. A real patient release would require verified review and sharing controls.</p><button className="quiet-button" onClick={() => { setComplete(false); capture.reset(); }}>Start over</button></div>;
  if (capture.state === 'processing') return <div className="capture-processing patient-processing" aria-live="polite"><span className="capture-spinner"/><h3>Preparing your summary…</h3><p>Turning the synthetic consultation example into simple, patient-safe language.</p><small>Preview only · no audio was captured</small></div>;
  if (capture.state === 'ready') return <div className="patient-capture-summary"><span className="capture-demo-label">Demo draft · Prepared for {fixture.patientShortName}</span><h3>What we understood from your visit</h3><ul>{fixture.patientBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul><h3>What to do next</h3><ul><li>{fixture.followUp}</li></ul><p className="patient-release-note">This summary is not part of your care record until it is reviewed and released through the appropriate care-team process.</p><div className="patient-capture-actions"><button className="quiet-button" onClick={() => { setComplete(true); onNotice('Demo summary saved for this session only'); }}>Save to my care</button><button className="primary-button" onClick={() => { setComplete(true); onNotice('Share preview complete — nothing was sent'); }}>Share with care team</button><button onClick={() => { setComplete(true); onNotice('Demo summary marked for later review'); }}>Review later</button></div></div>;
  return <div className="patient-capture-ready"><div className={`record-orb state-${capture.state}`}><MicIcon/><span/></div><span className="capture-demo-label">Synthetic consultation preview · {patientName}</span><h3>Capture a consultation</h3><p>Use this guided demo to see how a conversation or recap could become a summary for you to review.</p><small>No microphone is accessed and no audio leaves this page.</small>{capture.state === 'idle' ? <button className="primary-button capture-start" onClick={() => capture.setState('recording')}><MicIcon/> Start capture demo</button> : <><div className="patient-recording"><strong>{formatTime(capture.seconds)}</strong><span>{capture.state === 'paused' ? 'Paused' : 'Recording preview'}</span></div><div className="record-controls"><button className="quiet-button" onClick={() => capture.setState(capture.state === 'paused' ? 'recording' : 'paused')}>{capture.state === 'paused' ? 'Resume' : 'Pause'}</button><button className="primary-button" onClick={() => capture.setState('processing')}>Finish capture</button></div></>}</div>;
}
