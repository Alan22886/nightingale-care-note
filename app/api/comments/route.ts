import { NextResponse } from 'next/server';
import { ApiError, getAuthContext } from '../../../lib/server/auth';

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    const body = (await request.json().catch(() => null)) as { entryId?: string; patientId?: string; body?: string; parentId?: string } | null;
    if (!body?.entryId || !body.patientId || !body.body?.trim()) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const { data, error } = await context.supabase.from('comments').insert({
      clinic_id: context.profile.clinicId,
      patient_id: body.patientId,
      entry_id: body.entryId,
      parent_id: body.parentId ?? null,
      author_id: context.profile.id,
      body: body.body.trim(),
      internal: true,
    }).select('*, author:profiles!comments_author_id_fkey(full_name, role)').single();
    if (error) throw new ApiError(error.code === '42501' ? 403 : 400, error.message);
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext();
    const body = (await request.json().catch(() => null)) as { id?: string; resolved?: boolean } | null;
    if (!body?.id || typeof body.resolved !== 'boolean') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const { data, error } = await context.supabase.from('comments').update({ resolved: body.resolved }).eq('id', body.id).select('*').single();
    if (error) throw new ApiError(error.code === '42501' ? 403 : 400, error.message);
    return NextResponse.json({ comment: data });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

