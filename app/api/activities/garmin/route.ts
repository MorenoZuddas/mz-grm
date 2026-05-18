import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { SyncLog } from '@/lib/db/models/SyncLog';
import { convertGarminRaw, GarminRawActivity } from '@/lib/garmin/converter';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { removeDuplicateActivitiesNow } from '@/lib/db/maintenance';
import { getAssetsByActivityIds } from '@/lib/cloudinary/server';

export const dynamic = 'force-dynamic';

function parseCacheTtlMs(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const GET_CACHE_TTL_MS = parseCacheTtlMs(process.env.GARMIN_GET_CACHE_TTL_MS, 6 * 60 * 60 * 1000);
const CACHE_HEADERS = {
  'Cache-Control': `public, s-maxage=${Math.max(60, Math.floor(GET_CACHE_TTL_MS / 1000))}, stale-while-revalidate=86400`,
};

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

type GarminGetPayload = {
  status: 'success';
  data: {
    total_activities: number;
    total_unique_activities: number;
    total_filtered_count: number;
    returned_activities: number;
    pagination: {
      limit: number;
      offset: number;
      has_more: boolean;
    };
    global_summary: GarminSummary;
    filtered_summary: GarminSummary;
    summary: GarminSummary;
    recent_activities: unknown[];
  };
};

const garminGetCache = new Map<string, { expiresAt: number; payload: GarminGetPayload }>();
const garminSummaryCache = new Map<string, { expiresAt: number; summary: GarminSummary }>();

type ActivityGroup = 'all' | 'running' | 'trekking';
type ActivitySort = 'date_desc' | 'date_asc' | 'distance_desc' | 'distance_asc';

interface GarminSummary {
  total_count: number;
  total_distance_m: number;
  longest_distance_m: number;
  locations_count: number;
  best_half_marathon_sec: number | null;
}

interface GarminListDocument {
  _id?: unknown;
  name?: string;
  type?: string;
  date?: Date | string | null;
  distance?: number | null;
  duration?: number | null;
  calories?: number | null;
  avg_pace?: number | null;
  description?: string | null;
  source_id?: string;
  activityId?: number | null;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseNonNegativeInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeType(type: string | undefined): string {
  return (type || '').trim().toLowerCase();
}

function safeTimestamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function parseBooleanParam(value: string | null, fallback = false): boolean {
  if (value === null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function getRunningDbTypes(): string[] {
  return ['running', 'track_running', 'road_running', 'trail_running', 'virtual_running'];
}

function getTrekkingDbTypes(): string[] {
  return ['hiking', 'trekking', 'walking'];
}

function expandRequestedTypes(typeSet: Set<string>): string[] {
  const expanded = new Set<string>();

  for (const type of typeSet) {
    if (type === 'running') {
      for (const value of getRunningDbTypes().filter((entry) => entry !== 'track_running')) {
        expanded.add(value);
      }
      continue;
    }

    if (type === 'trekking') {
      expanded.add('trekking');
      expanded.add('hiking');
      continue;
    }

    expanded.add(type);
  }

  return Array.from(expanded);
}

function buildMongoMatch(params: {
  group: ActivityGroup;
  dateFromTs: number;
  dateToTs: number;
  minDistanceM: number;
  maxDistanceM: number;
  typeSet: Set<string>;
}): Record<string, unknown> {
  const { group, dateFromTs, dateToTs, minDistanceM, maxDistanceM, typeSet } = params;
  const match: Record<string, unknown> = {};

  const requestedTypes = expandRequestedTypes(typeSet);
  if (requestedTypes.length > 0) {
    match.type = { $in: requestedTypes };
  } else if (group === 'running') {
    match.type = { $in: getRunningDbTypes() };
  } else if (group === 'trekking') {
    match.type = { $in: getTrekkingDbTypes() };
  }

  const dateFilter: Record<string, Date> = {};
  if (dateFromTs > 0) dateFilter.$gte = new Date(dateFromTs);
  if (dateToTs > 0) dateFilter.$lte = new Date(dateToTs);
  if (Object.keys(dateFilter).length > 0) {
    match.date = dateFilter;
  }

  const distanceFilter: Record<string, number> = {};
  if (minDistanceM > 0) distanceFilter.$gte = minDistanceM;
  if (maxDistanceM > 0) distanceFilter.$lte = maxDistanceM;
  if (Object.keys(distanceFilter).length > 0) {
    match.distance = distanceFilter;
  }

  return match;
}

function getMongoSort(sort: ActivitySort): Record<string, 1 | -1> {
  switch (sort) {
    case 'date_asc':
      return { date: 1, _id: 1 };
    case 'distance_desc':
      return { distance: -1, date: -1, _id: -1 };
    case 'distance_asc':
      return { distance: 1, date: 1, _id: 1 };
    case 'date_desc':
    default:
      return { date: -1, _id: -1 };
  }
}

function hasActiveSummaryFilters(params: {
  dateFromTs: number;
  dateToTs: number;
  minDistanceM: number;
  maxDistanceM: number;
  typeSet: Set<string>;
}): boolean {
  return (
    params.dateFromTs > 0 ||
    params.dateToTs > 0 ||
    params.minDistanceM > 0 ||
    params.maxDistanceM > 0 ||
    params.typeSet.size > 0
  );
}

async function aggregateSummary(match: Record<string, unknown>): Promise<GarminSummary> {
  const summaryAggregation = await Activity.aggregate([
    { $match: match },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              total_count: { $sum: 1 },
              total_distance_m: { $sum: { $ifNull: ['$distance', 0] } },
              longest_distance_m: { $max: { $ifNull: ['$distance', 0] } },
              best_half_marathon_sec: {
                $min: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$distance', 20600] },
                        { $lte: ['$distance', 21600] },
                        { $gt: ['$duration', 0] },
                      ],
                    },
                    '$duration',
                    Number.MAX_SAFE_INTEGER,
                  ],
                },
              },
            },
          },
        ],
        locations: [
          {
            $project: {
              location: {
                $trim: {
                  input: { $ifNull: ['$description', ''] },
                },
              },
            },
          },
          { $match: { location: { $ne: '' } } },
          { $group: { _id: '$location' } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const summaryBucket = Array.isArray(summaryAggregation)
    ? (summaryAggregation[0] as {
        summary?: Array<{
          total_count?: number;
          total_distance_m?: number;
          longest_distance_m?: number;
          best_half_marathon_sec?: number;
        }>;
        locations?: Array<{ count?: number }>;
      } | undefined)
    : undefined;
  const summaryRow = summaryBucket?.summary?.[0];
  const bestHalfCandidate = summaryRow?.best_half_marathon_sec;
  const locationsCount = summaryBucket?.locations?.[0]?.count ?? 0;

  return {
    total_count: summaryRow?.total_count ?? 0,
    total_distance_m: Math.round(summaryRow?.total_distance_m ?? 0),
    longest_distance_m: Math.round(summaryRow?.longest_distance_m ?? 0),
    locations_count: locationsCount,
    best_half_marathon_sec:
      typeof bestHalfCandidate === 'number' && bestHalfCandidate < Number.MAX_SAFE_INTEGER
        ? bestHalfCandidate
        : null,
  };
}

async function getCachedSummary(cacheKey: string, match: Record<string, unknown>): Promise<GarminSummary> {
  const cached = garminSummaryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.summary;
  }

  const summary = await aggregateSummary(match);
  garminSummaryCache.set(cacheKey, {
    expiresAt: Date.now() + GET_CACHE_TTL_MS,
    summary,
  });

  return summary;
}

