'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatsCard, type StatsActivity, type StatsType } from "@/components/ui/card"
import { PageShell } from '@/components/generic'

interface Activity {
  _id?: string;
  source_id?: string;
  name: string;
  type: string;
  date: string | null;
  duration_sec: number | null;
  elapsed_sec?: number | null;
  moving_sec?: number | null;
  distance_m: number | null;
  avg_speed_mps?: number | null;
  pace_min_per_km?: number | null;
  elevation_gain_m?: number | null;
  elevation_loss_m?: number | null;
  avg_hr?: number | null;
  max_hr?: number | null;
  calories_kcal?: number | null;
  steps?: number | null;
  avg_cadence?: number | null;
  vo2max?: number | null;
  aerobic_te?: number | null;
  location?: string | null;
  source: string;
}

interface UploadResult {
  total_processed: number;
  saved: number;
  duplicates_found_in_db?: number;
  skipped: number;
  maintenance?: {
    total_duplicates_removed?: number;
  };
  errors?: string[];
}

interface FloatingNotice {
  text: string;
  tone: 'success';
}

interface ApiResponseEnvelope<TData = unknown> {
  status?: string;
  message?: string;
  error?: string;
  data?: TData;
}

interface StatusApiEnvelope {
  status?: string;
  message?: string;
  error?: string;
  database?: {
    total_activities?: number;
    total_sync_logs?: number;
  };
}

const NO_STORE_GET = {
  cache: 'no-store' as const,
  headers: {
    'cache-control': 'no-cache',
  },
};

const MAX_UPLOAD_CHUNK_BYTES = 900_000;

function extractActivitiesForUpload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      if (item && typeof item === 'object') {
        const wrapper = item as { summarizedActivitiesExport?: unknown[] };
        if (Array.isArray(wrapper.summarizedActivitiesExport)) {
          return wrapper.summarizedActivitiesExport;
        }
      }
      return item !== null && typeof item === 'object' ? [item] : [];
    });
  }

  if (payload && typeof payload === 'object') {
    const wrapper = payload as { summarizedActivitiesExport?: unknown[] };
    if (Array.isArray(wrapper.summarizedActivitiesExport)) {
      return wrapper.summarizedActivitiesExport;
    }
    return [payload];
  }

  return [];
}

function toUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function splitActivitiesIntoChunks(activities: unknown[], maxChunkBytes: number): unknown[][] {
  const chunks: unknown[][] = [];
  let currentChunk: unknown[] = [];

  for (const activity of activities) {
    const candidate = [...currentChunk, activity];
    const candidateSize = toUtf8ByteLength(JSON.stringify(candidate));

    if (currentChunk.length > 0 && candidateSize > maxChunkBytes) {
      chunks.push(currentChunk);
      currentChunk = [activity];
      continue;
    }

    currentChunk = candidate;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [activities];
}

function buildServerErrorMessage(status: number, rawBody: string): string {
  const compactBody = rawBody.trim().replace(/\s+/g, ' ');
  const snippet = compactBody.slice(0, 180);
  return snippet.length > 0 ? `Errore server (${status}): ${snippet}` : `Errore server (${status})`;
}

async function parseApiEnvelope<TData = unknown>(response: Response): Promise<ApiResponseEnvelope<TData>> {
  const rawBody = await response.text();
  let envelope: ApiResponseEnvelope<TData> | null = null;

  if (rawBody.trim().length > 0) {
    try {
      envelope = JSON.parse(rawBody) as ApiResponseEnvelope<TData>;
    } catch {
      if (!response.ok) {
        throw new Error(buildServerErrorMessage(response.status, rawBody));
      }
      throw new Error('Risposta server non valida (JSON atteso)');
    }
  }

  if (!response.ok) {
    throw new Error(
      envelope?.message ||
      envelope?.error ||
      buildServerErrorMessage(response.status, rawBody)
    );
  }

  return envelope ?? {};
}

async function uploadGarminChunk(payload: unknown): Promise<UploadResult> {
  const response = await fetch('/api/activities/garmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const envelope = await parseApiEnvelope<UploadResult>(response);

  if (envelope.status !== 'success' || !envelope.data) {
    throw new Error(envelope.message || envelope.error || 'Errore import');
  }

  return envelope.data;
}

export default function DemoGarminPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [loadingDB, setLoadingDB] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ total_activities: number; total_sync_logs: number } | null>(null);
  const [dbMessage, setDbMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [manualMessage, setManualMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [floatingNotice, setFloatingNotice] = useState<FloatingNotice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'running',
    date: new Date().toISOString().split('T')[0],
    distance: 0,
    duration: 0,
  });
  const [filters, setFilters] = useState({
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    types: [] as string[],
    minDistance: undefined as number | undefined,
    maxDistance: undefined as number | undefined,
  });
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const showAdminDiagnostics = process.env.NODE_ENV !== 'production';

  const getActivityKey = (activity: Activity, idx: number): string => {
    if (activity._id) return `db-${activity._id}`;

    const composite = [
      activity.source || 'garmin',
      activity.source_id || '',
      activity.date || '',
      activity.name || '',
      activity.duration_sec ?? '',
      activity.distance_m ?? '',
    ].join('|');

    // Ultimo fallback per evitare collisioni in casi estremi di dati identici
    return composite !== 'garmin|||||' ? composite : `row-${idx}`;
  };

  // Test connessione database
  const handleTestConnection = async () => {
    setLoadingDB(true);
    setDbMessage(null);
    try {
      const res = await fetch('/api/test-db', NO_STORE_GET);
      const envelope = await parseApiEnvelope<{
        collections?: {
          activities?: number;
        };
      }>(res);
      if (envelope.status !== 'success' || !envelope.data) {
        throw new Error(envelope.message || envelope.error || 'Errore sconosciuto');
      }
      setDbMessage({ text: `✅ Connesso — Attività: ${envelope.data.collections?.activities ?? 0}`, ok: true });
    } catch (error) {
      setDbMessage({ text: `❌ ${error instanceof Error ? error.message : 'Errore connessione'}`, ok: false });
    } finally {
      setLoadingDB(false);
    }
  };

  // Verifica lo status del DB
  const handleCheckStatus = async () => {
    setLoadingDB(true);
    setDbMessage(null);
    try {
      const res = await fetch('/api/status', NO_STORE_GET);
      const envelope = await parseApiEnvelope<unknown>(res) as StatusApiEnvelope;
      const databasePayload = envelope.database;
      if (envelope.status !== 'success' || !databasePayload) {
        throw new Error(envelope.message || envelope.error || 'Errore sconosciuto');
      }
      setDbStatus({
        total_activities: databasePayload.total_activities ?? 0,
        total_sync_logs: databasePayload.total_sync_logs ?? 0,
      });
      setDbMessage({ text: '✅ Status aggiornato', ok: true });
    } catch (error) {
      setDbMessage({ text: `❌ ${error instanceof Error ? error.message : 'Errore status'}`, ok: false });
    } finally {
      setLoadingDB(false);
    }
  };

  // Carica le attività esistenti (silenzioso, nessun alert)
  const handleLoadActivities = useCallback(async (silent = false) => {
    setLoadingDB(true);
    if (!silent) setDbMessage(null);

    try {
      const res = await fetch('/api/activities/garmin', NO_STORE_GET);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Errore caricamento');

      const list: Activity[] = data.data.recent_activities || [];
      setActivities(list);
      setActivitiesTotal(
        typeof data?.data?.total_activities === 'number'
          ? data.data.total_activities
          : list.length
      );

      if (!silent) {
        setDbMessage({ text: `✅ ${data.data.total_activities} attività caricate`, ok: true });
      }
    } catch (error) {
      if (!silent) {
        setDbMessage({ text: `❌ ${error instanceof Error ? error.message : 'Errore caricamento'}`, ok: false });
      }
    } finally {
      setLoadingDB(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void handleLoadActivities(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [handleLoadActivities]);

  // Upload JSON Garmin
  const handleJSONUpload = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setUploadError('❌ Seleziona un file .json valido');
      return;
    }
    setLoadingUpload(true);
    setUploadResult(null);
    setUploadError(null);
    try {
      const text = await file.text();

      // Validazione del contenuto JSON
      const trimmedText = text.trim();
      if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
        throw new Error('File non è un JSON valido - Non inizia con { o [');
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : 'Errore parsing';
        // Fornisci info più specifiche sull'errore
        throw new Error(`JSON non valido: ${errorMsg}`);
      }

      const extractedActivities = extractActivitiesForUpload(json);
      const payloads: unknown[] =
        extractedActivities.length > 0
          ? splitActivitiesIntoChunks(extractedActivities, MAX_UPLOAD_CHUNK_BYTES)
          : [json];

      const aggregated: UploadResult = {
        total_processed: 0,
        saved: 0,
        duplicates_found_in_db: 0,
        skipped: 0,
        maintenance: {
          total_duplicates_removed: 0,
        },
        errors: [],
      };

      for (const payload of payloads) {
        const result = await uploadGarminChunk(payload);
        aggregated.total_processed += result.total_processed ?? 0;
        aggregated.saved += result.saved ?? 0;
        aggregated.duplicates_found_in_db =
          (aggregated.duplicates_found_in_db ?? 0) + (result.duplicates_found_in_db ?? 0);
        aggregated.skipped += result.skipped ?? 0;
        aggregated.maintenance = {
          total_duplicates_removed:
            (aggregated.maintenance?.total_duplicates_removed ?? 0) +
            (result.maintenance?.total_duplicates_removed ?? 0),
        };
        if (result.errors && result.errors.length > 0) {
          aggregated.errors = [...(aggregated.errors ?? []), ...result.errors];
        }
      }

      setUploadResult(aggregated);
      setIsUploadDialogOpen(false);
      const removed = aggregated.maintenance?.total_duplicates_removed;
      const duplicatesInDb = aggregated.duplicates_found_in_db ?? 0;
      const skipped = aggregated.skipped ?? 0;
      if ((typeof removed === 'number' && removed > 0) || skipped > 0 || duplicatesInDb > 0) {
        const totalDuplicates = (typeof removed === 'number' ? removed : 0) + skipped + duplicatesInDb;
        showFloatingNotice(`✅ Upload JSON: trovati/rimossi ${totalDuplicates} duplicati`);
      }
      // Aggiorna la lista silenziosamente
      const listRes = await fetch('/api/activities/garmin', NO_STORE_GET);
      const listData = await listRes.json();
      if (listRes.ok) {
        const list: Activity[] = listData.data.recent_activities || [];
        setActivities(list);
        setActivitiesTotal(
          typeof listData?.data?.total_activities === 'number'
            ? listData.data.total_activities
            : list.length
        );
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '❌ File JSON non valido o errore server');
    } finally {
      setLoadingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleJSONUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleJSONUpload(file);
  };

  // Aggiungi manualmente
  const handleAddManually = async () => {
    if (!formData.name || formData.distance <= 0 || formData.duration <= 0) {
      setManualMessage({ text: '❌ Compila tutti i campi obbligatori', ok: false });
      return;
    }
    setLoadingManual(true);
    setManualMessage(null);
    try {
      const fingerprintRaw = `${formData.date}_${formData.type}_${formData.distance}_${formData.duration}`;
      const fingerprint = Array.from(
        new TextEncoder().encode(fingerprintRaw)
      ).map(b => b.toString(16).padStart(2, '0')).join('');

      const activity = {
        activityName: formData.name,
        activityType: formData.type.toUpperCase(),
        startTime: new Date(formData.date).toISOString(),
        totalDistance: formData.distance,
        totalTimeInSeconds: formData.duration,
        source: 'manual',
        fingerprint,
      };

      const res = await fetch('/api/activities/garmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([activity]),
      });
      const envelope = await parseApiEnvelope<{
        saved?: number;
      }>(res);
      if (envelope.status !== 'success' || !envelope.data) {
        throw new Error(envelope.message || envelope.error || 'Errore salvataggio');
      }
      setManualMessage({ text: `✅ Attività aggiunta (${envelope.data.saved ?? 0} salvata)`, ok: true });
      setFormData({ name: '', type: 'running', date: new Date().toISOString().split('T')[0], distance: 0, duration: 0 });
      // Aggiorna lista silenziosamente
      const listRes = await fetch('/api/activities/garmin', NO_STORE_GET);
      const listData = await listRes.json();
      if (listRes.ok) {
        const list: Activity[] = listData.data.recent_activities || [];
        setActivities(list);
        setActivitiesTotal(
          typeof listData?.data?.total_activities === 'number'
            ? listData.data.total_activities
            : list.length
        );
      }
    } catch (error) {
      setManualMessage({ text: `❌ ${error instanceof Error ? error.message : 'Errore'}`, ok: false });
    } finally {
      setLoadingManual(false);
    }
  };

  const handlePBClick = (type: StatsType, activity: StatsActivity) => {
    const normalizedActivity: Activity = {
      _id: undefined,
      source_id: undefined,
      name: 'name' in activity && typeof activity.name === 'string' ? activity.name : 'Attivita',
      type: activity.type ?? 'unknown',
      date: activity.date ?? activity.originalDate ?? null,
      distance_m:
        activity.distance_m ??
        (typeof activity.distance_km === 'string' ? Number.parseFloat(activity.distance_km) * 1000 : null),
      duration_sec:
        activity.duration_sec ??
        (typeof activity.duration_min === 'number' ? Math.round(activity.duration_min * 60) : null),
      calories_kcal: 'calories_kcal' in activity ? (activity as Activity).calories_kcal ?? null : null,
      pace_min_per_km: 'pace_min_per_km' in activity ? (activity as Activity).pace_min_per_km ?? null : null,
      elevation_gain_m: 'elevation_gain_m' in activity ? (activity as Activity).elevation_gain_m ?? null : null,
      elevation_loss_m: 'elevation_loss_m' in activity ? (activity as Activity).elevation_loss_m ?? null : null,
      avg_hr: 'avg_hr' in activity ? (activity as Activity).avg_hr ?? null : null,
      max_hr: 'max_hr' in activity ? (activity as Activity).max_hr ?? null : null,
      steps: 'steps' in activity ? (activity as Activity).steps ?? null : null,
      avg_cadence: 'avg_cadence' in activity ? (activity as Activity).avg_cadence ?? null : null,
      vo2max: 'vo2max' in activity ? (activity as Activity).vo2max ?? null : null,
      aerobic_te: 'aerobic_te' in activity ? (activity as Activity).aerobic_te ?? null : null,
      location: 'location' in activity ? (activity as Activity).location ?? null : null,
      source: 'source' in activity && typeof activity.source === 'string' ? activity.source : 'garmin',
    };

    setSelectedActivity(normalizedActivity);
    // Scroll to the table
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showFloatingNotice(`📍 Navigato all'attività: ${normalizedActivity.name}`);
  };

  const showFloatingNotice = (text: string) => {
    setFloatingNotice({ text, tone: 'success' });
    window.setTimeout(() => {
      setFloatingNotice((current) => (current?.text === text ? null : current));
    }, 5000);
  };

  const formatDuration = (durationSec: number | null): string => {
    if (durationSec == null || durationSec < 0) return '—';

    const total = Math.floor(durationSec);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    if (total >= 3600) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${Math.floor(total / 60)}:${String(seconds).padStart(2, '0')}`;
  };

  const displayedActivitiesCount = activitiesTotal > 0 ? activitiesTotal : activities.length;

  return (
    <PageShell background="navy" className="p-8 dg-main-1" data-testid="dg-main-1">
      {floatingNotice && (
        <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg border border-green-500/40 bg-green-900/80 px-4 py-3 text-green-100 shadow-xl backdrop-blur dg-floating-notice-1" data-testid="dg-floating-notice-1">
          <div className="flex items-start gap-3">
            <p className="text-sm font-medium dg-floating-notice-text-1">{floatingNotice.text}</p>
            <button
              onClick={() => setFloatingNotice(null)}
              className="ml-auto rounded px-2 py-0.5 text-xs text-white/80 hover:bg-white/10 dg-floating-notice-close-1"
              data-testid="dg-floating-notice-close-1"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto dg-container-1">
        <h1 className="text-4xl font-bold text-white mb-2 dg-title-1" data-testid="dg-title-1">🏃 Activities Manager</h1>
        <p className="text-gray-300 mb-8 dg-subtitle-1" data-testid="dg-subtitle-1">Gestisci le tue attività di allenamento</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 dg-panels-grid-2" data-testid="dg-panels-grid-2">
          {/* Pannello Database Status */}
          <div className="bg-slate-700 rounded-lg p-6 shadow-xl dg-db-panel-2" data-testid="dg-db-panel-2">
            <h2 className="text-xl font-bold text-white mb-4 dg-db-title-2" data-testid="dg-db-title-2">🔗 Database Status</h2>
            {showAdminDiagnostics ? (
              <>
                <button
                  onClick={handleTestConnection}
                  disabled={loadingDB}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded transition dg-btn-test-conn-2"
                  data-testid="dg-btn-test-conn-2"
                >
                  {loadingDB ? '⏳ ...' : '🔌 Test Connection'}
                </button>
                <button
                  onClick={handleCheckStatus}
                  disabled={loadingDB}
                  className="w-full mt-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded transition dg-btn-status-2"
                  data-testid="dg-btn-status-2"
                >
                  {loadingDB ? '⏳ ...' : '📊 Check Status'}
                </button>
              </>
            ) : (
              <div className="rounded border border-slate-600 bg-slate-800 p-3 text-sm text-slate-200">
                Endpoint diagnostici admin protetti in produzione.
              </div>
            )}
            <button
              onClick={() => {
                setUploadError(null);
                setUploadResult(null);
                setIsUploadDialogOpen(true);
              }}
              disabled={loadingDB}
              className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded transition dg-btn-load-2"
              data-testid="dg-btn-load-2"
            >
              {loadingDB ? '⏳ ...' : '📋 Carica Attività'}
            </button>

            {/* Messaggio feedback DB */}
            {dbMessage && (
              <div className={`mt-3 p-3 rounded text-sm font-medium dg-message-2 ${dbMessage.ok ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`} data-testid={`dg-message-${dbMessage.ok ? 'success' : 'error'}-2`}>
                {dbMessage.text}
              </div>
            )}

            {/* Status dettagli */}
            {dbStatus && (
              <div className="mt-3 p-3 bg-slate-800 rounded text-sm text-white dg-status-detail-2" data-testid="dg-status-detail-2">
                <p className="font-semibold text-cyan-400 mb-1 dg-status-label-2">📊 DB Status:</p>
                <p data-testid="dg-status-activities-2">Attività: <span className="text-green-400 font-bold">{dbStatus.total_activities}</span></p>
                <p>Sync logs: <span className="text-green-400 font-bold">{dbStatus.total_sync_logs}</span></p>
              </div>
            )}
          </div>

          {/* Pannello Upload JSON Garmin */}
          <div className="bg-slate-700 rounded-lg p-6 shadow-xl dg-upload-panel-2" data-testid="dg-upload-panel-2">
            <h2 className="text-xl font-bold text-white mb-1 dg-upload-title-2" data-testid="dg-upload-title-2">📂 Importa JSON Garmin</h2>
            <p className="text-gray-400 text-sm mb-4 dg-upload-hint-2" data-testid="dg-upload-hint-2">
              Esporta da Garmin Connect → <strong>Formato JSON</strong> e carica qui
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors dg-drop-zone-2 ${
                dragOver ? 'border-blue-400 bg-blue-900/30' : 'border-slate-500 hover:border-blue-500 hover:bg-slate-600'
              }`}
              data-testid="dg-drop-zone-2"
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-white font-semibold mb-1">Trascina il file JSON qui</p>
              <p className="text-gray-400 text-sm">oppure clicca per selezionare</p>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" data-testid="dg-file-input-2" />
            </div>

            {loadingUpload && (
              <div className="mt-4 p-3 bg-slate-800 rounded text-center text-yellow-300 text-sm animate-pulse dg-upload-loading-2" data-testid="dg-upload-loading-2">
                ⏳ Importazione in corso...
              </div>
            )}
            {uploadResult && !loadingUpload && (
              <div className="mt-4 p-4 bg-green-900/50 border border-green-600 rounded text-sm text-white dg-upload-success-2" data-testid="dg-upload-success-2">
                <p className="font-bold text-green-400 mb-1">✅ Import completato!</p>
                <p>📦 Processate: <strong>{uploadResult.total_processed}</strong></p>
                <p>✅ Salvate: <strong className="text-green-400">{uploadResult.saved}</strong></p>
                <p>
                  ⏭️ Saltate (duplicati):{' '}
                  <strong className="text-yellow-400">
                    {(uploadResult.skipped ?? 0) +
                      (uploadResult.duplicates_found_in_db ?? 0) +
                      (uploadResult.maintenance?.total_duplicates_removed ?? 0)}
                  </strong>
                </p>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-400 font-semibold">Errori:</p>
                    {uploadResult.errors.map((e, i) => <p key={i} className="text-red-300 text-xs">{e}</p>)}
                  </div>
                )}
              </div>
            )}
            {uploadError && !loadingUpload && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-600 rounded text-sm text-red-300 dg-upload-error-2" data-testid="dg-upload-error-2">
                {uploadError}
              </div>
            )}
          </div>
        </div>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="border-slate-700 bg-slate-800 text-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>📂 Importa JSON Garmin</DialogTitle>
              <DialogDescription className="text-slate-300">
                Esporta da Garmin Connect in formato JSON, poi trascina il file qui o clicca per selezionarlo.
              </DialogDescription>
            </DialogHeader>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors dg-drop-zone-modal-2 ${
                dragOver ? 'border-blue-400 bg-blue-900/30' : 'border-slate-500 hover:border-blue-500 hover:bg-slate-700'
              }`}
              data-testid="dg-drop-zone-modal-2"
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-white font-semibold mb-1">Trascina il file JSON qui</p>
              <p className="text-gray-400 text-sm">oppure clicca per selezionare</p>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" data-testid="dg-file-input-2" />
            </div>

            {loadingUpload && (
              <div className="mt-2 rounded bg-slate-900 p-3 text-center text-sm text-yellow-300">
                ⏳ Importazione in corso...
              </div>
            )}
            {uploadResult && !loadingUpload && (
              <div className="mt-2 rounded border border-green-600 bg-green-900/50 p-4 text-sm text-white">
                <p className="mb-1 font-bold text-green-400">✅ Import completato!</p>
                <p>📦 Processate: <strong>{uploadResult.total_processed}</strong></p>
                <p>✅ Salvate: <strong className="text-green-400">{uploadResult.saved}</strong></p>
                <p>
                  ⏭️ Saltate (duplicati):{' '}
                  <strong className="text-yellow-400">
                    {(uploadResult.skipped ?? 0) +
                      (uploadResult.duplicates_found_in_db ?? 0) +
                      (uploadResult.maintenance?.total_duplicates_removed ?? 0)}
                  </strong>
                </p>
              </div>
            )}
            {uploadError && !loadingUpload && (
              <div className="mt-2 rounded border border-red-600 bg-red-900/50 p-3 text-sm text-red-300">
                {uploadError}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Pannello Aggiungi Manualmente */}
        <div className="bg-slate-700 rounded-lg p-6 shadow-xl mb-8 dg-manual-panel-3" data-testid="dg-manual-panel-3">
          <h2 className="text-xl font-bold text-white mb-4 dg-manual-title-3" data-testid="dg-manual-title-3">➕ Aggiungi Manualmente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 dg-form-grid-3">
            <input type="text" placeholder="Nome attività *" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-800 text-white p-2 rounded border border-slate-600 text-sm dg-form-input-3" data-testid="dg-form-name-3" />
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="bg-slate-800 text-white p-2 rounded border border-slate-600 text-sm dg-form-select-3" data-testid="dg-form-type-3">
              <option value="running">🏃 Running</option>
              <option value="cycling">🚴 Cycling</option>
              <option value="hiking">🥾 Hiking</option>
              <option value="walking">🚶 Walking</option>
            </select>
            <input type="date" value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="bg-slate-800 text-white p-2 rounded border border-slate-600 text-sm dg-form-input-3" data-testid="dg-form-date-3" />
            <input type="number" placeholder="Distanza (m) *" value={formData.distance || ''}
              onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) })}
              className="bg-slate-800 text-white p-2 rounded border border-slate-600 text-sm dg-form-input-3" data-testid="dg-form-distance-3" />
            <input type="number" placeholder="Durata (secondi) *" value={formData.duration || ''}
              onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) })}
              className="bg-slate-800 text-white p-2 rounded border border-slate-600 text-sm dg-form-input-3" data-testid="dg-form-duration-3" />
            <button onClick={handleAddManually} disabled={loadingManual}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded transition text-sm dg-form-btn-3"
              data-testid="dg-form-btn-3">
              {loadingManual ? '⏳ Aggiunta...' : '➕ Aggiungi'}
            </button>
          </div>
          {manualMessage && (
            <div className={`mt-3 p-3 rounded text-sm font-medium dg-manual-message-3 ${manualMessage.ok ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`} data-testid={`dg-manual-message-${manualMessage.ok ? 'success' : 'error'}-3`}>
              {manualMessage.text}
            </div>
          )}
        </div>

        {/* Lista Attività */}
        <div className="bg-slate-700 rounded-lg p-6 shadow-xl dg-activities-panel-4" data-testid="dg-activities-panel-4">
          <div className="flex items-center justify-between mb-4 dg-activities-header-4">
            <h2 className="text-2xl font-bold text-white dg-activities-title-4" data-testid="dg-activities-title-4">📋 Attività ({displayedActivitiesCount})</h2>
            <button onClick={() => void handleLoadActivities()} disabled={loadingDB}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded text-sm transition dg-activities-refresh-4"
              data-testid="dg-activities-refresh-4">
              {loadingDB ? '⏳' : '🔄 Aggiorna'}
            </button>
          </div>
          <div className="overflow-x-auto dg-activities-table-4" ref={tableRef} data-testid="dg-activities-table-4">
            <table className="w-full text-white text-sm dg-table-4">
              <thead className="border-b border-slate-600">
                <tr>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Data</th>
                  <th className="text-right p-2">Distanza (km)</th>
                  <th className="text-right p-2">Durata (min)</th>
                  <th className="text-right p-2">Passo (min/km)</th>
                  <th className="text-right p-2">Dislivello+ (m)</th>
                  <th className="text-right p-2">FC media</th>
                  <th className="text-right p-2">Calorie (kcal)</th>
                  <th className="text-left p-2">Luogo</th>
                  <th className="text-left p-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center p-8 text-gray-400 dg-table-empty-4">
                      Nessuna attività — clicca <strong>🔄 Aggiorna</strong> o importa un file JSON
                    </td>
                  </tr>
                ) : (
                  activities.map((activity, idx) => {
                    const distKm = activity.distance_m != null ? (activity.distance_m / 1000).toFixed(2) : '—';
                    const durMin = formatDuration(activity.duration_sec);
                    const pace = activity.pace_min_per_km != null
                      ? Math.floor(activity.pace_min_per_km) + ':' + String(Math.round((activity.pace_min_per_km % 1) * 60)).padStart(2, '0')
                      : '—';
                    const dateStr = activity.date ? new Date(activity.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }) : '—';
                    return (
                    <tr key={getActivityKey(activity, idx)} className={`border-b border-slate-600 hover:bg-slate-600 dg-table-row-4 ${selectedActivity && getActivityKey(activity, idx) === getActivityKey(selectedActivity, activities.indexOf(selectedActivity)) ? 'bg-yellow-600' : ''}`} data-testid={`dg-table-row-${activity._id || idx}-4`}>
                      <td className="p-2 font-medium">{activity.name}</td>
                      <td className="p-2 capitalize">{activity.type}</td>
                      <td className="p-2">{dateStr}</td>
                      <td className="text-right p-2">{distKm}</td>
                      <td className="text-right p-2">{durMin}</td>
                      <td className="text-right p-2">{pace}</td>
                      <td className="text-right p-2">{activity.elevation_gain_m != null ? activity.elevation_gain_m.toFixed(1) : '—'}</td>
                      <td className="text-right p-2">{activity.avg_hr ?? '—'}</td>
                      <td className="text-right p-2">{activity.calories_kcal ?? '—'}</td>
                      <td className="p-2 text-gray-300">{activity.location ?? '—'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          activity.source === 'garmin' ? 'bg-blue-700 text-blue-100' :
                          activity.source === 'strava' ? 'bg-orange-700 text-orange-100' :
                          'bg-gray-600 text-gray-200'
                        }`}>
                          {activity.source}
                        </span>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sezione Statistiche */}
        <div className="bg-slate-700 rounded-lg p-6 shadow-xl mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">📊 Statistiche Attività</h2>

          {/* Filtri */}
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Filtri</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="dateFrom" className="text-white">Da data</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value ? new Date(e.target.value) : undefined }))}
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </div>
              <div>
                <Label htmlFor="dateTo" className="text-white">A data</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value ? new Date(e.target.value) : undefined }))}
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </div>
              <div>
                <Label htmlFor="types" className="text-white">Tipo</Label>
                <Select
                  value={filters.types.join(',')}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, types: value ? value.split(',') : [] }))}
                >
                  <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                    <SelectValue placeholder="Seleziona tipi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="cycling">Cycling</SelectItem>
                    <SelectItem value="hiking">Hiking</SelectItem>
                    <SelectItem value="walking">Walking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="minDistance" className="text-white">Distanza min (m)</Label>
                <Input
                  id="minDistance"
                  type="number"
                  value={filters.minDistance || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minDistance: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </div>
              <div>
                <Label htmlFor="maxDistance" className="text-white">Distanza max (m)</Label>
                <Input
                  id="maxDistance"
                  type="number"
                  value={filters.maxDistance || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="destructive"
                  onClick={() => setFilters({
                  dateFrom: undefined,
                  dateTo: undefined,
                  types: [],
                  minDistance: undefined,
                  maxDistance: undefined,
                  })}
                >
                  Reset Filtri
                </Button>
              </div>
            </div>
          </div>

          {/* Statistiche */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatsCard type="total_runs" activities={activities} filters={filters} dataName="stats-total-runs" />
            <StatsCard type="pb_100" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-pb-100" />
            <StatsCard type="pb_200" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-pb-200" />
            <StatsCard type="pb_400" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-pb-400" />
            <StatsCard type="pb_1000" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-pb-1000" />
            <StatsCard type="pb_2000" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-pb-2000" />
            <StatsCard type="pb_5000" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-pb-5000" />
            <StatsCard type="pb_10000" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-pb-10000" />
            <StatsCard type="pb_21000" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-pb-21000" />
            <StatsCard type="longest_run" activities={activities} filters={filters} onPBClick={handlePBClick} dataName="stats-longest-run" />
            <StatsCard type="total_distance" activities={activities} filters={filters} dataName="stats-total-distance" />
            <StatsCard type="total_hours" activities={activities} filters={filters} dataName="stats-total-hours" />
          </div>
        </div>

      </div>
    </PageShell>
  );
}
