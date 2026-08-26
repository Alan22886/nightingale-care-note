'use client';

import { useEffect, useState } from 'react';
import { validateSourceGrounding } from '../lib/domain/assertions';

type CaptureState = 'idle' | 'recording' | 'paused' | 'processing' | 'ready';
type Notice = (message: string) => void;

const medicationSource = 'Sarah: I have continued metformin 500 mg twice daily.';
const medicationAssertion = validateSourceGrounding({ kind: 'medication', claim: 'Metformin 500 mg twice daily', sourceText: medicationSource, startOffset: medicationSource.indexOf('metformin'), endOffset: medicationSource.length - 1 });
const dosageReview = validateSourceGrounding({ kind: 'dosage', claim: 'Medication dosage is reconciled', sourceText: 'One dosage source is audible; a second source is unavailable.', startOffset: 0, endOffset: 28, contradictory: true });

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function MicIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function useDemoCapture() {
  const [state, setState] = useState<CaptureState>('idle');
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);
  useEffect(() => {
    if (state !== 'processing') return;
    const timer = window.setTimeout(() => setState('ready'), 1300);
    return () => window.clearTimeout(timer);
  }, [state]);
  function reset() { setSeconds(0); setState('idle'); }
  return { state, seconds, setState, reset };
}

export function ClinicalVoiceCapture({ role, onNotice }: { role: 'clinician' | 'staff'; onNotice: Notice }) {
  const capture = useDemoCapture();
  const [language, setLanguage] = useState('English / Mixed');
  const [speakerSeparation, setSpeakerSeparation] = useState(true);
  const [noisyMode, setNoisyMode] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  if (capture.state === 'processing') return <div className="capture-processing" aria-live="polite"><span className="capture-spinner"/><h3>Preparing a structured draft…</h3><p>Separating speakers, checking source grounding, and applying PHI redaction before the sample LLM boundary.</p><small>Demo processing · no audio was recorded or transmitted</small></div>;
  if (capture.state === 'ready') return <div className="capture-results"><div className="capture-demo-label">Synthetic consult example · Demo draft</div><section className="transcript-preview"><header><div><span className="eyebrow">Speaker-labelled preview</span><h3>Sample transcript</h3></div><span>02:14 sample</span></header><p><b>Dr Marcus</b><span>“We reviewed your blood sugar and blood pressure today.”</span></p><p><b>Sarah</b><span>“I have continued metformin 500 mg twice daily.”</span></p><p className="uncertain-segment"><b>Sarah</b><span>“The kidney blood test is still [unclear].” <em>Review uncertain audio</em></span></p></section><section className="extracted-facts"><span className="eyebrow">Source-grounded assertions</span><h3>Key extracted facts</h3><ul><li><strong>Medication</strong> Metformin 500 mg twice daily <span>{medicationAssertion.releaseState==='grounded'?'Grounded':'Withheld'}</span></li><li><strong>Follow-up</strong> Kidney function blood test remains pending <span>Grounded</span></li><li className="needs-review"><strong>Dosage conflict check</strong> No second dosage source available <span>{dosageReview.releaseState==='needs_review'?'Needs review':'Withheld'}</span></li></ul><small>Ungrounded claims are abstained from rather than inserted as facts.</small></section><section className="draft-summary"><span className="eyebrow">Suggested clinical summary</span><h3>Review before saving</h3><p>Diabetes and blood pressure care reviewed. Sarah reports continuing metformin 500 mg twice daily. Kidney function laboratory follow-up remains pending.</p></section><section className="structured-draft"><div><span className="eyebrow">Suggested structured entry</span><h3>Consult follow-up draft</h3></div><dl><div><dt>Medication</dt><dd>Metformin 500 mg twice daily</dd></div><div><dt>Follow-up</dt><dd>Kidney function blood test pending</dd></div><div><dt>Release</dt><dd>Internal draft until reviewed</dd></div></dl></section><details className="source-segments"><summary>Preview source segments</summary><p><mark>“continued metformin 500 mg twice daily”</mark> → Medication assertion</p><p><mark>“kidney blood test is still…”</mark> → Follow-up assertion · uncertain audio review required</p></details>{reviewing&&<div className="review-gate" role="status"><strong>Review mode enabled</strong><span>Confirm every assertion against its highlighted source before saving.</span></div>}<div className="capture-actions"><button className="quiet-button" onClick={capture.reset}>Discard</button><button className="quiet-button" onClick={() => { setReviewing(true); onNotice('Draft opened for source review'); }}>Review before saving</button><button className="primary-button" onClick={() => onNotice(`${role === 'clinician' ? 'Clinical' : 'Staff'} demo draft saved for this session only`)}>Save as draft note</button></div></div>;
  return <div className="capture-ready"><div className={`record-orb state-${capture.state}`}><MicIcon/><span/></div><div className="capture-clock"><strong>{formatTime(capture.seconds)}</strong><span>{capture.state === 'idle' ? 'Ready for synthetic demo' : capture.state === 'paused' ? 'Paused' : 'Recording preview'}</span></div><p>This interface demonstrates how an ambient consultation could become a source-grounded draft. It does not access your microphone or send audio.</p>{capture.state === 'idle'&&<button className="primary-button capture-start" onClick={() => capture.setState('recording')}><MicIcon/> Start voice capture demo</button>}{capture.state === 'recording'&&<div className="record-controls"><button className="quiet-button" onClick={() => capture.setState('paused')}>Pause</button><button className="primary-button" onClick={() => capture.setState('processing')}>Stop &amp; prepare draft</button></div>}{capture.state === 'paused'&&<div className="record-controls"><button className="quiet-button" onClick={() => capture.setState('recording')}>Resume</button><button className="primary-button" onClick={() => capture.setState('processing')}>Stop &amp; prepare draft</button></div>}<div className="speaker-preview" aria-label="Speaker activity preview"><span><i/> Dr Marcus</span><span><i/> Sarah</span><small>Speaker separation enabled</small></div><details className="capture-options"><summary>Capture settings</summary><label><span>Speech language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English / Mixed</option><option>English</option><option>Mandarin / English</option><option>Malay / English</option></select></label><label><input type="checkbox" checked={speakerSeparation} onChange={(event) => setSpeakerSeparation(event.target.checked)}/> Speaker separation enabled</label><label><input type="checkbox" checked={noisyMode} onChange={(event) => setNoisyMode(event.target.checked)}/> Noisy environment mode</label></details><div className="capture-safety-notes"><span>PHI is redacted before sample LLM processing.</span><span>Outputs remain drafts until a care-team member reviews them.</span></div></div>;
}

