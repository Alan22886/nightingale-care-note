import { NextResponse } from 'next/server';
import { ApiError, getAuthContext } from '../../../lib/server/auth';

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource');

    if (resource === 'raw-ai') {
      const { data, error } = await context.supabase.from('ai_scribed_notes').select('care_entry_id').limit(1);
      if (error || !data?.length) throw new ApiError(403, 'Raw AI note access denied');
    } else if (resource === 'internal-comments') {
      const { data, error } = await context.supabase.from('comments').select('id').eq('internal', true).limit(1);
      if (error || !data?.length) throw new ApiError(403, 'Internal comment access denied');
    } else if (resource === 'patient') {
      const patientId = url.searchParams.get('patientId');
      if (!patientId) return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
      const { data, error } = await context.supabase.from('patients').select('id, clinic_id').eq('id', patientId).maybeSingle();
      if (error || !data) throw new ApiError(403, 'Clinic scope denied');
    }

    return NextResponse.json({ ok: true, resource, identity: context.profile });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

