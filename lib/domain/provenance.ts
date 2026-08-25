import type { CareEntry, Highlight } from './models';
export function resolveProvenance(highlight: Highlight, entries: CareEntry[]) {
  const entry = entries.find((item) => item.id === highlight.sourceEntryId); if (!entry) throw new Error('Provenance entry missing');
  const version = entry.versions.find((item) => item.id === highlight.sourceVersionId); if (!version) throw new Error('Provenance version missing');
  const span = version.content.slice(highlight.startOffset, highlight.endOffset);
  if (span !== highlight.sourceExcerpt) throw new Error('Provenance span integrity failure');
  return { entry, version, span };
}
