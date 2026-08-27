import { NextResponse } from 'next/server';
import { runScribePipeline } from '../../../lib/ai/scribe-pipeline';
import { ApiError, getAuthContext } from '../../../lib/server/auth';

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    const body = (await request.json().catch(() => null)) as { patientId?: string; rawText?: string } | null;
    const rawText = body?.rawText?.trim();
    if (!body?.patientId || !rawText || rawText.length > 12_000) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    return NextResponse.json(await runScribePipeline(context, { patientId: body.patientId, rawText }), { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
    throw error;
  }
}
