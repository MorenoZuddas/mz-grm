'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/generic';

type SyncMode = 'latest' | 'all';

interface SyncResult {
  total_processed: number;
  unique_processed: number;
  saved: number;
  duplicates_found_in_db: number;
  skipped: number;
  activities: Array<Record<string, unknown>>;
  maintenance?: {
    total_duplicates_removed?: number;
  };
  errors?: string[];
}

function formatDateTime(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('it-IT');
  }
  return '—';
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

interface SyncEnvelope {
  status?: string;
  message?: string;
  error?: string;
  data?: SyncResult;
}

export default function DemoGarminSyncPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<SyncMode>('latest');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !loading;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setResult(null);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/activities/garmin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          credentials: {
            username: username.trim(),
            password: password.trim(),
          },
        }),
      });

      const payload = (await response.json()) as SyncEnvelope;
      if (!response.ok || payload.status !== 'success' || !payload.data) {
        throw new Error(payload.message || payload.error || 'Sync Garmin non riuscita');
      }

      setResult(payload.data);
      setMessage(payload.message || 'Sync Garmin completata');
      setPassword('');
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Errore imprevisto durante la sync Garmin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell background="navy" className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="space-y-2">
          <Link href="/demo-garmin" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Torna a demo Garmin
          </Link>
          <h1 className="text-3xl font-bold text-white">Garmin Sync Bridge Demo</h1>
          <p className="text-sm text-slate-300">
            Inserisci credenziali Garmin solo per una sync one-shot. Le credenziali non vengono salvate nel database.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-700 bg-slate-800/90 p-6 shadow-xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Garmin username
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Garmin password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Modalità sync
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value === 'all' ? 'all' : 'latest')}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                <option value="latest">Latest</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {loading ? '⏳ Sync in corso...' : 'Avvia sync Garmin'}
            </button>
            <span className="text-xs text-slate-400">Richiede GarminDB installato nel sistema o un `GARMIN_DB_CLI_PATH` valido.</span>
          </div>

          {message ? (
            <div className="mt-4 rounded-md border border-green-700 bg-green-900/40 px-4 py-3 text-sm text-green-200">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-md border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </form>

        {result ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-6 shadow-xl text-sm text-slate-200">
              <h2 className="mb-3 text-xl font-semibold text-white">Esito sync</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <p>Processate: <strong>{result.total_processed}</strong></p>
                <p>Uniche: <strong>{result.unique_processed}</strong></p>
                <p>Salvate: <strong>{result.saved}</strong></p>
                <p>Duplicati DB: <strong>{result.duplicates_found_in_db}</strong></p>
                <p>Saltate: <strong>{result.skipped}</strong></p>
                <p>Duplicati rimossi: <strong>{result.maintenance?.total_duplicates_removed ?? 0}</strong></p>
              </div>

              {result.errors && result.errors.length > 0 ? (
                <div className="mt-4">
                  <h3 className="mb-2 font-semibold text-red-300">Errori</h3>
                  <div className="space-y-1 text-xs text-red-200">
                    {result.errors.map((entry, index) => (
                      <p key={`${entry}-${index}`}>{entry}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-6 shadow-xl text-sm text-slate-200">
              <h2 className="mb-3 text-xl font-semibold text-white">Attività recuperate</h2>
              <p className="mb-4 text-xs text-slate-400">
                La tabella mostra i campi principali restituiti dal bridge. Sotto trovi anche il payload completo raw.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1600px] text-left text-xs">
                  <thead className="border-b border-slate-700 text-slate-300">
                    <tr>
                      <th className="p-2">ID</th>
                      <th className="p-2">Nome</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Data</th>
                      <th className="p-2 text-right">Distanza</th>
                      <th className="p-2 text-right">Durata</th>
                      <th className="p-2 text-right">Tempo in movimento</th>
                      <th className="p-2 text-right">Velocità media</th>
                      <th className="p-2 text-right">Velocità max</th>
                      <th className="p-2 text-right">Calorie</th>
                      <th className="p-2 text-right">Dislivello+</th>
                      <th className="p-2 text-right">Dislivello-</th>
                      <th className="p-2 text-right">FC media</th>
                      <th className="p-2 text-right">FC max</th>
                      <th className="p-2 text-right">Cadenza</th>
                      <th className="p-2 text-right">Passo falcata</th>
                      <th className="p-2 text-right">VO2max</th>
                      <th className="p-2">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.activities.map((activity, index) => {
                      const activityId =
                        typeof activity.activityId === 'number' || typeof activity.activityId === 'string'
                          ? String(activity.activityId)
                          : '—';
                      const name =
                        typeof activity.activityName === 'string'
                          ? activity.activityName
                          : typeof activity.name === 'string'
                            ? activity.name
                            : 'Attività Garmin';
                      const type =
                        typeof activity.activityType === 'string'
                          ? activity.activityType
                          : typeof activity.sportType === 'string'
                            ? activity.sportType
                            : '—';
                      const date =
                        activity.startTime || activity.startTimeLocal || activity.beginTimestamp || activity.date;
                      const distance = activity.totalDistance ?? activity.distance ?? activity.distance_m;
                      const duration = activity.totalTimeInSeconds ?? activity.duration ?? activity.duration_sec;
                      const movingTime = activity.movingDuration ?? activity.moving_time ?? activity.moving_sec;
                      const avgSpeed = activity.averageSpeed ?? activity.avgSpeed ?? activity.avg_speed_mps;
                      const maxSpeed = activity.maxSpeed ?? activity.max_speed_mps;
                      const calories = activity.calories ?? activity.calories_kcal;
                      const elevationGain = activity.elevationGain ?? activity.elevation_gain_m;
                      const elevationLoss = activity.elevationLoss ?? activity.elevation_loss_m;
                      const avgHr = activity.avgHr ?? activity.avg_heart_rate ?? activity.avg_hr;
                      const maxHr = activity.maxHr ?? activity.max_heart_rate ?? activity.max_hr;
                      const cadence = activity.avgRunCadence ?? activity.avgDoubleCadence ?? activity.avg_cadence;
                      const stride = activity.avgStrideLength ?? activity.avg_stride_length_m;
                      const vo2max = activity.vO2MaxValue ?? activity.vo2max;
                      const location = activity.locationName ?? activity.location ?? activity.description;

                      return (
                        <tr key={`${activityId}-${index}`} className="border-b border-slate-800 align-top">
                          <td className="p-2">{activityId}</td>
                          <td className="p-2">{name}</td>
                          <td className="p-2">{type}</td>
                          <td className="p-2">{formatDateTime(date)}</td>
                          <td className="p-2 text-right">{valueToString(distance)}</td>
                          <td className="p-2 text-right">{valueToString(duration)}</td>
                          <td className="p-2 text-right">{valueToString(movingTime)}</td>
                          <td className="p-2 text-right">{valueToString(avgSpeed)}</td>
                          <td className="p-2 text-right">{valueToString(maxSpeed)}</td>
                          <td className="p-2 text-right">{valueToString(calories)}</td>
                          <td className="p-2 text-right">{valueToString(elevationGain)}</td>
                          <td className="p-2 text-right">{valueToString(elevationLoss)}</td>
                          <td className="p-2 text-right">{valueToString(avgHr)}</td>
                          <td className="p-2 text-right">{valueToString(maxHr)}</td>
                          <td className="p-2 text-right">{valueToString(cadence)}</td>
                          <td className="p-2 text-right">{valueToString(stride)}</td>
                          <td className="p-2 text-right">{valueToString(vo2max)}</td>
                          <td className="p-2">{valueToString(location)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl">
              <h2 className="mb-3 text-xl font-semibold text-white">Payload raw completo</h2>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">
                {JSON.stringify(result.activities, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
