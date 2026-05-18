import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAdminApiAccess } from '@/lib/api/admin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = requireAdminApiAccess(request);
  if (denied) return denied;

  // Questo endpoint mostra le variabili di ambiente configurate (SENZA i valori sensibili)
  const env = {
    MONGODB_URI: process.env.MONGODB_URI ? '***SET***' : 'NOT_SET',
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'NOT_SET',
    MONGODB_AUTO_MAINTENANCE: process.env.MONGODB_AUTO_MAINTENANCE || 'NOT_SET',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'NOT_SET',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'NOT_SET',
    NOTIFY_EMAIL: process.env.NOTIFY_EMAIL || 'NOT_SET',
    EMAIL_FROM: process.env.EMAIL_FROM || 'NOT_SET',
    EMAIL_HOST: process.env.EMAIL_HOST || 'NOT_SET',
    EMAIL_PORT: process.env.EMAIL_PORT || 'NOT_SET',
    EMAIL_USER: process.env.EMAIL_USER ? '***SET***' : 'NOT_SET',
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
  };

  return NextResponse.json({
    status: 'Environment variables check',
    environment: env,
    timestamp: new Date().toISOString(),
  });
}

