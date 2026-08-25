import { NextResponse } from 'next/server';
import { ApiError, getAuthContext } from '../../../lib/server/auth';
import { listHighlights } from '../../../lib/server/repository';

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();
    const patientId = new URL(request.url).searchParams.get('patientId') ?? undefined;
    return NextResponse.json({ highlights: await listHighlights(context.supabase, patientId) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

