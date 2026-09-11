import mongoose, { Connection } from 'mongoose';

let cachedConnection: Connection | null = null;
let maintenanceReady = false;
let maintenanceRunPromise: Promise<void> | null = null;

async function ensureDatabaseMaintenance(): Promise<void> {
  if (maintenanceReady) return;

  if (!maintenanceRunPromise) {
    maintenanceRunPromise = (async () => {
      if (process.env.MONGODB_AUTO_MAINTENANCE === 'false') {
        maintenanceReady = true;
        console.log('ℹ️ Auto maintenance MongoDB disabilitata via env');
        return;
      }

      try {
        const { runDatabaseMaintenanceOnce } = await import('./maintenance');
        await runDatabaseMaintenanceOnce();
      } catch (error) {
        // Non blocca l'app: il DB resta operativo anche se la manutenzione fallisce.
        console.error('⚠️ Errore durante auto maintenance MongoDB:', error);
      } finally {
        maintenanceReady = true;
      }
    })();
  }

  await maintenanceRunPromise;
}

export async function connectToDatabase(): Promise<Connection> {
  if (cachedConnection) {
    console.log('📦 Usando connessione MongoDB in cache');
    await ensureDatabaseMaintenance();
    return cachedConnection;
  }

  let mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('❌ MONGODB_URI non è definito in .env.local');
  }

  // In produzione, assicurati che la URI punti al database corretto
  if (process.env.NODE_ENV === 'production') {
    // Se la URI finisce con /? (senza database), aggiungi mz-exploration
    if (mongoUri.includes('/?')) {
      mongoUri = mongoUri.replace('/?', '/mz-exploration?');
      console.log('🔄 URI produzione modificata per puntare a mz-exploration');
    }
  }

  const resolvedDbName =
    process.env.NODE_ENV === 'production'
      ? (process.env.MONGODB_DB_NAME || 'mz-exploration')
      : (process.env.MONGODB_DB_NAME || 'test');

  console.log('🔗 Creando nuova connessione a MongoDB...');

  try {
    const connectTimeoutMs = parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || '30000');

    const conn = await Promise.race<typeof mongoose>([
      mongoose.connect(mongoUri, {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '1'),
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '10000'),
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '45000'),
        dbName: resolvedDbName,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB connection timeout')), connectTimeoutMs)
      ),
    ]);

    cachedConnection = conn.connection;
    console.log('✅ Connessione MongoDB stabilita');

    // Non aspettare la manutenzione al primo avvio - esegui in background
    if (process.env.MONGODB_AUTO_MAINTENANCE !== 'false') {
      ensureDatabaseMaintenance().catch(err => {
        console.warn('⚠️ Maintenance setup error (non-blocking):', err);
      });
    }

    return conn.connection;
  } catch (error) {
    console.error('❌ Errore connessione MongoDB:', error);
    // Non lanciare errore - consenti all'app di proseguire
    console.log('⚠️ MongoDB non disponibile, app in modalità limitata');
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cachedConnection) {
    await mongoose.disconnect();
    cachedConnection = null;
    maintenanceReady = false;
    maintenanceRunPromise = null;
    console.log('🔌 Disconnesso da MongoDB');
  }
}
