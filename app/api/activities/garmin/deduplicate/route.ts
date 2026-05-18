import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/api/admin';

interface DeduplicateBody {
  apply?: boolean;
}

interface GarminDoc {
  _id: unknown;
  source?: string;
  source_id?: string;
  fingerprint?: string;
  activityId?: number;
  name?: string;
  type?: string;
  date?: Date;
  distance?: number;
  duration?: number;
  beginTimestamp?: number;
  startTimeLocal?: number;
  startTimeGmt?: number;
  activityType?: string;
  created_at?: Date;
  updated_at?: Date;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function safeDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function toDedupKey(doc: GarminDoc): string {
  const sourceId =
    typeof doc.source_id === 'string' && doc.source_id.length > 0 && !doc.source_id.startsWith('garmin_')
      ? doc.source_id
      : null;
  const activityId = isFiniteNumber(doc.activityId) ? String(doc.activityId) : null;
  const stableExternalId = sourceId ?? activityId;

  if (stableExternalId) {
    return `sid:${stableExternalId}`;
  }

  if (typeof doc.fingerprint === 'string' && doc.fingerprint.length > 0) {
    return `fp:${doc.fingerprint}`;
  }

  const rawTs = isFiniteNumber(doc.startTimeLocal)
    ? doc.startTimeLocal
    : isFiniteNumber(doc.startTimeGmt)
      ? doc.startTimeGmt
      : isFiniteNumber(doc.beginTimestamp)
        ? doc.beginTimestamp
        : undefined;

  const dateIso = safeDate(doc.date)?.toISOString() ?? (rawTs ? new Date(rawTs).toISOString() : '');
  const type =
    typeof doc.type === 'string'
      ? doc.type
      : typeof doc.activityType === 'string'
        ? doc.activityType.toLowerCase()
        : '';
  const distance = isFiniteNumber(doc.distance) ? Math.round(doc.distance) : 0;
  const duration = isFiniteNumber(doc.duration) ? Math.round(doc.duration) : 0;
  return `cmp:${dateIso}_${type}_${distance}_${duration}`;
}

function getSortTs(doc: GarminDoc): number {
  return (
    safeDate(doc.updated_at)?.getTime() ??
    safeDate(doc.created_at)?.getTime() ??
    safeDate(doc.date)?.getTime() ??
    0
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const denied = requireAdminApiAccess(request);
    if (denied) return denied;

    await connectToDatabase();

    const body = (await request.json().catch(() => ({}))) as DeduplicateBody;
    const apply = Boolean(body.apply);

    const docs = (await Activity.find({
      $or: [
        { source: 'garmin' },
        { activityId: { $exists: true } },
        { source_id: { $exists: true } },
        { fingerprint: { $exists: true } },
        { activityType: { $exists: true } },
        { beginTimestamp: { $exists: true } },
        { startTimeLocal: { $exists: true } },
        { startTimeGmt: { $exists: true } },
      ],
    }).lean()) as GarminDoc[];
    const groups = new Map<string, GarminDoc[]>();

    for (const doc of docs) {
      const key = toDedupKey(doc);
      const list = groups.get(key) ?? [];
      list.push(doc);
      groups.set(key, list);
    }

    const duplicates: Array<{
      key: string;
      keep: string;
      remove: string[];
      count: number;
      sample_name?: string;
    }> = [];

    const idsToDelete: string[] = [];

    for (const [key, list] of groups.entries()) {
      if (list.length <= 1) continue;

      const sorted = [...list].sort((a, b) => getSortTs(b) - getSortTs(a));
      const keep = String(sorted[0]._id);
      const remove = sorted.slice(1).map((doc) => String(doc._id));

      idsToDelete.push(...remove);
      duplicates.push({
        key,
        keep,
        remove,
        count: list.length,
        sample_name: typeof sorted[0].name === 'string' ? sorted[0].name : undefined,
      });
    }

    let deletedCount = 0;
    if (apply && idsToDelete.length > 0) {
      const result = await Activity.deleteMany({ _id: { $in: idsToDelete } });
      deletedCount = result.deletedCount ?? 0;
    }

    return NextResponse.json({
      status: 'success',
      mode: apply ? 'apply' : 'dry-run',
      scanned: docs.length,
      duplicate_groups: duplicates.length,
      duplicates_to_remove: idsToDelete.length,
      deleted: deletedCount,
      preview: duplicates.slice(0, 20),
      hint: apply
        ? 'Deduplicazione applicata. Ricarica la pagina demo.'
        : 'Dry-run completato. Esegui POST con {"apply": true} per eliminare i duplicati.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Errore durante deduplicazione',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
