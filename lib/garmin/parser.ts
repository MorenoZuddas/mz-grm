import crypto from 'crypto';

export interface GarminActivityJSON {
  activityName?: string;
  name?: string;
  activityType?: string;
  sportType?: string;
  activityId?: string | number;
  startTime?: string;
  startTimeGmt?: number;
  startTimeLocal?: number;
  beginTimestamp?: number;
  endTime?: string;
  endTimestamp?: number;
  totalDistance?: number;
  distance?: number;
  totalTimeInSeconds?: number;
  movingTimeInSeconds?: number;
  duration?: number;
  movingDuration?: number;
  maxSpeed?: number;
  avgSpeed?: number;
  averageSpeed?: number;
  calories?: number;
  elevationGain?: number;
  elevationLoss?: number;
  device?: {
    display?: string;
    model?: string;
  };
  manufacturer?: string;
  [key: string]: unknown;
}

export interface ParsedActivity {
  name: string;
  type: string;
  date: Date;
  distance: number;
  duration: number;
  moving_time?: number;
  avg_speed?: number;
  max_speed?: number;
  elevation_gain?: number;
  elevation_loss?: number;
  calories?: number;
  device_info?: {
    name?: string;
    model?: string;
  };
  source: 'garmin';
  source_id: string;
  fingerprint: string;
}

interface GarminActivitiesWrapper {
  summarizedActivitiesExport?: GarminActivityJSON[];
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function normalizeActivityType(rawType?: string): string {
  if (!rawType) return 'unknown';

  const normalized = rawType.trim().toUpperCase();
  const typeMap: Record<string, string> = {
    RUNNING: 'running',
    CYCLING: 'cycling',
    WALKING: 'walking',
    HIKING: 'hiking',
    SWIMMING: 'swimming',
    STRENGTH_TRAINING: 'strength',
    FITNESS_EQUIPMENT: 'strength',
    YOGA: 'yoga',
    ELLIPTICAL: 'elliptical',
    STAIR_CLIMBING: 'stairs',
    TRAIL_RUNNING: 'running',
  };

  if (typeMap[normalized]) {
    return typeMap[normalized];
  }

  return rawType.toLowerCase();
}

function parseActivityDate(jsonData: GarminActivityJSON): Date {
  if (jsonData.startTime) {
    const parsed = new Date(jsonData.startTime);
    if (isValidDate(parsed)) return parsed;
  }

  const timestamp =
    toNumber(jsonData.startTimeLocal) ??
    toNumber(jsonData.startTimeGmt) ??
    toNumber(jsonData.beginTimestamp);

  if (timestamp !== undefined) {
    const parsed = new Date(timestamp);
    if (isValidDate(parsed)) return parsed;
  }

  throw new Error('Data attività non valida o mancante');
}

function parseDurationSeconds(jsonData: GarminActivityJSON): number {
  const seconds = toNumber(jsonData.totalTimeInSeconds);
  if (seconds !== undefined) {
    return seconds;
  }

  const ms = toNumber(jsonData.duration);
  if (ms !== undefined) {
    return ms / 1000;
  }

  return 0;
}

function parseMovingSeconds(jsonData: GarminActivityJSON): number | undefined {
  const seconds = toNumber(jsonData.movingTimeInSeconds);
  if (seconds !== undefined) {
    return seconds;
  }

  const ms = toNumber(jsonData.movingDuration);
  if (ms !== undefined) {
    return ms / 1000;
  }

  return undefined;
}

function parseDistanceMeters(jsonData: GarminActivityJSON, durationSec: number): number {
  const totalDistance = toNumber(jsonData.totalDistance);
  if (totalDistance !== undefined) {
    const speedAssumingMeters = durationSec > 0 ? totalDistance / durationSec : 0;
    const shouldConvertCm = speedAssumingMeters > 25 || totalDistance > 1_000_000;
    return shouldConvertCm ? totalDistance / 100 : totalDistance;
  }

  const rawDistance = toNumber(jsonData.distance);
  if (rawDistance === undefined) {
    return 0;
  }

  const speedAssumingMeters = durationSec > 0 ? rawDistance / durationSec : 0;
  const shouldConvertCm = speedAssumingMeters > 25 || rawDistance > 1_000_000;

  return shouldConvertCm ? rawDistance / 100 : rawDistance;
}

function parseSpeedMps(rawSpeed?: number): number | undefined {
  if (rawSpeed === undefined) return undefined;

  // Nel JSON Garmin locale la velocita' e' spesso in cm/ms (0.29 => 2.9 m/s)
  if (rawSpeed > 0 && rawSpeed < 2) {
    return rawSpeed * 10;
  }

  return rawSpeed;
}

function parseElevationMeters(rawElevation?: number): number | undefined {
  if (rawElevation === undefined) return undefined;

  // Nel JSON Garmin locale elevazione in cm
  return rawElevation / 100;
}

function parseCalories(jsonData: GarminActivityJSON): number | undefined {
  const calories = toNumber(jsonData.calories);
  if (calories === undefined) return undefined;

  // Nel JSON Garmin export le calorie sono gia' in kcal — nessuna conversione necessaria.
  return Math.round(calories);
}

function extractGarminActivities(payload: unknown): GarminActivityJSON[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      const wrapper = item as GarminActivitiesWrapper;
      if (wrapper && Array.isArray(wrapper.summarizedActivitiesExport)) {
        return wrapper.summarizedActivitiesExport;
      }

      if (item && typeof item === 'object') {
        return [item as GarminActivityJSON];
      }

      return [];
    });
  }

  if (payload && typeof payload === 'object') {
    const wrapper = payload as GarminActivitiesWrapper;
    if (Array.isArray(wrapper.summarizedActivitiesExport)) {
      return wrapper.summarizedActivitiesExport;
    }

    return [payload as GarminActivityJSON];
  }

  return [];
}

