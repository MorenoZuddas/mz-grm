import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { requireAdminApiAccess } from '@/lib/api/admin';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { expandGarminActivitiesFromDocuments, isGarminWrapperDocument, type GarminStoredDocument } from '@/lib/garmin/db';

interface MongoServerInfo {
  version?: string;
  ok?: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const denied = requireAdminApiAccess(request);
    if (denied) return denied;

    console.log('🔍 Diagnosi database in corso...');

    const conn = await connectToDatabase();
    const db = conn.db;

    if (!db) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection object is null',
        },
        { status: 500 }
      );
    }

    const dbName = conn.name;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Conta attività nel database corrente
    const documentsCount = await Activity.countDocuments();
    const activityDocs = (await Activity.find().lean()) as GarminStoredDocument[];
    const activitiesCount = expandGarminActivitiesFromDocuments(activityDocs).length;
    const wrapperDocumentsCount = activityDocs.filter(isGarminWrapperDocument).length;

    // Mostra info specifiche
    const adminDb = db.admin();
    let serverInfo = null;
    try {
      serverInfo = await adminDb.serverInfo();
    } catch {
      // Se non riusciamo a prendere serverInfo, continuiamo
    }

    return NextResponse.json({
      status: 'success',
      database: {
        name: dbName,
        collections: collectionNames,
        documentsCount,
        activitiesCount,
        wrapperDocumentsCount,
      },
      environment: {
        MONGODB_URI: process.env.MONGODB_URI ? '***SET***' : 'NOT_SET',
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'NOT_SET',
      },
      serverInfo: serverInfo ? {
        version: (serverInfo as MongoServerInfo)?.version,
        ok: (serverInfo as MongoServerInfo)?.ok,
      } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5),
        } : null,
      },
      { status: 500 }
    );
  }
}
