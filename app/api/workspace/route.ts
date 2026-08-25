import { NextResponse } from 'next/server';
import { ApiError, getAuthContext } from '../../../lib/server/auth';
import { getPatientWorkspace } from '../../../lib/server/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();
    const requestedPatientId = new URL(request.url).searchParams.get('patientId');
    const patientId = context.profile.role === 'patient' ? context.profile.patientId : requestedPatientId;
    if (!patientId) return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    return NextResponse.json(await getPatientWorkspace(context, patientId));
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

