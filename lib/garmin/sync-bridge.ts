import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir, homedir } from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { connectToDatabase } from '@/lib/db/connection';
import { Activity } from '@/lib/db/models/Activity';
import { SyncLog } from '@/lib/db/models/SyncLog';
import { convertGarminRaw, type GarminRawActivity } from '@/lib/garmin/converter';
import { removeDuplicateActivitiesNow } from '@/lib/db/maintenance';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

interface GarminBridgeConfig {
  username: string;
  password: string;
  pythonUserSite?: string;
  timeoutMs: number;
  latestActivities: number;
  allActivities: number;
  metric: boolean;
  baseDirName: string;
}

export interface GarminOneShotCredentials {
  username: string;
  password: string;
}

export interface GarminBridgeResult {
  total_processed: number;
  unique_processed: number;
  saved: number;
  duplicates_found_in_db: number;
  skipped: number;
  activities: GarminRawActivity[];
  maintenance: {
    duplicates_removed_before_import: number;
    duplicates_removed_after_import: number;
    total_duplicates_removed: number;
  };
  errors?: string[];
}

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBridgeConfig(credentials?: GarminOneShotCredentials): GarminBridgeConfig {
  const username = credentials?.username.trim() || process.env.GARMIN_USERNAME?.trim();
  const password = credentials?.password.trim() || process.env.GARMIN_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error('Credenziali Garmin mancanti: passa username/password one-shot o imposta GARMIN_USERNAME e GARMIN_PASSWORD lato server');
  }

  return {
    username,
    password,
    pythonUserSite: process.env.GARMIN_PYTHON_USER_SITE?.trim() || path.join(homedir(), 'Library', 'Python', '3.14', 'lib', 'python', 'site-packages'),
    timeoutMs: parsePositiveInt(process.env.GARMIN_TIMEOUT_MS, 120_000),
    latestActivities: parsePositiveInt(process.env.GARMIN_DOWNLOAD_LATEST_ACTIVITIES, 50),
    allActivities: parsePositiveInt(process.env.GARMIN_DOWNLOAD_ALL_ACTIVITIES, 1000),
    metric: process.env.GARMIN_METRIC === 'true',
    baseDirName: process.env.GARMIN_DB_BASE_DIR?.trim() || 'HealthData',
  };
}