function normalizeListedActivityType(type: string | undefined): string {
  const normalized = normalizeType(type);
  if (['road_running', 'trail_running', 'virtual_running'].includes(normalized)) {
    return 'running';
  }
  if (normalized === 'trekking') {
    return 'hiking';
  }
  return normalized || 'unknown';
}

function resolveNumericActivityIdFromDocument(doc: GarminListDocument): number | null {
  if (typeof doc.activityId === 'number' && Number.isFinite(doc.activityId)) {
    return doc.activityId;
  }

  if (typeof doc.source_id === 'string' && /^\d+$/.test(doc.source_id)) {
    return Number(doc.source_id);
  }

  return null;
}

// Estrae le attività dal wrapper Garmin (summarizedActivitiesExport) o da array flat
function extractActivities(payload: unknown): GarminRawActivity[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      if (item && typeof item === 'object') {
        const w = item as { summarizedActivitiesExport?: GarminRawActivity[] };
        if (Array.isArray(w.summarizedActivitiesExport)) {
          return w.summarizedActivitiesExport;
        }
      }
      return typeof item === 'object' && item !== null ? [item as GarminRawActivity] : [];
    });
  }

  if (payload && typeof payload === 'object') {
    const w = payload as { summarizedActivitiesExport?: GarminRawActivity[] };
    if (Array.isArray(w.summarizedActivitiesExport)) {
      return w.summarizedActivitiesExport;
    }
    return [payload as GarminRawActivity];
  }

  return [];
}

