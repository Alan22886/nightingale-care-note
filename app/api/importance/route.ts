import { NextResponse } from 'next/server';
import type { FeedbackAction, HighlightStatus } from '../../../lib/domain/models';
import { ApiError, getAuthContext } from '../../../lib/server/auth';
import { listWeights, recordFeedback, restoreHighlightState } from '../../../lib/server/repository';

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
    const body = (await request.json().catch(() => null)) as { highlightId?: string; action?: FeedbackAction | 'restore'; status?: HighlightStatus; pinned?: boolean } | null;
    if (body?.action === 'restore') {
      if (!body.highlightId || !body.status || !['suggested', 'accepted', 'dismissed'].includes(body.status) || typeof body.pinned !== 'boolean') {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }
      const feedback = await restoreHighlightState(context.supabase, body.highlightId, body.status, body.pinned);
      return NextResponse.json({ feedback, weights: await listWeights(context.supabase) });
    }
    if (!body?.highlightId || !body.action || !ACTIONS.has(body.action)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const feedback = await recordFeedback(context.supabase, body.highlightId, body.action);
    return NextResponse.json({ feedback, weights: await listWeights(context.supabase) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
