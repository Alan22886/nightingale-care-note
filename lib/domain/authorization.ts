import type { CareEntry, DemoIdentity, Role } from './models';
export class AccessDenied extends Error { status = 403; }
export function assertClinic(identity: DemoIdentity, patientClinicId: string) {
  if (identity.clinicId !== patientClinicId) throw new AccessDenied('Clinic scope denied');
}
export function canReadEntry(role: Role, entry: CareEntry) {
  if (role !== 'patient') return true;
  return entry.visibility === 'patient' && !entry.ai;
}
export function canEditEntry(identity: DemoIdentity, entry: CareEntry) {
  if (identity.role === 'admin') return true;
  if (identity.role === 'clinician') return entry.authorRole === 'clinician';
  if (identity.role === 'staff') return entry.authorRole === 'staff';
  return false;
}
export function assertCanEdit(identity: DemoIdentity, entry: CareEntry) {
  if (!canEditEntry(identity, entry)) throw new AccessDenied(`${identity.role} cannot overwrite ${entry.authorRole}-authored content`);
}
export function canReadInternalComments(role: Role) { return role !== 'patient'; }