function isValidRaw(raw: GarminRawActivity): boolean {
  const hasIdentity =
    typeof raw.activityId === 'number' ||
    typeof raw.startTimeLocal === 'number' ||
    typeof raw.startTimeGmt === 'number' ||
    typeof raw.beginTimestamp === 'number' ||
    typeof raw.startTime === 'string' ||
    typeof raw.date === 'string' ||
    raw.date instanceof Date;

  const hasMetrics =
    typeof raw.distance === 'number' ||
    typeof raw.totalDistance === 'number' ||
    typeof raw.duration === 'number' ||
    typeof raw.totalTimeInSeconds === 'number';

  return hasIdentity || hasMetrics;
}

function fingerprint(raw: GarminRawActivity): string {
  const converted = convertGarminRaw(raw);
  const data = [
    converted.date?.toISOString() ?? '',
    converted.type,
    Math.round(converted.distance_m ?? 0),
    Math.round(converted.duration_sec ?? 0),
  ].join('_');
  return crypto.createHash('sha256').update(data).digest('hex');
}

function buildDedupKey(raw: GarminRawActivity): { key: string; sourceId?: string; fp: string } {
  const converted = convertGarminRaw(raw);
  const fp = fingerprint(raw);

  // activityId/source_id Garmin e' la chiave piu' affidabile tra import multipli.
  if (converted.source_id && !converted.source_id.startsWith('garmin_')) {
    return { key: `sid:${converted.source_id}`, sourceId: converted.source_id, fp };
  }

  return { key: `fp:${fp}`, fp };
}

