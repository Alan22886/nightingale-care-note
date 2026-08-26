'use client';

import type { Role } from '../lib/domain/models';

export const roleIdentities: Array<{ role: Role; label: string; name: string }> = [
  { role: 'clinician', label: 'Clinician', name: 'Dr Marcus Lim' },
  { role: 'staff', label: 'Staff', name: 'Nurse Alice Wong' },
  { role: 'patient', label: 'Patient', name: 'Sarah Tan' },
  { role: 'admin', label: 'Admin', name: 'Clinic Admin' },
];

const accessByRole: Record<Role, { summary: string; permissions: string[] }> = {
  clinician: {
    summary: 'Direct clinical care within Harbour Family Clinic.',
    permissions: ['View clinic patients, internal notes, AI-assisted entries, evidence, and history', 'Manage current priorities and care-team collaboration', 'Edit clinician-authored treatment content as immutable versions'],
  },
  staff: {
    summary: 'Operational care coordination within Harbour Family Clinic.',
    permissions: ['View clinic patients and non-AI care entries', 'Create and resolve care-team comments', 'Update follow-up task status and assignment'],
  },
  patient: {
    summary: 'Personal access limited to Sarah Tan.',
    permissions: ['View only personal, patient-visible, non-AI care information', 'View patient-visible follow-up tasks', 'Internal comments, raw AI entries, other patients, and clinic controls remain hidden'],
  },
  admin: {
    summary: 'Read-only clinic oversight within Harbour Family Clinic.',
    permissions: ['View clinic patients, care entries, tasks, comments, priorities, and revision history', 'Review access and audit context', 'Clinical editing and care-team mutations remain unavailable'],
  },
};

export function IdentityControl({ role, pending, onRoleChange, onOpenAccess }: { role: Role; pending: boolean; onRoleChange: (role: Role) => void; onOpenAccess: () => void }) {
  const identity = roleIdentities.find((item) => item.role === role) ?? roleIdentities[0];
  return <details className={`identity-menu ${pending ? 'is-pending' : ''}`}>
    <summary><span>{pending ? 'Changing view…' : 'Viewing as'}</span><strong>{identity.name} · {identity.label}</strong></summary>
    <div className="identity-menu-panel">
      <span className="eyebrow">Harbour Family Clinic</span>
      <strong>{identity.name}</strong>
      <small>{identity.label} access</small>
      <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); onOpenAccess(); }}>View Identity &amp; Access</button>
      <label><span>Demo role switching</span><select disabled={pending} value={role} onChange={(event) => onRoleChange(event.target.value as Role)} aria-label="Change viewing role">{roleIdentities.map((item) => <option key={item.role} value={item.role}>{item.name} · {item.label}</option>)}</select></label>
    </div>
  </details>;
}

export function IdentityAccessPanel({ activeRole }: { activeRole: Role }) {
  return <div className="access-panel">
    <p>Permissions are enforced by role, patient relationship, and clinic scope. The selector changes the signed-in demo identity so each view uses its real access rules.</p>
    <div className="access-role-list">{roleIdentities.map((identity) => {
      const access = accessByRole[identity.role];
      return <article className={identity.role === activeRole ? 'current' : ''} key={identity.role}>
        <header><span className="access-glyph" aria-hidden="true">{identity.role === 'clinician' ? 'C' : identity.role === 'staff' ? 'S' : identity.role === 'patient' ? 'P' : 'A'}</span><div><strong>{identity.label}</strong><small>{access.summary}</small></div>{identity.role === activeRole && <em>Current view</em>}</header>
        <ul>{access.permissions.map((permission) => <li key={permission}>{permission}</li>)}</ul>
      </article>;
    })}</div>
    <small className="scope-note">All staff, clinician, and admin access shown here is restricted to Harbour Family Clinic. Cross-clinic records are denied.</small>
  </div>;
}

export function SearchIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

const patientOrder = ['Sarah Tan', 'Daniel Koh', 'Farah Aziz', 'Jason Lee', 'Mei Nordin'];
export function orderPatients<T extends { full_name: string }>(patients: T[]) {
  return [...patients].sort((a, b) => {
    const ai = patientOrder.indexOf(a.full_name);
    const bi = patientOrder.indexOf(b.full_name);
    return (ai < 0 ? patientOrder.length : ai) - (bi < 0 ? patientOrder.length : bi) || a.full_name.localeCompare(b.full_name);
  });
}
