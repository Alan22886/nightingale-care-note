import { NextResponse } from 'next/server';
import { ApiError, getAuthContext } from '../../../../lib/server/auth';
import { editEntry, getEntry } from '../../../../lib/server/repository';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getAuthContext();
    const { id } = await params;
    return NextResponse.json({ entry: await getEntry(context.supabase, id, context.profile.role) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getAuthContext();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { expectedVersion?: number; content?: string; title?: string; revertFrom?: number } | null;
    if (!body || typeof body.expectedVersion !== 'number' || (!body.revertFrom && !body.content?.trim())) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const version = await editEntry(context.supabase, id, {
      expectedVersion: body.expectedVersion,
      content: body.content,
      title: body.title,
      revertFrom: body.revertFrom,
    });
    return NextResponse.json({ version, entry: await getEntry(context.supabase, id, context.profile.role) });
  } catch (error) {
    if (error instanceof ApiError) {
      let conflict: { current_version?: number; attempted_version?: number } = {};
      if (error.status === 409 && typeof error.details === 'string') {
        try { conflict = JSON.parse(error.details); } catch { /* PostgreSQL details are best-effort metadata. */ }
      }
      return NextResponse.json({
        error: error.message,
        details: error.details,
        currentVersion: conflict.current_version,
        attemptedVersion: conflict.attempted_version,
      }, { status: error.status });
    }
    throw error;
  }
}
