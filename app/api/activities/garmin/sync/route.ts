import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/api/admin';
import { syncGarminFromBridge, type GarminOneShotCredentials } from '@/lib/garmin/sync-bridge';

function parseMode(value: unknown): 'latest' | 'all' {
  return value === 'all' ? 'all' : 'latest';
}

function parseCredentials(value: unknown): GarminOneShotCredentials | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as { username?: unknown; password?: unknown };
  const username = typeof candidate.username === 'string' ? candidate.username.trim() : '';
  const password = typeof candidate.password === 'string' ? candidate.password.trim() : '';

  if (!username && !password) {
    return undefined;
  }

  if (!username || !password) {
    throw new Error('Credenziali Garmin incomplete: username e password sono entrambi obbligatori');
  }

  return { username, password };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const denied = requireAdminApiAccess(request);
    if (denied) return denied;

    const body = (await request.json().catch(() => ({}))) as {
      mode?: unknown;
      credentials?: unknown;
    };
    const mode = parseMode(body?.mode);
    const credentials = parseCredentials(body?.credentials);
    const result = await syncGarminFromBridge(mode, credentials);

    return NextResponse.json({
      status: 'success',
      message: `Sync Garmin completata (${mode})`,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Errore durante la sync Garmin',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
