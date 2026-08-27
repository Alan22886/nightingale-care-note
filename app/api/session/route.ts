import { NextResponse } from 'next/server';
import { ApiError, getAuthContext, publicIdentity, signInAsDemoRole, type DemoSessionRole } from '../../../lib/server/auth';

const ROLES = new Set<DemoSessionRole>(['patient', 'staff', 'clinician', 'admin', 'qa_patient']);

export async function GET() {
  try {
    const { profile } = await getAuthContext();
    return NextResponse.json({ identity: publicIdentity(profile) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { role?: DemoSessionRole } | null;
    if (!body?.role || !ROLES.has(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    const profile = await signInAsDemoRole(body.role);
    return NextResponse.json({ identity: publicIdentity(profile) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
