"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackpackIcon } from '@/components/Icons';
import { ActivityDetailModal } from '@/components/ActivityDetailModal';
import { CardGrid, Divider, PageShell, type CardGridItem } from '@/components/generic';
import { getCachedActivities, setCachedActivities } from '@/lib/cache/activities';

interface ApiPhoto {
  activityId: number;
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
}

interface GarminApiActivity {
  _id?: string;
  name: string;
  type: string;
  date: string | null;
  distance_m: number | null;
  duration_sec: number | null;
  calories_kcal?: number | null;
  location?: string | null;
  photo?: ApiPhoto | null;
}

interface GarminSummary {
  total_count?: number;
  total_distance_m?: number;
  longest_distance_m?: number;
  locations_count?: number;
}

interface GarminApiResponse {
  status?: string;
  data?: {
    recent_activities?: GarminApiActivity[];
    summary?: GarminSummary;
    global_summary?: GarminSummary;
    filtered_summary?: GarminSummary;
  };
}

interface Activity {
  id: string;
  name: string;
  type: string;
  date: string;
  originalDate: string;
  distance_km: string;
  distance_formatted: string;
  duration_min: number;
  duration_formatted: string;
  calories_kcal: number;
  location?: string;
  photo?: ApiPhoto | null;
}

function formatDistance(distanceM: number | null): string {
  if (!distanceM) return '—';
  const km = distanceM / 1000;
  return km < 10 ? `${Math.round(distanceM).toLocaleString('it-IT')} m` : `${km.toFixed(2)} km`;
}

