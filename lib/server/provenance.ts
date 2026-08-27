import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function rows(value: unknown) { return Array.isArray(value) ? value as Row[] : []; }

export function validateStoredProvenance(highlight: Row, entries: Row[]) {
  const spans = rows(highlight.provenance_spans);
  if (!spans.length) return { valid: false, reason: 'Provenance span missing' };
  for (const span of spans) {
    const entry = entries.find((item) => item.id === span.source_entry_id);
    if (!entry) return { valid: false, reason: 'Provenance source entry missing' };
    const version = rows(entry.entry_versions).find((item) => item.id === span.source_version_id);
    if (!version || typeof version.content !== 'string') return { valid: false, reason: 'Provenance source version missing' };
    const start = Number(span.start_offset);
    const end = Number(span.end_offset);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > version.content.length) {
      return { valid: false, reason: 'Provenance span bounds invalid' };
    }
    const excerpt = version.content.slice(start, end);
    if (excerpt !== span.source_excerpt) return { valid: false, reason: 'Provenance excerpt mismatch' };
    if (sha256(excerpt) !== span.source_hash) return { valid: false, reason: 'Provenance hash mismatch' };
  }
  return { valid: true };
}

export async function failClosedHighlights(db: SupabaseClient, highlights: Row[], entries: Row[]) {
  const valid: Row[] = [];
  for (const highlight of highlights) {
    const result = validateStoredProvenance(highlight, entries);
    if (result.valid) {
      valid.push(highlight);
      continue;
    }
    await db.rpc('record_provenance_failure', {
      p_highlight_id: String(highlight.id),
      p_reason: result.reason ?? 'Unknown provenance validation failure',
    }).then(() => undefined, () => undefined);
  }
  return valid;
}
