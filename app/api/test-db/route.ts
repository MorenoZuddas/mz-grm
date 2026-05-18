import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { SyncLog } from '@/lib/db/models/SyncLog';
import { requireAdminApiAccess } from '@/lib/api/admin';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { expandGarminActivitiesFromDocuments, isGarminWrapperDocument, type GarminStoredDocument } from '@/lib/garmin/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const denied = requireAdminApiAccess(request);
    if (denied) return denied;

    console.log('🧪 Test connessione database...');

    // 1. Connetti a MongoDB
    await connectToDatabase();
    console.log('✅ MongoDB connesso');

    // 2. Verifica le collections
    const documentsCount = await Activity.countDocuments();
    const activityDocs = (await Activity.find().lean()) as GarminStoredDocument[];
    const activityCount = expandGarminActivitiesFromDocuments(activityDocs).length;
    const wrapperDocumentsCount = activityDocs.filter(isGarminWrapperDocument).length;
    const syncLogCount = await SyncLog.countDocuments();

    console.log(`📦 Activity documents: ${documentsCount}`);
    console.log(`📊 Expanded activities: ${activityCount}`);
    console.log(`🧱 Wrapper documents: ${wrapperDocumentsCount}`);
    console.log(`📋 Sync Logs: ${syncLogCount}`);

    return NextResponse.json({
      status: 'success',
      message: '✅ Database connesso e operativo',
      data: {
        mongodb_connected: true,
        collections: {
          activity_documents: documentsCount,
          activities: activityCount,
          activity_wrappers: wrapperDocumentsCount,
          sync_logs: syncLogCount,
        },
      },
    });
  } catch (error) {
    console.error('❌ Errore test database:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: '❌ Errore connessione database',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