function buildFingerprint(raw: GarminRawActivity): string {
  const converted = convertGarminRaw(raw);
  const data = [
    converted.date?.toISOString() ?? '',
    converted.type,
    Math.round(converted.distance_m ?? 0),
    Math.round(converted.duration_sec ?? 0),
  ].join('_');
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function runGarminPythonExport(
  mode: 'latest' | 'all',
  config: GarminBridgeConfig,
  tempRoot: string
): Promise<GarminRawActivity[]> {
  const scriptPath = path.join(tempRoot, 'garmindb-bridge.py');
  const outputPath = path.join(tempRoot, 'activities.json');
  const tokenStorePath = path.join(tempRoot, '.GarminDb', 'garmin_tokens.json');

  const script = `
import json
import os
from garminconnect import Garmin

username = os.environ["GARMIN_BRIDGE_USERNAME"]
password = os.environ["GARMIN_BRIDGE_PASSWORD"]
tokenstore = os.environ["GARMIN_BRIDGE_TOKENSTORE"]
output_path = os.environ["GARMIN_BRIDGE_OUTPUT"]
limit = int(os.environ["GARMIN_BRIDGE_LIMIT"])

client = Garmin(email=username, password=password, is_cn=False)
mfa_status, _ = client.login(tokenstore)
if mfa_status:
    raise RuntimeError(f"MFA_REQUIRED:{mfa_status}")

activities = client.get_activities(0, limit)

with open(output_path, "w", encoding="utf-8") as fh:
    json.dump(activities, fh, ensure_ascii=False)
`;

  await writeFile(scriptPath, script, 'utf8');
  const limit = mode === 'latest' ? config.latestActivities : config.allActivities;

  try {
    await execFileAsync('python3', [scriptPath], {
      cwd: tempRoot,
      timeout: config.timeoutMs,
      env: {
        ...process.env,
        HOME: tempRoot,
        PYTHONPATH: config.pythonUserSite,
        GARMIN_BRIDGE_USERNAME: config.username,
        GARMIN_BRIDGE_PASSWORD: config.password,
        GARMIN_BRIDGE_TOKENSTORE: tokenStorePath,
        GARMIN_BRIDGE_OUTPUT: outputPath,
        GARMIN_BRIDGE_LIMIT: String(limit),
      },
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const failure = error as Error & { stderr?: string; stdout?: string };
    const stderr = failure.stderr?.trim();
    const stdout = failure.stdout?.trim();
    const message = stderr || stdout || failure.message || 'Unknown Garmin bridge error';
    if (message.includes('MFA_REQUIRED:')) {
      throw new Error('Garmin richiede MFA/2FA per questo login. Il flusso one-shot attuale non può completare la challenge interattiva.');
    }
    throw new Error(`Download Garmin fallito: ${message}`);
  }

  const raw = await readFile(outputPath, 'utf8');
  return JSON.parse(raw) as GarminRawActivity[];
}

async function runGarminDbImport(tempRoot: string, config: GarminBridgeConfig): Promise<void> {
  const garminHome = path.join(tempRoot, '.GarminDb');
  const configPath = path.join(garminHome, 'GarminConnectConfig.json');
  const activitiesDir = path.join(tempRoot, config.baseDirName, 'FitFiles', 'Activities');

  await mkdir(activitiesDir, { recursive: true });
  await mkdir(garminHome, { recursive: true });

  const cfg = {
    db: { type: 'sqlite' },
    garmin: { domain: 'garmin.com' },
    credentials: {
      user: config.username,
      secure_password: false,
      password: config.password,
      password_file: null,
    },
    data: {
      weight_start_date: '01/01/2020',
      sleep_start_date: '01/01/2020',
      rhr_start_date: '01/01/2020',
      hrv_start_date: '01/01/2020',
      monitoring_start_date: '01/01/2020',
      download_latest_activities: config.latestActivities,
      download_all_activities: config.allActivities,
    },
    directories: {
      relative_to_home: true,
      base_dir: config.baseDirName,
      mount_dir: '/Volumes/GARMIN',
    },
    enabled_stats: {
      monitoring: false,
      steps: false,
      itime: false,
      sleep: false,
      rhr: false,
      hrv: false,
      weight: false,
      activities: true,
    },
    course_views: { steps: [] },
    modes: {},
    activities: { display: [] },
    settings: {
      metric: config.metric,
      default_display_activities: ['walking', 'running', 'cycling'],
    },
    checkup: { look_back_days: 90 },
  };

  await writeFile(configPath, JSON.stringify(cfg, null, 2), 'utf8');

  const rawActivities = JSON.parse(await readFile(path.join(tempRoot, 'activities.json'), 'utf8')) as GarminRawActivity[];

  for (const activity of rawActivities) {
    if (typeof activity.activityId !== 'number') {
      continue;
    }
    const filePath = path.join(activitiesDir, `activity_${activity.activityId}.json`);
    await writeFile(filePath, JSON.stringify(activity), 'utf8');
  }

  const cliPath = path.join(homedir(), 'Library', 'Python', '3.14', 'bin', 'garmindb_cli.py');
  await execFileAsync('python3', [cliPath, '-f', garminHome, '--activities', '--import', '--latest'], {
    cwd: tempRoot,
    timeout: config.timeoutMs,
    env: {
      ...process.env,
      HOME: tempRoot,
      PYTHONPATH: config.pythonUserSite,
    },
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function runGarminExport(mode: 'latest' | 'all', credentials?: GarminOneShotCredentials): Promise<GarminRawActivity[]> {
  const config = getBridgeConfig(credentials);
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'mz-garmindb-'));

  try {
    const activities = await runGarminPythonExport(mode, config, tempRoot);
    await runGarminDbImport(tempRoot, config);
    return activities;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function syncGarminFromBridge(
  mode: 'latest' | 'all' = 'latest',
  credentials?: GarminOneShotCredentials
): Promise<GarminBridgeResult> {
  await connectToDatabase();
  const preCleanup = await removeDuplicateActivitiesNow();
  const rawActivities = await runGarminExport(mode, credentials);

  if (rawActivities.length === 0) {
    throw new Error('Garmin non ha restituito attività da importare');
  }

  const seen = new Set<string>();
  const uniqueActivities: GarminRawActivity[] = [];
  let skippedInPayload = 0;

  for (const raw of rawActivities) {
    const converted = convertGarminRaw(raw);
    const fp = buildFingerprint(raw);
    const dedupKey =
      converted.source_id && !converted.source_id.startsWith('garmin_')
        ? `sid:${converted.source_id}`
        : `fp:${fp}`;

    if (seen.has(dedupKey)) {
      skippedInPayload++;
      continue;
    }

    seen.add(dedupKey);
    uniqueActivities.push(raw);
  }

  const syncLog = await SyncLog.create({
    source: 'garmin',
    status: 'started',
    activities_fetched: uniqueActivities.length,
  });

  let saved = 0;
  let skipped = skippedInPayload;
  let duplicatesFoundInDb = 0;
  const errors: string[] = [];

  try {
    for (const raw of uniqueActivities) {
      try {
        const converted = convertGarminRaw(raw);
        const fp = buildFingerprint(raw);
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
              description: converted.location ?? undefined,
              raw_payload: raw,
              synced_at: new Date(),
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
      } catch (error) {
        skipped++;
        errors.push(`${raw.name ?? raw.activityId ?? '?'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await SyncLog.findByIdAndUpdate(syncLog._id, {
      status: 'completed',
      activities_saved: saved,
      activities_skipped: skipped,
      last_sync_timestamp: new Date(),
      details: {
        mode,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    await SyncLog.findByIdAndUpdate(syncLog._id, {
      status: 'failed',
      activities_saved: saved,
      activities_skipped: skipped,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        mode,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
    throw error;
  }

  const postCleanup = await removeDuplicateActivitiesNow();

  return {
    total_processed: rawActivities.length,
    unique_processed: uniqueActivities.length,
    saved,
    duplicates_found_in_db: duplicatesFoundInDb,
    skipped,
    activities: uniqueActivities,
    maintenance: {
      duplicates_removed_before_import: preCleanup.removedDuplicates,
      duplicates_removed_after_import: postCleanup.removedDuplicates,
      total_duplicates_removed: preCleanup.removedDuplicates + postCleanup.removedDuplicates,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}
