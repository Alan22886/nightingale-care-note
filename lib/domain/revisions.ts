import type { AuditEvent, CareEntry, EntryVersion } from './models';
export class VersionConflict extends Error { status = 409; constructor(public currentVersion: number, public attemptedVersion: number) { super('Version conflict'); } }
export function editEntry(entry: CareEntry, expectedVersion: number, content: string, actor: string, now = new Date().toISOString()) {
  const current = entry.versions.at(-1)!;
  if (current.version !== expectedVersion) throw new VersionConflict(current.version, expectedVersion);
  const next: EntryVersion = { id: `${entry.id}-v${current.version + 1}`, version: current.version + 1, content, actor, createdAt: now };
  const updated = { ...entry, content, versions: [...entry.versions, next] };
  return { entry: updated, audit: audit(entry.id, actor, 'ENTRY_UPDATED', current.version, next.version, now) };
}
export function revertEntry(entry: CareEntry, sourceVersion: number, actor: string, now = new Date().toISOString()) {
  const source = entry.versions.find((v) => v.version === sourceVersion); if (!source) throw new Error('Source version not found');
  const current = entry.versions.at(-1)!; const next: EntryVersion = { id: `${entry.id}-v${current.version + 1}`, version: current.version + 1, content: source.content, actor, createdAt: now, revertedFrom: sourceVersion };
  return { entry: { ...entry, content: source.content, versions: [...entry.versions, next] }, audit: audit(entry.id, actor, 'ENTRY_REVERTED', current.version, next.version, now) };
}
function audit(entityId: string, actor: string, action: string, fromVersion: number, toVersion: number, at: string): AuditEvent {
  return { id: `audit-${entityId}-${toVersion}`, actor, action, entityType: 'care_entry', entityId, at, fromVersion, toVersion };
}
