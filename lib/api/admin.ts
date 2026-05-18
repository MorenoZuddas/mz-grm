import { NextRequest, NextResponse } from 'next/server';

const ADMIN_SECRET_ENV_KEYS = ['API_ADMIN_SECRET', 'MIGRATION_API_SECRET'] as const;
const ADMIN_SECRET_HEADER_KEYS = ['x-api-secret', 'x-migration-secret'] as const;

function readConfiguredSecret(): string | null {
  for (const key of ADMIN_SECRET_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function readProvidedSecret(request: NextRequest): string | null {
  for (const key of ADMIN_SECRET_HEADER_KEYS) {
    const value = request.headers.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

export function requireAdminApiAccess(request: NextRequest): NextResponse | null {
  const configuredSecret = readConfiguredSecret();
  if (!configuredSecret) {
    return null;
  }

  const providedSecret = readProvidedSecret(request);
  if (providedSecret === configuredSecret) {
    return null;
  }

  return NextResponse.json(
    {
      status: 'error',
      message: 'Non autorizzato. Imposta l\'header x-api-secret corretto.',
    },
    { status: 401 }
  );
}

