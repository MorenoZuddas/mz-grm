import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/api/admin';

interface SyncIndexesBody {
  apply?: boolean;
}

const LEGACY_INDEX_NAMES = [
  'fingerprint_1',
  'source_1_source_id_1',
  'source_1_date_1_type_1_distance_1_duration_1',
  'activityId_1',
];

async function dropLegacyIndexes(): Promise<string[]> {
  const dropped: string[] = [];
  const existing = await Activity.collection.indexes();

  for (const index of existing) {
    if (!index.name || !LEGACY_INDEX_NAMES.includes(index.name)) continue;
    if (index.name === '_id_') continue;
    await Activity.collection.dropIndex(index.name);
    dropped.push(index.name);
  }

  return dropped;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const denied = requireAdminApiAccess(request);
    if (denied) return denied;

    await connectToDatabase();

    const body = (await request.json().catch(() => ({}))) as SyncIndexesBody;
    const apply = Boolean(body.apply);

    if (!apply) {
      const indexes = await Activity.collection.indexes();
      return NextResponse.json({
        status: 'success',
        mode: 'dry-run',
        message: 'Nessuna modifica applicata. Usa {"apply": true} per sincronizzare gli indici.',
        indexes,
      });
    }

    // Rimuove indici legacy che possono avere stesso nome ma opzioni incompatibili.
    const dropped = await dropLegacyIndexes();

    // syncIndexes crea/rimuove indici per allinearsi al modello Mongoose.
    const synced = await Activity.syncIndexes();
    const indexes = await Activity.collection.indexes();

    return NextResponse.json({
      status: 'success',
      mode: 'apply',
      message: 'Indici sincronizzati.',
      dropped_legacy_indexes: dropped,
      synced,
      indexes,
    });
  } catch (error) {
    const err = error as { code?: number; message?: string };
    const duplicateKey = err?.code === 11000;

    return NextResponse.json(
      {
        status: 'error',
        message: duplicateKey
          ? 'Impossibile creare indice univoco: ci sono duplicati esistenti. Esegui prima /api/activities/garmin/deduplicate con {"apply": true}.'
          : 'Errore sincronizzazione indici.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
