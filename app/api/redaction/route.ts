import { NextResponse } from 'next/server';
import { redactBeforeProvider } from '../../../lib/domain/redaction';
import { ApiError, getAuthContext } from '../../../lib/server/auth';

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (context.profile.role === 'patient') throw new ApiError(403, 'Patient access denied');
    const body = (await request.json().catch(() => null)) as { text?: string } | null;
    if (!body?.text) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const [profiles, patients] = await Promise.all([
      context.supabase.from('profiles').select('full_name').eq('clinic_id', context.profile.clinicId),
      context.supabase.from('patients').select('full_name').eq('clinic_id', context.profile.clinicId),
    ]);
    if (profiles.error || patients.error) throw new ApiError(500, 'Redaction context unavailable');
    const knownNames = [context.profile.name, ...(profiles.data ?? []).map((row) => row.full_name), ...(patients.data ?? []).map((row) => row.full_name)];
    const result = redactBeforeProvider(body.text, { knownNames });
    return NextResponse.json({ redacted: result.redacted, categories: result.categories, providerReceived: result.redacted });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
