import { NextResponse } from 'next/server';
import { ApiError, getAuthContext } from '../../../lib/server/auth';
import { getPatientsDirectory } from '../../../lib/server/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = await getAuthContext();
    return NextResponse.json({ identity: context.profile, patients: await getPatientsDirectory(context) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
