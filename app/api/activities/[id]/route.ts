import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { type GarminRawActivity } from '@/lib/garmin/converter';
import { getAssetsByActivityIds } from '@/lib/cloudinary/server';
import {
  expandGarminActivitiesFromDocuments,
  type ExpandedGarminActivity,
  type GarminStoredDocument,
} from '@/lib/garmin/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface NormalizedPhoto {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizePhoto(value: unknown): NormalizedPhoto | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const secureUrl = getString(value, ['secure_url', 'secureUrl']);
  if (!secureUrl) {
    return null;
  }

  const publicId =
    getString(value, ['public_id', 'publicId']) ??
    secureUrl.split('/').pop()?.split('.')[0] ??
    'photo';

  return {
    public_id: publicId,
    secure_url: secureUrl,
    width: toNumber(value.width),
    height: toNumber(value.height),
  };
}

function normalizePhotosFromDb(rawActivity: GarminRawActivity): NormalizedPhoto[] {
  const bucket: NormalizedPhoto[] = [];

  const rawPhotos = isObjectRecord(rawActivity) ? rawActivity.photos : undefined;
  if (Array.isArray(rawPhotos)) {
    for (const entry of rawPhotos) {
      const normalized = normalizePhoto(entry);
      if (normalized) {
        bucket.push(normalized);
      }
    }
  }

  const singlePhoto = isObjectRecord(rawActivity) ? rawActivity.photo : undefined;
  const normalizedSingle = normalizePhoto(singlePhoto);
  if (normalizedSingle) {
    bucket.push(normalizedSingle);
  }

  const unique = new Map<string, NormalizedPhoto>();
  for (const photo of bucket) {
    unique.set(photo.public_id, photo);
  }

  return Array.from(unique.values());
}

async function findCandidateActivityDocs(id: string): Promise<GarminStoredDocument[]> {
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    const directDoc = (await Activity.findById(id).lean()) as GarminStoredDocument | null;
    if (directDoc) {
      return [directDoc];
    }
  }

  const queries: Array<Record<string, unknown>> = [{ source_id: id }];
  const numericId = Number(id);
  if (Number.isFinite(numericId)) {
    queries.push({ activityId: numericId });
  }

  for (const query of queries) {
    const docs = (await Activity.find(query).lean()) as GarminStoredDocument[];
    if (docs.length > 0) {
      return docs;
    }
  }

  return [];
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: idFromParams } = await context.params;
    const idFromPath = request.nextUrl.pathname.split('/').pop();
    const id = idFromParams || idFromPath;

    if (!id) {
      return NextResponse.json(
        { status: 'error', message: 'ID attività mancante' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let selectedEntry: ExpandedGarminActivity | null = null;

    const candidateDocs = await findCandidateActivityDocs(id);
    if (candidateDocs.length > 0) {
      const expandedCandidateActivities = expandGarminActivitiesFromDocuments(candidateDocs);
      const numericId = Number(id);
      selectedEntry = expandedCandidateActivities.find((entry) => {
        if (entry.entryId === id) return true;
        if (entry.containerId === id) return true;
        return Number.isFinite(numericId) && entry.numericActivityId === numericId;
      }) ?? expandedCandidateActivities[0] ?? null;
    }

    if (!selectedEntry) {
      const rawDocs = (await Activity.find().lean()) as GarminStoredDocument[];
      const expandedActivities = expandGarminActivitiesFromDocuments(rawDocs);
      const numericId = Number(id);
      selectedEntry = expandedActivities.find((entry) => {
        if (entry.entryId === id) return true;
        if (entry.containerId === id) return true;
        return Number.isFinite(numericId) && entry.numericActivityId === numericId;
      }) ?? null;
    }

    if (!selectedEntry) {
      return NextResponse.json(
        { status: 'error', message: 'Attività non trovata' },
        { status: 404 }
      );
    }

    const converted = selectedEntry.converted;
    const dbPhotos = normalizePhotosFromDb(selectedEntry.raw);
    const numericActivityId = selectedEntry.numericActivityId;

    let cloudPhotos: NormalizedPhoto[] = [];
    if (numericActivityId) {
      const cloudMap = await getAssetsByActivityIds([numericActivityId]);
      const cloudPhoto = cloudMap.get(numericActivityId);
      if (cloudPhoto) {
        cloudPhotos = [
          {
            public_id: cloudPhoto.publicId,
            secure_url: cloudPhoto.secureUrl,
            width: cloudPhoto.width,
            height: cloudPhoto.height,
          },
        ];
      }
    }

    const finalPhotos = dbPhotos.length > 0 ? dbPhotos : cloudPhotos;

    return NextResponse.json({
      status: 'success',
      data: {
        activity: {
          ...converted,
          _id: selectedEntry.entryId,
          container_id: selectedEntry.containerId,
          activityId: numericActivityId,
          photos: finalPhotos,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Errore durante la lettura attività',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