export function PatientVoiceCapture({ onNotice }: { onNotice: Notice }) {
  const capture = useDemoCapture();
  const [complete, setComplete] = useState(false);
  if (complete) return <div className="patient-capture-complete"><span aria-hidden="true">✓</span><h3>Saved for this demo session</h3><p>No audio or summary was sent. A real patient release would require verified review and sharing controls.</p><button className="quiet-button" onClick={() => { setComplete(false); capture.reset(); }}>Start over</button></div>;
  if (capture.state === 'processing') return <div className="capture-processing patient-processing" aria-live="polite"><span className="capture-spinner"/><h3>Preparing your summary…</h3><p>Turning the synthetic consultation example into simple, patient-safe language.</p><small>Preview only · no audio was captured</small></div>;
  if (capture.state === 'ready') return <div className="patient-capture-summary"><span className="capture-demo-label">Demo draft · Prepared for your review</span><h3>What we understood from your visit</h3><ul><li>Your clinician reviewed your diabetes and blood pressure care.</li><li>Your kidney function blood test is still pending.</li><li>Your current record says metformin 500 mg twice daily.</li></ul><h3>What to do next</h3><ul><li>Complete your kidney function blood test.</li></ul><p className="patient-release-note">This summary is not part of your care record until it is reviewed and released through the appropriate care-team process.</p><div className="patient-capture-actions"><button className="quiet-button" onClick={() => { setComplete(true); onNotice('Demo summary saved for this session only'); }}>Save to my care</button><button className="primary-button" onClick={() => { setComplete(true); onNotice('Share preview complete — nothing was sent'); }}>Share with care team</button><button onClick={() => { setComplete(true); onNotice('Demo summary marked for later review'); }}>Review later</button></div></div>;
  return <div className="patient-capture-ready"><div className={`record-orb state-${capture.state}`}><MicIcon/><span/></div><span className="capture-demo-label">Synthetic consultation preview</span><h3>Capture a consultation</h3><p>Use this guided demo to see how a conversation or recap could become a summary for you to review.</p><small>No microphone is accessed and no audio leaves this page.</small>{capture.state === 'idle'?<button className="primary-button capture-start" onClick={() => capture.setState('recording')}><MicIcon/> Start capture demo</button>:<><div className="patient-recording"><strong>{formatTime(capture.seconds)}</strong><span>{capture.state === 'paused' ? 'Paused' : 'Recording preview'}</span></div><div className="record-controls"><button className="quiet-button" onClick={() => capture.setState(capture.state === 'paused' ? 'recording' : 'paused')}>{capture.state === 'paused' ? 'Resume' : 'Pause'}</button><button className="primary-button" onClick={() => capture.setState('processing')}>Finish capture</button></div></>}</div>;
}
