'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Role } from '../../lib/domain/models';

type Patient = {
  id: string;
  external_id: string;
  full_name: string;
  date_of_birth: string;
  summary: string;
  conditions: string[];
  active_priorities: number;
  next_follow_up: { title: string; status: string } | null;
};

const roles: Array<{ role: Role; name: string; label: string }> = [
  { role: 'clinician', name: 'Dr Marcus Lim', label: 'Clinician' },
  { role: 'staff', name: 'Nurse Alice Wong', label: 'Staff' },
  { role: 'patient', name: 'Sarah Tan', label: 'Patient' },
  { role: 'admin', name: 'Clinic Admin', label: 'Admin' },
];

const portraitIndex: Record<string, number> = {
  'Sarah Tan': 0,
  'Jason Lee': 1,
  'Mei Nordin': 2,
  'Daniel Koh': 3,
  'Farah Aziz': 4,
};

function age(date: string) {
  return Math.max(0, 2026 - Number(date.slice(0, 4)));
}

export default function PatientsDirectory() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [role, setRole] = useState<Role>('clinician');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    let response = await fetch('/api/patients', { cache: 'no-store' });
    if (response.status === 401) {
      await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'clinician' }) });
      response = await fetch('/api/patients', { cache: 'no-store' });
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Patient directory unavailable');
    setPatients(data.patients);
    setRole(data.identity.role);
  }

  useEffect(() => {
    queueMicrotask(() => { void load().catch((reason) => setError(reason.message)); });
  }, []);

  async function switchRole(next: Role) {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: next }) });
      if (!response.ok) throw new Error('Unable to change viewing role');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change viewing role');
    } finally {
      setPending(false);
    }
  }

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return patients;
    return patients.filter((patient) => [patient.full_name, patient.external_id, patient.summary, ...patient.conditions].join(' ').toLowerCase().includes(normalized));
  }, [patients, query]);

  const identity = roles.find((item) => item.role === role) ?? roles[0];

  return <main className="directory-shell">
    <header className="topbar directory-topbar">
      <Link className="brand" href="/patients"><span className="brand-mark" aria-hidden="true">N</span><span>Nightingale</span></Link>
      <nav className="topnav" aria-label="Primary"><Link className="active" href="/patients">Patients</Link></nav>
      <label className={`role-switch ${pending ? 'is-pending' : ''}`}><span>{pending ? 'Changing view…' : 'Viewing as'}</span><strong>{identity.name} · {identity.label}</strong><select disabled={pending} value={role} onChange={(event) => void switchRole(event.target.value as Role)} aria-label="Change viewing role">{roles.map((item) => <option key={item.role} value={item.role}>{item.name} · {item.label}</option>)}</select></label>
    </header>
    <section className="directory-content">
      <div className="directory-heading"><div><span className="eyebrow">Harbour Family Clinic</span><h1>Patients</h1><p>Open a longitudinal Care Note or find a patient by name, ID, or condition.</p></div><label className="patient-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patients" aria-label="Search patients"/></label></div>
      {error && <p className="inline-error">{error}</p>}
      <div className="directory-grid">
        {visible.map((patient) => <Link className="patient-directory-card" href={`/patients/${patient.id}`} key={patient.id}>
          <span className="portrait portrait-lg" style={{ '--portrait-index': portraitIndex[patient.full_name] ?? 0 } as React.CSSProperties} role="img" aria-label={`${patient.full_name}, synthetic portrait`}/>
          <span className="directory-card-copy"><span className="directory-name-row"><strong>{patient.full_name}</strong><small>{patient.external_id}</small></span><span className="patient-demographic">{age(patient.date_of_birth)} years · {patient.summary}</span><span className="condition-list">{patient.conditions.map((condition) => <em key={condition}>{condition}</em>)}</span><span className="follow-up-line">{patient.next_follow_up ? `${patient.next_follow_up.status} · ${patient.next_follow_up.title}` : 'No open follow-up'}</span></span>
          <span className="priority-count"><b>{patient.active_priorities}</b><small>active {patient.active_priorities === 1 ? 'priority' : 'priorities'}</small></span>
        </Link>)}
      </div>
      {!visible.length && !error && <div className="empty-state"><strong>No matching patients</strong><span>Try a name, patient ID, or condition.</span></div>}
    </section>
  </main>;
}
