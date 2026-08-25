import { NextResponse } from 'next/server';
import type { FeedbackAction } from '../../../lib/domain/models';
import { ApiError, getAuthContext } from '../../../lib/server/auth';
import { listWeights, recordFeedback } from '../../../lib/server/repository';

const ACTIONS = new Set<FeedbackAction>(['pin', 'accept', 'source_open', 'dismiss']);

export async function GET() {
  try {
    const context = await getAuthContext();
    return NextResponse.json({ weights: await listWeights(context.supabase) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    const body = (await request.json().catch(() => null)) as { highlightId?: string; action?: FeedbackAction } | null;
    if (!body?.highlightId || !body.action || !ACTIONS.has(body.action)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const feedback = await recordFeedback(context.supabase, body.highlightId, body.action);
    return NextResponse.json({ feedback, weights: await listWeights(context.supabase) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

