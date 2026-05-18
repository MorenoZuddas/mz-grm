import { NextRequest, NextResponse } from 'next/server';

import { contactSchema } from '@/lib/contact/schema';
import { sendContactNotification } from '@/lib/contact/email';
import { connectToDatabase } from '@/lib/db/connection';
import { ContactMessage } from '@/lib/db/models/ContactMessage';

const CONTACT_RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.CONTACT_RATE_LIMIT_WINDOW_MS || '', 10) || 10 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX = Number.parseInt(process.env.CONTACT_RATE_LIMIT_MAX || '', 10) || 5;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const contactRateLimitBuckets = new Map<string, RateLimitBucket>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function checkRateLimit(request: NextRequest): { limited: boolean; retryAfterSeconds: number } {
  const ip = getClientIp(request);
  const now = Date.now();
  const bucket = contactRateLimitBuckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    contactRateLimitBuckets.set(ip, { count: 1, resetAt: now + CONTACT_RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfterSeconds: Math.ceil(CONTACT_RATE_LIMIT_WINDOW_MS / 1000) };
  }

  bucket.count += 1;
  contactRateLimitBuckets.set(ip, bucket);

  if (bucket.count > CONTACT_RATE_LIMIT_MAX) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return {
    limited: false,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rateLimit = checkRateLimit(request);
    if (rateLimit.limited) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Troppe richieste. Riprova più tardi.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Dati non validi',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    let persistedMessageId: string | null = null;

    if (process.env.MONGODB_URI) {
      try {
        await connectToDatabase();
        const persistedMessage = await ContactMessage.create({
          name,
          email,
          subject,
          message,
          source: 'contact_form',
          status: 'received',
          user_agent: userAgent,
          created_at: new Date(),
          updated_at: new Date(),
        });
        persistedMessageId = persistedMessage._id.toString();
      } catch (dbError) {
        console.warn('Contact message not persisted to MongoDB:', dbError);
      }
    }

    const emailResult = await sendContactNotification({
      name,
      email,
      subject,
      message,
      userAgent,
    });

    if (emailResult.status !== 'sent') {
      console.warn('Contact email notification not sent', {
        status: emailResult.status,
        reason: 'reason' in emailResult ? emailResult.reason : undefined,
        messageId: persistedMessageId,
      });
    }

    if (persistedMessageId) {
      try {
        const update: Record<string, unknown> = { updated_at: new Date() };

        if (emailResult.status === 'sent') {
          update.status = 'email_sent';
          update.email_sent_at = new Date();
          update.email_error = undefined;
        } else if (emailResult.status === 'failed') {
          update.status = 'email_failed';
          update.email_error = emailResult.reason;
        }

        await ContactMessage.findByIdAndUpdate(persistedMessageId, update);
      } catch (updateError) {
        console.warn('Contact message not updated after email attempt:', updateError);
      }
    }

    return NextResponse.json({
      status: 'success',
      message:
        emailResult.status === 'sent'
          ? 'Richiesta ricevuta. Ti ricontatto appena possibile.'
          : 'Richiesta ricevuta. Ho salvato il messaggio e sto verificando la notifica email.',
      email_notification: emailResult.status,
      email_reason:
        emailResult.status === 'failed' || emailResult.status === 'missing-config' || emailResult.status === 'disabled'
          ? emailResult.reason
          : undefined,
    });
  } catch (error) {
    console.error('POST /api/contact error', error);

    return NextResponse.json(
      {
        status: 'error',
        message: 'Invio non riuscito. Riprova tra poco.',
      },
      { status: 500 }
    );
  }
}





