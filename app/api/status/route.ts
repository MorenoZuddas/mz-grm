import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { SyncLog } from '@/lib/db/models/SyncLog';
import {
  expandGarminActivitiesFromDocuments,
  isGarminWrapperDocument,
  sortExpandedGarminActivities,
  type GarminStoredDocument,
} from '@/lib/garmin/db';
import { requireAdminApiAccess } from '@/lib/api/admin';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const denied = requireAdminApiAccess(request);
    if (denied) return denied;

    console.log('📊 Status check...');

    await connectToDatabase();

    // Conta documenti
    const documentsCount = await Activity.countDocuments();
    const syncLogsCount = await SyncLog.countDocuments();

    // Ultimi inserimenti
    const activityDocs = (await Activity.find().lean()) as GarminStoredDocument[];
    const expandedActivities = sortExpandedGarminActivities(expandGarminActivitiesFromDocuments(activityDocs));
    const wrapperDocumentsCount = activityDocs.filter(isGarminWrapperDocument).length;

    const recentLogs = await SyncLog.find()
      .sort({ created_at: -1 })
      .limit(3)
      .lean();

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      database: {
        total_documents: documentsCount,
        total_activities: expandedActivities.length,
        wrapper_documents: wrapperDocumentsCount,
        total_sync_logs: syncLogsCount,
      },
      recent: {
        activities: expandedActivities.slice(0, 3).map((entry) => {
          const converted = entry.converted;
          return {
            id: entry.entryId,
            name: converted.name,
            type: converted.type,
            date: converted.date,
            distance_m: converted.distance_m,
            calories_kcal: converted.calories_kcal,
            source: converted.source,
            created_at: entry.createdAt ?? undefined,
          };
        }),
        logs: recentLogs.map((l) => ({
          source: l.source,
          status: l.status,
          activities_saved: l.activities_saved,
          created_at: l.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Errore:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
