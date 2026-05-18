import nodemailer from 'nodemailer';
import { requireAdminApiAccess } from '@/lib/api/admin';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

function parsePort(): number {
  const raw = Number.parseInt(process.env.EMAIL_PORT || '587', 10);
  return Number.isNaN(raw) ? 587 : raw;
}

function missingFields(): string[] {
  const fields: string[] = [];
  if (!process.env.EMAIL_HOST?.trim()) fields.push('EMAIL_HOST');
  if (!process.env.EMAIL_PORT?.trim()) fields.push('EMAIL_PORT');
  if (!process.env.EMAIL_USER?.trim()) fields.push('EMAIL_USER');
  if (!process.env.EMAIL_PASSWORD?.trim()) fields.push('EMAIL_PASSWORD');
  if (!process.env.ADMIN_EMAIL?.trim()) fields.push('ADMIN_EMAIL');
  return fields;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = requireAdminApiAccess(request);
  if (denied) return denied;

  if (process.env.NOTIFY_EMAIL === 'false') {
    return NextResponse.json({
      status: 'disabled',
      reason: 'NOTIFY_EMAIL=false',
    });
  }

  const missing = missingFields();
  if (missing.length > 0) {
    return NextResponse.json({
      status: 'missing-config',
      missing,
    });
  }

  const port = parsePort();
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    await transporter.verify();
    return NextResponse.json({
      status: 'ok',
      host: process.env.EMAIL_HOST,
      port,
      user: process.env.EMAIL_USER,
    });
  } catch (error) {
    const err = error as Error & { code?: string; responseCode?: number; response?: string };
    return NextResponse.json(
      {
        status: 'failed',
        message: err.message,
        code: err.code || null,
        responseCode: err.responseCode || null,
        response: err.response || null,
      },
      { status: 500 }
    );
  }
}