function formatDurationFromSeconds(durationSec: number): string {
  const total = Math.max(0, Math.floor(durationSec));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (total >= 3600) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function safeTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

const relatedExplorationCards: CardGridItem[] = [
  {
    id: 'exp-overview',
    title: 'Exploration',
    description: 'Panoramica generale',
    href: '/exploration',
    image: 'https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777467395/pexels-davideibiza-9385860_yvrxlv.jpg',
  },
  {
    id: 'exp-running-mini',
    title: 'Running',
    description: 'Road to Marathon',
    href: '/exploration/running',
    image: 'https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/running_Large_zorzw2.jpg',
  },
  {
    id: 'exp-trips-mini',
    title: 'Trips',
    description: 'Viaggi ed esperienze',
    href: '/exploration/trips',
    image: 'https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/trips_exvdmu.avif',
  },
];

export default function TrekkingPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // summary = filtrato; globalSummary = totale trekking invariante (hero statico)
  const [summary, setSummary] = useState<GarminSummary | null>(null);
  const [globalSummary, setGlobalSummary] = useState<GarminSummary | null>(null);

  // Determina se desktop
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const frame = window.requestAnimationFrame(() => setIsDesktop(mediaQuery.matches));
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const handleActivityClick = (activityId: string) => {
    if (isDesktop) {
      setSelectedActivityId(activityId);
    } else {
      router.push(`/exploration/trekking/${activityId}`);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;

    const fetchActivities = async () => {
      const cached = getCachedActivities<Activity[]>('trekking');

      if (cached && cached.length > 0) {
        if (isActive) {
          setActivities(cached);
          setLoading(false);
        }
      }

      try {
        const response = await fetch('/api/activities/garmin?group=trekking&limit=20&offset=0', {
          signal: abortController.signal,
        });
        if (!response.ok) {
          const raw = await response.text();
          console.error('GET /api/activities/garmin failed', response.status, raw);
          throw new Error('Impossibile caricare le attività trekking in questo momento.');
        }

        const data: GarminApiResponse = await response.json();
        if (data.status === 'success') {
          const source: GarminApiActivity[] = data?.data?.recent_activities ?? [];

          const trekkingActivities = source
            .map((act, index) => ({
              id: act._id ?? `${act.name}-${act.date}-${act.distance_m}-${index}`,
              name: act.name,
              type: act.type,
              date: new Date(act.date || 0).toLocaleDateString('it-IT'),
              originalDate: act.date || '',
              distance_km: ((act.distance_m ?? 0) / 1000).toFixed(2),
              distance_formatted: formatDistance(act.distance_m),
              duration_min: Math.round((act.duration_sec ?? 0) / 60),
              duration_formatted: formatDurationFromSeconds(act.duration_sec ?? 0),
              calories_kcal: act.calories_kcal ?? 0,
              location: act.location ?? undefined,
              photo: act.photo ?? null,
            }))
            .sort((a: Activity, b: Activity) => safeTimestamp(b.originalDate) - safeTimestamp(a.originalDate));

          if (!isActive) {
            return;
          }

          setActivities(trekkingActivities);
          const gs = data?.data?.global_summary ?? data?.data?.summary ?? null;
          const fs = data?.data?.filtered_summary ?? data?.data?.summary ?? null;
          if (gs) setGlobalSummary(gs);
          setSummary(fs);
          setCachedActivities(trekkingActivities, 'trekking');
          setError(null);
          return;
        }

        throw new Error('Formato risposta API non valido.');
      } catch (fetchError) {
        if ((fetchError instanceof Error && fetchError.name === 'AbortError') || !isActive) {
          return;
        }

        console.error('Error fetching activities:', fetchError);

        if (cached && cached.length > 0) {
          setActivities(cached);
          setSummary(null);
          setError('Connessione instabile: sto mostrando dati recenti dalla cache.');
        } else {
          setError('Impossibile caricare le attività trekking.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchActivities();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, []);

  const heroStats = useMemo(() => {
    // Usa sempre globalSummary (totale trekking, invariante ai filtri) per l'hero
    const totalCount = typeof globalSummary?.total_count === 'number' ? globalSummary.total_count : activities.length;
    const totalDistanceM = typeof globalSummary?.total_distance_m === 'number'
      ? globalSummary.total_distance_m
      : activities.reduce((sum, activity) => sum + Number.parseFloat(activity.distance_km) * 1000, 0);
    const longestDistanceM = typeof globalSummary?.longest_distance_m === 'number'
      ? globalSummary.longest_distance_m
      : activities.reduce((max, activity) => Math.max(max, Number.parseFloat(activity.distance_km) * 1000), 0);
    const uniqueLocations = new Set(
      activities
        .map((activity) => activity.location?.trim())
        .filter((location): location is string => Boolean(location))
    );
    const locationsCount = typeof globalSummary?.locations_count === 'number' ? globalSummary.locations_count : uniqueLocations.size;

    return {
      count: totalCount,
      totalKm: totalDistanceM >= 1_000_000 ? `${(totalDistanceM / 1_000_000).toFixed(1)}k km` : `${Math.round(totalDistanceM / 1000)} km`,
      longestKm: `${(longestDistanceM / 1000).toFixed(1)} km`,
      locations: String(locationsCount),
    };
  }, [activities, globalSummary]);

  const activityGridItems = useMemo<CardGridItem[]>(
    () =>
      activities.map((activity) => ({
        id: activity.id,
        title: activity.name,
        href: `/exploration/trekking/${activity.id}`,
        hasPhoto: Boolean(activity.photo),
        type: 'trekking',
        date: activity.date,
        distance: activity.distance_formatted,
        duration: activity.duration_formatted,
      })),
    [activities]
  );

  return (
    <PageShell background="sky" className="trek-main-1" data-testid="trek-main-1">
      <section className="relative w-full h-[34vh] sm:h-[38vh] overflow-hidden trek-hero-2" data-testid="trek-hero-2">
        <Image
          src="https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/trekking_h2lev5.jpg"
          alt="Trekking hero"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-105 trek-hero-background-2"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/15 trek-hero-overlay-2" />

        <Link
          href="/exploration"
          className="absolute top-6 left-6 sm:left-10 hidden sm:inline-flex items-center gap-1.5 text-white hover:text-white text-sm font-medium transition z-10 trek-back-link-2"
          data-testid="trek-back-link-2"
        >
          ← Exploration
        </Link>

        <Link
          href="/exploration/trekking/equipment"
          className="absolute top-6 right-6 sm:right-10 hidden sm:inline-flex items-center gap-1.5 text-white/75 hover:text-white text-sm font-medium transition z-10 trek-equipment-link-2"
          data-testid="trek-equipment-link-2"
        >
          Attrezzatura <BackpackIcon className="h-4 w-4" />
        </Link>

        <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-7 sm:px-10 sm:pb-8 trek-hero-content-2" data-testid="trek-hero-content-2">
          <div className="w-full max-w-2xl space-y-2 mb-5 text-center trek-hero-text-2" data-testid="trek-hero-text-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight trek-title-2" data-testid="trek-title-2">
              Trekking
            </h1>
            <p className="text-sm sm:text-base text-white/85 max-w-xl mx-auto trek-description-2" data-testid="trek-description-2">
              I miei percorsi trekking e le escursioni principali, con numeri e dettagli utili.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-md w-full max-w-sm sm:max-w-3xl mx-auto trek-stats-bar-2" data-testid="trek-stats-bar-2">
            {[
              { label: 'Attività', mobileLabel: 'Attività', value: loading ? '…' : String(heroStats.count), testId: 'count', hideOnMobile: true },
              { label: 'Tot. distanza', mobileLabel: 'Tot. distanza', value: loading ? '…' : heroStats.totalKm, testId: 'total-distance', hideOnMobile: true },
              { label: 'Trekking più lungo', mobileLabel: 'Trekking più lungo', value: loading ? '…' : heroStats.longestKm, testId: 'longest', hideOnMobile: false },
              { label: 'Località', mobileLabel: 'Località', value: loading ? '…' : heroStats.locations, testId: 'locations', hideOnMobile: false },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-0.5 trek-stat-item-2 ${stat.hideOnMobile ? 'hidden sm:flex' : 'flex'}`}
                data-testid={`trek-stat-${stat.testId}-2`}
              >
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.08em] sm:tracking-widest text-white/55 font-semibold trek-stat-label-2">
                  <span className="sm:hidden">{stat.mobileLabel}</span>
                  <span className="hidden sm:inline">{stat.label}</span>
                </span>
                <span className="text-lg sm:text-xl font-bold text-white leading-none trek-stat-value-2">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pt-6 pb-10 sm:px-6 lg:px-8 trek-activities-3" data-testid="trek-activities-3">
        <div className="max-w-6xl mx-auto trek-activities-container-3">
          {error && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200 trek-error-3" data-testid="trek-error-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="trek-activities-skeleton-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`trek-skeleton-${index}`} className="rounded-xl border border-slate-300/80 bg-white p-4 dark:border-slate-500/90 dark:border-2 dark:bg-slate-950/40">
                  <div className="animate-pulse space-y-3">
                    <div className="h-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CardGrid
              variant="activity"
              title="Attività recenti"
              subtitle={`${typeof summary?.total_count === 'number' ? summary.total_count : activities.length} attività`}
              items={activityGridItems}
              columnsClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              sectionClassName="px-0 py-0 bg-transparent"
              cardClassName="border-slate-300/80 bg-white dark:border-slate-500/90 dark:border-2 dark:bg-slate-950/40"
              useMotion={false}
              showDate
              showTypeBadge={false}
              visibleItems={8}
              showVisibilityToggle
              showMoreLabel="Mostra altre attività"
              showLessLabel="Mostra meno"
              showMoreTone="current"
              showLessTone="current"
              visibilityToggleClassName="[&_button.cardgrid-show-less]:border [&_button.cardgrid-show-less]:border-slate-900 [&_button.cardgrid-show-less]:bg-white [&_button.cardgrid-show-less]:text-slate-900 [&_button.cardgrid-show-less]:hover:bg-slate-100 [&_button.cardgrid-show-less]:dark:border-slate-900 [&_button.cardgrid-show-less]:dark:bg-white [&_button.cardgrid-show-less]:dark:text-slate-900 [&_button.cardgrid-show-less]:dark:hover:bg-slate-100"
              activityPhotoBadgePosition="border"
              activityPhotoBadgeSize="medium"
              activityPhotoBadgeRounded={false}
              activityTextColor="black"
              onItemClick={(item) => handleActivityClick(item.id)}
              data-testid="trek-activities-grid-3"
            />
          )}

          {!loading && activities.length === 0 && (
            <div className="mt-6 rounded-xl border border-slate-300/80 dark:border-slate-700 bg-sky-100/70 dark:bg-slate-900/80 p-8 text-center trek-empty-state-3" data-testid="trek-empty-state-3">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Nessuna attività trekking trovata</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Sezione Attrezzatura ─── */}
      <section className="px-4 pb-6 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">La mia attrezzatura</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Zaini, bastoncini e accessori</p>
            </div>
            <Link
              href="/exploration/trekking/equipment"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium hover:bg-black dark:hover:bg-slate-600 transition-colors"
            >
              Attrezzatura
              <BackpackIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Divider tone="blue" size="sm" data-testid="trek-divider-4" />

      <CardGrid
        title="Categorie"
        subtitle="Continua l'esplorazione"
        items={relatedExplorationCards}
        showTypeBadge={false}
        showDate={false}
        showDescription={true}
        columnsClassName="grid grid-cols-1 sm:grid-cols-3 gap-4"
        sectionClassName="px-4 pt-2 pb-8 sm:px-6 lg:px-8"
        containerClassName="max-w-6xl"
        titleColor="current"
        subtitleColor="current"
        cardClassName="border-slate-300/80 bg-white dark:border-slate-500/90 dark:border-2 dark:bg-slate-950/40"
        useMotion={false}
        showVisibilityToggle={false}
        data-testid="trek-related-categories-5"
      />

      {selectedActivityId && (
        <ActivityDetailModal
          activityId={selectedActivityId}
          isOpen={true}
          onClose={() => setSelectedActivityId(null)}
          detailsPageUrl={`/exploration/trekking/${selectedActivityId}`}
          photo={activities.find((a) => a.id === selectedActivityId)?.photo ?? null}
          data-testid="trek-activity-modal-4"
        />
      )}
    </PageShell>
  );
}
