import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { parseGarminJSON, GarminActivityJSON } from '@/lib/garmin/parser';
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { requireAdminApiAccess } from '@/lib/api/admin';

interface NormalizePreview {
  id: string;
  before: {
    name?: string;
    type?: string;
    date?: Date;
    distance?: number;
    duration?: number;
    calories?: number;
    source?: string;
  };
  after: {
    name: string;
    type: string;
    date: Date;
    distance: number;
    duration: number;
    calories?: number;
    source: 'garmin';
  };
}

interface NormalizeBody {
  apply?: boolean;
  limit?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  // Supporta documenti importati con shape BSON estesa (es. { $numberLong: "123" })
  if (isObject(value) && typeof value.$numberLong === 'string') {
    const parsed = Number(value.$numberLong);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function parseDateLike(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return undefined;
}

function toGarminCandidate(doc: Record<string, unknown>): GarminActivityJSON | null {
  const hasGarminSignals =
    toFiniteNumber(doc.activityId) !== undefined ||
    toFiniteNumber(doc.beginTimestamp) !== undefined ||
    toFiniteNumber(doc.startTimeLocal) !== undefined ||
    toFiniteNumber(doc.startTimeGmt) !== undefined ||
    typeof doc.activityType === 'string' ||
    toFiniteNumber(doc.duration) !== undefined ||
    toFiniteNumber(doc.distance) !== undefined;

  if (!hasGarminSignals) {
    return null;
  }

  return {
    activityId: toFiniteNumber(doc.activityId) ?? (typeof doc.activityId === 'string' ? doc.activityId : undefined),
    name: typeof doc.name === 'string' ? doc.name : undefined,
    activityName: typeof doc.activityName === 'string' ? doc.activityName : undefined,
    activityType: typeof doc.activityType === 'string' ? doc.activityType : undefined,
    sportType: typeof doc.sportType === 'string' ? doc.sportType : undefined,
    startTime: typeof doc.startTime === 'string' ? doc.startTime : undefined,
    startTimeLocal: toFiniteNumber(doc.startTimeLocal),
    startTimeGmt: toFiniteNumber(doc.startTimeGmt),
    beginTimestamp: toFiniteNumber(doc.beginTimestamp),
    totalDistance: toFiniteNumber(doc.totalDistance),
    distance: toFiniteNumber(doc.distance),
    totalTimeInSeconds: toFiniteNumber(doc.totalTimeInSeconds),
    duration: toFiniteNumber(doc.duration),
    movingTimeInSeconds: toFiniteNumber(doc.movingTimeInSeconds),
    movingDuration: toFiniteNumber(doc.movingDuration),
    averageSpeed: toFiniteNumber(doc.averageSpeed),
    avgSpeed: toFiniteNumber(doc.avgSpeed),
    maxSpeed: toFiniteNumber(doc.maxSpeed),
    elevationGain: toFiniteNumber(doc.elevationGain),
    elevationLoss: toFiniteNumber(doc.elevationLoss),
    calories: toFiniteNumber(doc.calories),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const denied = requireAdminApiAccess(request);
    if (denied) return denied;

    await connectToDatabase();

    const body: NormalizeBody = (await request.json().catch(() => ({}))) as NormalizeBody;
    const apply = Boolean(body.apply);
    const limit = Math.min(Math.max(body.limit ?? 100, 1), 1000);

    // Include anche record importati direttamente in activities con unita' non convertite.
    const rawDocs = (await Activity.find(
      {
        $or: [
          { source: { $exists: false } },
          { source: null },
          { source: '' },
          { type: { $exists: false } },
          { type: null },
          { type: '' },
          { type: 'unknown' },
          { activityType: { $exists: true } },
          { startTimeLocal: { $exists: true } },
          { startTimeGmt: { $exists: true } },
          { beginTimestamp: { $exists: true } },
          { activityId: { $exists: true } },
          { duration: { $gt: 100000 } },
          { distance: { $gt: 100000 } },
        ],
      },
      null,
      { limit }
    ).lean()) as Array<Record<string, unknown> & { _id: Types.ObjectId }>;

    const previews: NormalizePreview[] = [];
    const updates: Array<{ _id: Types.ObjectId; update: Record<string, unknown> }> = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const doc of rawDocs) {
      try {
        if (!isObject(doc)) {
          continue;
        }

        const candidate = toGarminCandidate(doc);
        if (!candidate) {
          continue;
        }

        let parsed = parseGarminJSON(candidate);

        // Fallback: se il record raw non contiene timestamp Garmin valido ma ha date leggibile nel documento.
        if (Number.isNaN(parsed.date.getTime())) {
          const fallbackDate = parseDateLike(doc.date);
          if (fallbackDate) {
            parsed = { ...parsed, date: fallbackDate };
          }
        }

        previews.push({
          id: String(doc._id),
          before: {
            name: typeof doc.name === 'string' ? doc.name : undefined,
            type: typeof doc.type === 'string' ? doc.type : undefined,
            date: parseDateLike(doc.date),
            distance: toFiniteNumber(doc.distance),
            duration: toFiniteNumber(doc.duration),
            calories: toFiniteNumber(doc.calories),
            source: typeof doc.source === 'string' ? doc.source : undefined,
          },
          after: {
            name: parsed.name,
            type: parsed.type,
            date: parsed.date,
            distance: parsed.distance,
            duration: parsed.duration,
            calories: parsed.calories,
            source: 'garmin',
          },
        });

        updates.push({
          _id: doc._id,
          update: {
            name: parsed.name,
            type: parsed.type,
            date: parsed.date,
            distance: parsed.distance,
            duration: parsed.duration,
            moving_time: parsed.moving_time,
            avg_speed: parsed.avg_speed,
            max_speed: parsed.max_speed,
            elevation_gain: parsed.elevation_gain,
            elevation_loss: parsed.elevation_loss,
            calories: parsed.calories,
            source: 'garmin',
            source_id: parsed.source_id,
            fingerprint: parsed.fingerprint,
            device_info: parsed.device_info,
            updated_at: new Date(),
            created_at: doc.created_at instanceof Date ? doc.created_at : new Date(),
          },
        });
      } catch (error) {
        errors.push({
          id: String(doc._id),
          error: error instanceof Error ? error.message : 'Unknown parse error',
        });
      }
    }

    if (apply && updates.length > 0) {
      await Activity.bulkWrite(
        updates.map((item) => ({
          updateOne: {
            filter: { _id: item._id },
            update: { $set: item.update },
          },
        }))
      );
    }

    return NextResponse.json({
      status: 'success',
      mode: apply ? 'apply' : 'dry-run',
      scanned: rawDocs.length,
      convertible: updates.length,
      updated: apply ? updates.length : 0,
      errors_count: errors.length,
      errors,
      preview: previews.slice(0, 10),
      hint: apply
        ? 'Normalizzazione applicata. Ricarica la pagina demo.'
        : 'Dry-run completato. Esegui POST con {"apply": true} per scrivere sul DB.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Errore normalizzazione Garmin',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
