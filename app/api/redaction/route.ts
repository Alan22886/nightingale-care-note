import { NextResponse } from 'next/server';
import { redactBeforeProvider } from '../../../lib/domain/redaction';
import { ApiError, getAuthContext } from '../../../lib/server/auth';

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (context.profile.role === 'patient') throw new ApiError(403, 'Patient access denied');
    const body = (await request.json().catch(() => null)) as { text?: string } | null;
    if (!body?.text) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const result = redactBeforeProvider(body.text);
    return NextResponse.json({ redacted: result.redacted, categories: result.categories, providerReceived: result.redacted });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