// POST: salva i documenti raw nel DB così come arrivano (dal JSON o direttamente)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📥 Upload attività Garmin JSON...');
    await connectToDatabase();
    const preCleanup = await removeDuplicateActivitiesNow();

    const body: unknown = await request.json();
    const extracted = extractActivities(body).filter(isValidRaw);

    // Deduplica interna al file caricato (stesso record ripetuto nel payload).
    const seen = new Set<string>();
    const activities: GarminRawActivity[] = [];
    let skippedInPayload = 0;
    for (const raw of extracted) {
      const { key } = buildDedupKey(raw);
      if (seen.has(key)) {
        skippedInPayload++;
        continue;
      }
      seen.add(key);
      activities.push(raw);
    }

    if (activities.length === 0) {
      return NextResponse.json(
        { status: 'error', message: '❌ Nessuna attività valida trovata nel JSON' },
        { status: 400 }
      );
    }

    console.log(`📦 ${activities.length} attività da importare (${skippedInPayload} duplicati nel file ignorati)`);

    const syncLog = await SyncLog.create({
      source: 'garmin',
      status: 'started',
      activities_fetched: activities.length,
    });

    let saved = 0;
    let skipped = skippedInPayload;
    let duplicatesFoundInDb = 0;
    const errors: string[] = [];

    for (const raw of activities) {
      try {
        const fp = fingerprint(raw);
        const converted = convertGarminRaw(raw);
        const dedupFilter =
          converted.source_id && !converted.source_id.startsWith('garmin_')
            ? {
                $or: [
                  { source: 'garmin', source_id: converted.source_id },
                  { fingerprint: fp },
                ],
              }
            : { fingerprint: fp };

        const alreadyExists = (await Activity.countDocuments(dedupFilter).limit(1)) > 0;

        // Lo schema Activity e' strict: salviamo in forma canonica per evitare campi persi.
        await Activity.findOneAndUpdate(
          dedupFilter,
          {
            $set: {
              name: converted.name,
              type: converted.type,
              date: converted.date ?? new Date(),
              distance: converted.distance_m ?? 0,
              duration: converted.duration_sec ?? 0,
              moving_time: converted.moving_sec ?? undefined,
              avg_speed: converted.avg_speed_mps ?? undefined,
              max_speed: converted.max_speed_mps ?? undefined,
              avg_pace: converted.pace_min_per_km ?? undefined,
              elevation_gain: converted.elevation_gain_m ?? undefined,
              elevation_loss: converted.elevation_loss_m ?? undefined,
              avg_heart_rate: converted.avg_hr ?? undefined,
              max_heart_rate: converted.max_hr ?? undefined,
              avg_cadence: converted.avg_cadence ?? undefined,
              calories: converted.calories_kcal ?? undefined,
              vo2max: converted.vo2max ?? undefined,
              training_effect: converted.aerobic_te ?? undefined,
              source: 'garmin',
              source_id: converted.source_id,
              activityId: typeof raw.activityId === 'number' ? raw.activityId : undefined,
              fingerprint: fp,
              updated_at: new Date(),
              // Dato utile per debug geografico nel FE
              description: converted.location ?? undefined,
              // Fonte raw mantenuta per riconversioni consistenti lato API.
              raw_payload: raw,
            },
            $setOnInsert: { created_at: new Date() },
          },
          { upsert: true, returnDocument: 'after' }
        );
        if (alreadyExists) {
          duplicatesFoundInDb++;
        } else {
          saved++;
        }
        console.log(`✅ Salvata: ${converted.name}`);
      } catch (err) {
        skipped++;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${raw.name ?? '?'}: ${msg}`);
        console.error(`❌ Errore: ${msg}`);
      }
    }

    await SyncLog.findByIdAndUpdate(syncLog._id, {
      status: 'completed',
      activities_saved: saved,
      activities_skipped: skipped,
      details: errors.length > 0 ? { errors } : undefined,
    });

    const postCleanup = await removeDuplicateActivitiesNow();
    const totalRemovedByMaintenance = preCleanup.removedDuplicates + postCleanup.removedDuplicates;
    garminGetCache.clear();
    garminSummaryCache.clear();

    return NextResponse.json({
      status: 'success',
      message: `✅ Import completato: ${saved} salvate, ${skipped} saltate`,
      data: {
        total_processed: extracted.length,
        unique_processed: activities.length,
        saved,
        duplicates_found_in_db: duplicatesFoundInDb,
        skipped,
        maintenance: {
          duplicates_removed_before_import: preCleanup.removedDuplicates,
          duplicates_removed_after_import: postCleanup.removedDuplicates,
          total_duplicates_removed: totalRemovedByMaintenance,
        },
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Errore import:', error);
    return NextResponse.json(
      { status: 'error', message: '❌ Errore durante l\'import', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: legge i raw dal DB e li converte con convertGarminRaw prima di mandarli al FE
export async function GET(request: NextRequest): Promise<NextResponse> {
  const traceId = crypto.randomUUID();
  const requestedGroup = (request.nextUrl.searchParams.get('group') ?? 'all').toLowerCase() as ActivityGroup;
  const group: ActivityGroup = ['all', 'running', 'trekking'].includes(requestedGroup)
    ? requestedGroup
    : 'all';
  const limit = Math.min(parsePositiveInt(request.nextUrl.searchParams.get('limit'), 200), 200);
  const offset = parseNonNegativeInt(request.nextUrl.searchParams.get('offset'), 0);
  const sortParam = (request.nextUrl.searchParams.get('sort') ?? 'date_desc').toLowerCase();
  const sort: ActivitySort = ['date_desc', 'date_asc', 'distance_desc', 'distance_asc'].includes(sortParam)
    ? (sortParam as ActivitySort)
    : 'date_desc';
  const dateFromTs = safeTimestamp(request.nextUrl.searchParams.get('date_from'));
  const dateToTs = safeTimestamp(request.nextUrl.searchParams.get('date_to'));
  const minDistanceM = parseNonNegativeInt(request.nextUrl.searchParams.get('min_distance_m'), 0);
  const maxDistanceM = parseNonNegativeInt(request.nextUrl.searchParams.get('max_distance_m'), 0);
  const includePhotos = parseBooleanParam(request.nextUrl.searchParams.get('include_photos'), true);
  const typeSet = new Set(
    (request.nextUrl.searchParams.get('types') ?? '')
      .split(',')
      .map((value) => normalizeType(value))
      .filter(Boolean)
  );
  const cacheKey = request.nextUrl.searchParams.toString() || `${group}:limit=${limit}:offset=${offset}:sort=${sort}`;

  const cached = garminGetCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: {
        ...CACHE_HEADERS,
        'X-Garmin-Cache': 'HIT',
      },
    });
  }

  try {
    console.log(`[garmin:get:${traceId}] start`);
    await connectToDatabase();
    const match = buildMongoMatch({
      group,
      dateFromTs,
      dateToTs,
      minDistanceM,
      maxDistanceM,
      typeSet,
    });
    const globalMatch = buildMongoMatch({
      group,
      dateFromTs: 0,
      dateToTs: 0,
      minDistanceM: 0,
      maxDistanceM: 0,
      typeSet: new Set<string>(),
    });
    const summaryFiltersActive = hasActiveSummaryFilters({
      dateFromTs,
      dateToTs,
      minDistanceM,
      maxDistanceM,
      typeSet,
    });
    const sortSpec = getMongoSort(sort);
    const globalSummaryCacheKey = `group:${group}:global_summary`;
    const globalSummaryPromise = getCachedSummary(globalSummaryCacheKey, globalMatch);

    const [totalCount, totalAvailable, rows, globalSummary, filteredSummary] = await Promise.all([
      Activity.countDocuments(),
      Activity.countDocuments(match),
      Activity.find(match)
        .sort(sortSpec)
        .skip(offset)
        .limit(limit)
        .select({
          name: 1,
          type: 1,
          date: 1,
          distance: 1,
          duration: 1,
          calories: 1,
          avg_pace: 1,
          description: 1,
          source_id: 1,
          activityId: 1,
        })
        .lean(),
      globalSummaryPromise,
      summaryFiltersActive ? aggregateSummary(match) : globalSummaryPromise,
    ]);

    const typedRows = rows as GarminListDocument[];
    console.log(`[garmin:get:${traceId}] db read ok`, {
      totalDocuments: totalCount,
      totalAvailable,
      returnedRows: typedRows.length,
      includePhotos,
    });

    const activityIds = Array.from(
      new Set(
        typedRows
          .map((row) => resolveNumericActivityIdFromDocument(row))
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
      )
    );

    let cloudinaryMap = new Map<number, Awaited<ReturnType<typeof getAssetsByActivityIds>> extends Map<number, infer V> ? V : never>();
    if (includePhotos && activityIds.length > 0) {
      console.log(`[garmin:get:${traceId}] cloudinary fetch start`, { ids: activityIds.length });
      cloudinaryMap = await getAssetsByActivityIds(activityIds);
      console.log(`[garmin:get:${traceId}] cloudinary fetch done`, { matched: cloudinaryMap.size });
    }

    const normalized = typedRows.map((row) => {
      const numericActivityId = resolveNumericActivityIdFromDocument(row);
      const photo = includePhotos && numericActivityId ? cloudinaryMap.get(numericActivityId) ?? null : null;
      return {
        _id: row._id != null ? String(row._id) : undefined,
        name: row.name ?? 'Attivita Garmin',
        type: normalizeListedActivityType(row.type),
        date: row.date ? new Date(row.date) : null,
        distance_m: typeof row.distance === 'number' && Number.isFinite(row.distance) ? row.distance : 0,
        duration_sec: typeof row.duration === 'number' && Number.isFinite(row.duration) ? row.duration : 0,
        calories_kcal: typeof row.calories === 'number' && Number.isFinite(row.calories) ? row.calories : null,
        pace_min_per_km: typeof row.avg_pace === 'number' && Number.isFinite(row.avg_pace) ? row.avg_pace : null,
        location: typeof row.description === 'string' ? row.description : null,
        activityId: numericActivityId,
        photo,
      };
    });

    console.log(`[garmin:get:${traceId}] merge complete`, { items: normalized.length });

    const payload: GarminGetPayload = {
      status: 'success',
      data: {
        total_activities: totalCount,
        total_unique_activities: totalAvailable,
        total_filtered_count: filteredSummary.total_count,
        returned_activities: normalized.length,
        pagination: {
          limit,
          offset,
          has_more: offset + normalized.length < totalAvailable,
        },
        global_summary: globalSummary,
        filtered_summary: filteredSummary,
        summary: filteredSummary,
        recent_activities: normalized,
      },
    };

    garminGetCache.set(cacheKey, {
      expiresAt: Date.now() + GET_CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json(payload, {
      headers: {
        ...CACHE_HEADERS,
        'X-Garmin-Cache': 'MISS',
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[garmin:get:${traceId}] failed`, details);

    return NextResponse.json(
      {
        status: 'error',
        message: '❌ Errore durante la lettura',
        details,
        traceId,
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}
