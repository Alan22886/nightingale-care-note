import { NextResponse } from 'next/server';
import { ApiError, getAuthContext } from '../../../lib/server/auth';

const STATUSES = new Set(['Open', 'In Progress', 'Done']);

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext();
    const body = (await request.json().catch(() => null)) as { id?: string; status?: string; ownerId?: string } | null;
    if (!body?.id || (body.status && !STATUSES.has(body.status))) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const update: { status?: string; owner_id?: string } = {};
    if (body.status) update.status = body.status;
    if (body.ownerId) update.owner_id = body.ownerId;
    const { data, error } = await context.supabase.from('tasks').update(update).eq('id', body.id).select('*, owner:profiles!tasks_owner_id_fkey(full_name, role)').single();
    if (error) throw new ApiError(error.code === '42501' ? 403 : 400, error.message);
    return NextResponse.json({ task: data });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