/**
 * Parsing file JSON da Garmin (esportazione locale)
 */
export function parseGarminJSON(jsonData: GarminActivityJSON): ParsedActivity {
  const date = parseActivityDate(jsonData);
  const duration = parseDurationSeconds(jsonData);
  const moving_time = parseMovingSeconds(jsonData);
  const distance = parseDistanceMeters(jsonData, duration);

  const type = normalizeActivityType(jsonData.activityType || jsonData.sportType);

  const avg_speed = parseSpeedMps(toNumber(jsonData.averageSpeed) ?? toNumber(jsonData.avgSpeed));
  const max_speed = parseSpeedMps(toNumber(jsonData.maxSpeed));

  const elevation_gain = parseElevationMeters(toNumber(jsonData.elevationGain));
  const elevation_loss = parseElevationMeters(toNumber(jsonData.elevationLoss));

  const calories = parseCalories(jsonData);

  const device_info = jsonData.device
    ? {
        name: jsonData.device.display,
        model: jsonData.device.model || (typeof jsonData.manufacturer === 'string' ? jsonData.manufacturer : undefined),
      }
    : undefined;

  const source_id = String(jsonData.activityId || `garmin_${date.getTime()}`);
  const name = jsonData.activityName || jsonData.name || 'Attività Garmin';

  const fingerprintData = `${date.toISOString()}_${type}_${Math.round(distance)}_${Math.round(duration)}`;
  const fingerprint = crypto.createHash('sha256').update(fingerprintData).digest('hex');

  return {
    name,
    type,
    date,
    distance,
    duration,
    moving_time,
    avg_speed,
    max_speed,
    elevation_gain,
    elevation_loss,
    calories,
    device_info,
    source: 'garmin',
    source_id,
    fingerprint,
  };
}

/**
 * Parsing array/payload Garmin con supporto wrapper summarizedActivitiesExport
 */
export function parseGarminJSONArray(jsonArray: GarminActivityJSON[]): ParsedActivity[] {
  return extractGarminActivities(jsonArray)
    .map((activity) => {
      try {
        return parseGarminJSON(activity);
      } catch {
        return null;
      }
    })
    .filter((activity): activity is ParsedActivity => activity !== null);
}

/**
 * Parsing payload Garmin generico
 */
export function parseGarminPayload(payload: unknown): ParsedActivity[] {
  return extractGarminActivities(payload)
    .map((activity) => {
      try {
        return parseGarminJSON(activity);
      } catch {
        return null;
      }
    })
    .filter((activity): activity is ParsedActivity => activity !== null);
}

/**
 * Leggi file JSON e parsalo
 */
export async function parseGarminJSONFile(
  fileContent: string
): Promise<ParsedActivity | ParsedActivity[]> {
  const jsonData: unknown = JSON.parse(fileContent);

  if (Array.isArray(jsonData) || (jsonData && typeof jsonData === 'object')) {
    const parsed = parseGarminPayload(jsonData);
    return parsed.length === 1 ? parsed[0] : parsed;
  }

  throw new Error('Formato JSON Garmin non valido');
}
