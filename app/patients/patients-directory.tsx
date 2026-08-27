'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { Role } from '../../lib/domain/models';
import { IdentityAccessPanel, IdentityControl, orderPatients, SearchIcon } from '../identity-access';

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

const portraitIndex: Record<string, number> = {
  'Sarah Tan': 0,
  'Jason Lee': 1,
  'Mei Nordin': 2,
  'Daniel Koh': 3,
  'Farah Aziz': 4,
};

const portraitPosition: Record<string, string> = {
  'Sarah Tan': '36%',
  'Jason Lee': '34%',
  'Mei Nordin': '35%',
  'Daniel Koh': '34%',
  'Farah Aziz': '36%',
};

function age(date: string) {
  return Math.max(0, 2026 - Number(date.slice(0, 4)));
}

export default function PatientsDirectory() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [role, setRole] = useState<Role>('clinician');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessOpen, setAccessOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);

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
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => { void load().catch((reason) => setError(reason.message)).finally(() => setLoading(false)); });
  }, []);

  async function switchRole(next: Role) {
    setIdentityOpen(false);
    setAccessOpen(false);
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
    const ordered = orderPatients(patients);
    if (!normalized) return ordered;
    return ordered.filter((patient) => [patient.full_name, patient.external_id, patient.summary, ...patient.conditions].join(' ').toLowerCase().includes(normalized));
  }, [patients, query]);

  return <main className="directory-shell">
    <header className="topbar directory-topbar">
      <Link className="brand" href="/patients"><Image className="brand-mark" src="/brand/nightingale-mark.png" width={30} height={30} alt="" priority/><span>Nightingale</span></Link>
      <nav className="topnav progressive-nav" aria-label="Primary"><span className="current" aria-current="page">Patients</span></nav>
      <IdentityControl role={role} pending={pending} open={identityOpen} onOpenChange={setIdentityOpen} onRoleChange={(next) => void switchRole(next)} onOpenAccess={() => { setIdentityOpen(false); setAccessOpen(true); }}/>
    </header>
    <section className="directory-content">
      <div className="directory-heading"><div><span className="eyebrow">Harbour Family Clinic</span><h1>Patients</h1><p>Open a longitudinal Care Note or find a patient by name, ID, or condition.</p></div><label className="patient-search"><span><SearchIcon/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patients…" aria-label="Search patients"/></label></div>
      {error && <p className="inline-error">{error}</p>}
      <div className={`directory-grid ${pending ? 'is-pending' : ''}`} aria-busy={loading || pending}>
        {loading && Array.from({ length: 5 }, (_, index) => <div className="patient-directory-card directory-skeleton" key={index} aria-hidden="true"><span className="skeleton skeleton-avatar"/><span><span className="skeleton skeleton-title"/><span className="skeleton skeleton-line"/><span className="skeleton skeleton-line short"/></span></div>)}
        {visible.map((patient) => <Link className="patient-directory-card" href={`/patients/${patient.id}`} key={patient.id}>
          <span className="portrait portrait-lg" style={{ '--portrait-index': portraitIndex[patient.full_name] ?? 0, '--portrait-y': portraitPosition[patient.full_name] ?? '35%' } as React.CSSProperties} role="img" aria-label={`${patient.full_name}, synthetic portrait`}/>
          <span className="directory-card-copy"><span className="directory-name-row"><strong>{patient.full_name}</strong><small>{patient.external_id}</small></span><span className="patient-demographic">{age(patient.date_of_birth)} years · {patient.summary}</span><span className="condition-list">{patient.conditions.map((condition) => <em key={condition}>{condition}</em>)}</span><span className="follow-up-line">{patient.next_follow_up ? `${patient.next_follow_up.status} · ${patient.next_follow_up.title}` : 'No open follow-up'}</span></span>
          <span className="priority-count"><b>{patient.active_priorities}</b><small>active {patient.active_priorities === 1 ? 'priority' : 'priorities'}</small></span>
        </Link>)}
      </div>
      {!loading && !visible.length && !error && <div className="empty-state"><strong>No matching patients</strong><span>Try a name, patient ID, or condition.</span></div>}
    </section>
    {accessOpen && <div className="drawer-backdrop" onClick={() => setAccessOpen(false)}><aside className="drawer" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true"><header><div><span className="eyebrow">Role-based permissions</span><h2>Identity &amp; access</h2></div><button onClick={() => setAccessOpen(false)} aria-label="Close">×</button></header><IdentityAccessPanel activeRole={role}/></aside></div>}
  </main>;
}
