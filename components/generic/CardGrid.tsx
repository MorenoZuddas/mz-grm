'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ButtonTone } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BadgeChip } from '@/components/BadgeChip';
import type { BadgeChipType } from '@/components/BadgeChip';
import type { BadgeChipSize } from '@/components/BadgeChip';
import {
  ActivityIcon as Activity,
  Code2Icon as Code2,
  CpuIcon as Cpu,
  ExternalLinkIcon as ExternalLink,
  HeartHandshakeIcon as HeartHandshake,
  LightbulbIcon as Lightbulb,
  MailIcon as Mail,
  NetworkIcon as Network,
  PlaneIcon as Plane,
  PuzzleIcon as Puzzle,
  SmartphoneIcon as Smartphone,
  UsersIcon as Users,
  type LucideIcon,
} from '@/components/Icons';

export type CardGridType = 'running' | 'track_running' | 'trekking' | 'trip';
export type CardGridColor = 'current' | 'blue' | 'purple' | 'black';
export type CardGridVariant = 'default' | 'activity' | 'flip-card';
export type CardGridTitlePosition = 'left' | 'center' | 'right';
export type CardGridOrientation = 'horizontal' | 'vertical';
export type CardHeightVariant = 'small' | 'medium' | 'large';
export type FlipCardWidthVariant = 'small' | 'medium' | 'large';
export type FlipCardColumns = 1 | 2 | 3 | 4;
export type CardGridIconName =
  | 'Code2'
  | 'Smartphone'
  | 'Cpu'
  | 'Network'
  | 'Users'
  | 'Activity'
  | 'Plane'
  | 'Lightbulb'
  | 'Puzzle'
  | 'Mail'
  | 'HeartHandshake'
  | 'Github'
  | 'Linkedin'
  | 'ExternalLink';

export interface CardGridItem {
  id: string;
  title: string;
  href: string;
  category?: string;
  image?: string;
  type?: CardGridType;
  date?: string;
  description?: string;
  distance?: string;
  duration?: string;
  pace?: string;
  kcal?: string;
  hasPhoto?: boolean; // Se true, mostra il badge "Photo" sulla card activity
  icon?: LucideIcon; // Per flip-card variant
  iconName?: CardGridIconName; // Nome serializzabile icona per flip-card (server -> client safe)
  flipCardTone?: string; // Colore esplicito per flip-card: 'blue'|'purple'|'pear'|'crimson'|'navy'|'black'
}

export interface CardGridSortOption {
  value: string;
  label: string;
}

interface CardGridProps {
   variant?: CardGridVariant;
   title?: string;
   subtitle?: string;
   items?: CardGridItem[];
   className?: string;
   containerClassName?: string;
   gridClassName?: string;
   cardClassName?: string;
   imageClassName?: string;
   columnsClassName?: string;
   fallbackImage?: string;
   showTypeBadge?: boolean;
   showBadgeOnImage?: boolean;
   showDate?: boolean;
   showDescription?: boolean;
   useMotion?: boolean;
   visibleItems?: number;
   showVisibilityToggle?: boolean;
   showMoreLabel?: string;
   showLessLabel?: string;
   visibilityToggleClassName?: string;
   showMoreTone?: ButtonTone;
   showLessTone?: ButtonTone;
   sortOptions?: CardGridSortOption[];
   sortValue?: string;
   onSortChange?: (value: string) => void;
   sortLabel?: string;
   showItemsCount?: boolean;
   itemsCountLabel?: string;
   tone?: CardGridColor;
   headerColor?: CardGridColor; // Colore unico per title e subtitle (vanno di pari passo)
   sectionClassName?: string;
   titleColor?: CardGridColor;
   subtitleColor?: CardGridColor;
   titlePosition?: CardGridTitlePosition;
   onItemClick?: (item: CardGridItem) => void;
   maxCards?: number;
   activityPhotoBadgePosition?: 'border' | 'date-row'; // 'border' = fuori dal bordo card, 'date-row' = a destra della data
   activityPhotoBadgeSize?: BadgeChipSize;
   activityPhotoBadgeRounded?: boolean;
   activityTextColor?: CardGridColor;
   // Flip-card specific props
   flipCardOrientation?: CardGridOrientation;
   flipCardImageSrc?: string;
   flipCardImageAlt?: string;
   flipCardWidth?: FlipCardWidthVariant;
    flipCardColumns?: FlipCardColumns;
    flipCardCenterIncompleteRow?: boolean;
   // Card height variants
   cardHeight?: CardHeightVariant;
   onLoadMore?: () => void;
   isLoadingMore?: boolean;
   paginationResetKey?: string;
}

const defaultItems: CardGridItem[] = [
  {
    id: 'running-25k',
    title: '25k Collinari',
    type: 'running',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80',
    date: '22 Mar 2026',
    href: '/exploration/running/22257187842',
  },
  {
    id: 'trekking-recent',
    title: 'Tre Cime Trek',
    type: 'trekking',
    image: 'https://images.pexels.com/photos/355465/pexels-photo-355465.jpeg?auto=compress&cs=tinysrgb&w=800',
    date: '15 Mar 2026',
    href: '/exploration/trekking',
  },
  {
    id: 'trips-generic',
    title: 'Barcellona Weekend',
    type: 'trip',
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
    date: '10 Mar 2026',
    href: '/exploration/trips',
  },
];

const textColorVariants: Record<CardGridColor, { title: string; subtitle: string }> = {
  current: {
    title:    'text-[var(--color-tone-current-title)]',
    subtitle: 'text-[var(--color-tone-current-subtitle)]',
  },
  blue: {
    title:    'text-[var(--color-tone-blue-title)]',
    subtitle: 'text-[var(--color-tone-blue-subtitle)]',
  },
  purple: {
    title:    'text-[var(--color-tone-purple-title)]',
    subtitle: 'text-[var(--color-tone-purple-subtitle)]',
  },
  black: {
    title:    'text-[var(--color-tone-black-title)]',
    subtitle: 'text-[var(--color-tone-black-subtitle)]',
  },
};

const activityTextVariants: Record<CardGridColor, { title: string; date: string; label: string; value: string }> = {
  current: {
    title: 'text-[var(--color-tone-current-title)]',
    date:  'text-[var(--color-tone-current-subtitle)]',
    label: 'text-[var(--color-tone-current-subtitle)]',
    value: 'text-[var(--color-tone-current-title)]',
  },
  blue: {
    title: 'text-[var(--color-tone-blue-title)]',
    date:  'text-[var(--color-tone-blue-subtitle)]',
    label: 'text-[var(--color-tone-blue-subtitle)]',
    value: 'text-[var(--color-tone-blue-title)]',
  },
  purple: {
    title: 'text-[var(--color-tone-purple-title)]',
    date:  'text-[var(--color-tone-purple-subtitle)]',
    label: 'text-[var(--color-tone-purple-subtitle)]',
    value: 'text-[var(--color-tone-purple-title)]',
  },
  black: {
    title: 'text-[var(--color-tone-black-title)]',
    date:  'text-[var(--color-tone-black-subtitle)]',
    label: 'text-[var(--color-tone-black-subtitle)]',
    value: 'text-[var(--color-tone-black-title)]',
  },
};

function toBadgeType(type?: CardGridType): BadgeChipType | null {
  if (!type) return null;
  if (type === 'track_running') return 'running';
  if (type === 'running' || type === 'trekking' || type === 'trip') return type;
  return null;
}

const toneClasses: Record<string, string> = {
   current: 'bg-card text-card-foreground border-card',
   blue: 'bg-[var(--color-comp-tone-blue-bg)] text-[var(--color-comp-tone-blue-text)] border-[var(--color-comp-tone-blue-border)]',
   purple: 'bg-[var(--color-comp-tone-purple-bg)] text-[var(--color-comp-tone-purple-text)] border-[var(--color-comp-tone-purple-border)]',
   black: 'bg-[var(--color-role-surface-strong)] text-[var(--color-role-text-inverse)] border-slate-700',
   navy: 'bg-[var(--color-comp-tone-navy-bg)] text-[var(--color-comp-tone-navy-text)] border-[var(--color-comp-tone-navy-border)]',
   crimson: 'bg-[var(--color-comp-tone-crimson-bg)] text-[var(--color-comp-tone-crimson-text)] border-[var(--color-comp-tone-crimson-border)]',
   pear: 'bg-[var(--color-comp-tone-pear-bg)] text-[var(--color-comp-tone-pear-text)] border-[var(--color-comp-tone-pear-border)]',
};

const flipCardPaletteClasses = [
  'bg-[var(--color-comp-tone-blue-bg)] text-[var(--color-comp-tone-blue-text)] border-[var(--color-comp-tone-blue-border)]',
  'bg-[var(--color-comp-tone-purple-bg)] text-[var(--color-comp-tone-purple-text)] border-[var(--color-comp-tone-purple-border)]',
  'bg-[var(--color-comp-tone-pear-bg)] text-[var(--color-comp-tone-pear-text)] border-[var(--color-comp-tone-pear-border)]',
  'bg-[var(--color-comp-tone-crimson-bg)] text-[var(--color-comp-tone-crimson-text)] border-[var(--color-comp-tone-crimson-border)]',
  'bg-[var(--color-comp-tone-navy-bg)] text-[var(--color-comp-tone-navy-text)] border-[var(--color-comp-tone-navy-border)]',
];

const flipCardToneMap: Record<string, string> = {
  blue:    flipCardPaletteClasses[0],
  purple:  flipCardPaletteClasses[1],
  pear:    flipCardPaletteClasses[2],
  crimson: flipCardPaletteClasses[3],
  navy:    flipCardPaletteClasses[4],
  current: toneClasses.current,
  black:   toneClasses.black,
};

function getFlipCardToneClass(tone?: string, fallbackIndex?: number): string {
  if (tone && flipCardToneMap[tone]) return flipCardToneMap[tone];
  const idx = (fallbackIndex ?? 0) % flipCardPaletteClasses.length;
  return flipCardPaletteClasses[idx];
}

// Solo il colore del bordo per il lato frontale (immagine) della flip-card
const flipCardToneBorderColorMap: Record<string, string> = {
  blue:    'var(--color-comp-tone-blue-border)',
  purple:  'var(--color-comp-tone-purple-border)',
  pear:    'var(--color-comp-tone-pear-border)',
  crimson: 'var(--color-comp-tone-crimson-border)',
  navy:    'var(--color-comp-tone-navy-border)',
  current: 'var(--color-comp-cardgrid-card-border)',
  black:   '#334155',
};

const flipCardPaletteBorderColors = [
  'var(--color-comp-tone-blue-border)',
  'var(--color-comp-tone-purple-border)',
  'var(--color-comp-tone-pear-border)',
  'var(--color-comp-tone-crimson-border)',
  'var(--color-comp-tone-navy-border)',
];

function getFlipCardFrontBorderColor(tone?: string, fallbackIndex?: number): string {
  if (tone && flipCardToneBorderColorMap[tone]) return flipCardToneBorderColorMap[tone];
  const idx = (fallbackIndex ?? 0) % flipCardPaletteBorderColors.length;
  return flipCardPaletteBorderColors[idx];
}

const flipCardIconMap: Record<CardGridIconName, LucideIcon> = {
   Activity,
   Code2,
   Cpu,
   HeartHandshake,
   Network,
   Smartphone,
   Lightbulb,
   Mail,
   Plane,
   Puzzle,
   Users,
   Github: Code2,
   Linkedin: Smartphone,
   ExternalLink,
};

function resolveFlipCardIcon(name?: CardGridIconName): LucideIcon {
  if (!name) return ExternalLink;
  return flipCardIconMap[name] ?? ExternalLink;
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia('(min-width: 768px)');
      const handler = () => onStoreChange();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false
  );
}

// cardHeight per default e flip-card (non usato da activity)
const cardHeightVariants: Record<CardHeightVariant, { image: string; flipCard: string }> = {
   small: {
     image:    'h-36',
     flipCard:  'h-32 sm:h-36',
   },
   medium: {
     image:    'h-48',
     flipCard:  'h-36 sm:h-40',
   },
   large: {
     image:    'h-60',
     flipCard:  'h-40 sm:h-44',
   },
};

// Larghezza flip-card su desktop: small ~50%, medium ~75%, large 100%
const flipCardWidthVariants: Record<FlipCardWidthVariant, string> = {
  small: 'w-full md:w-1/2',
  medium: 'w-full md:w-3/4',
  large: 'w-full',
};

const flipCardGridColSpan: Record<FlipCardColumns, number> = {
  1: 12,
  2: 6,
  3: 4,
  4: 3,
};

const flipCardGridSpanClass: Record<FlipCardColumns, string> = {
  1: 'md:col-span-12',
  2: 'md:col-span-6',
  3: 'md:col-span-4',
  4: 'md:col-span-3',
};

function FlipCard({
   item,
   imageSrc,
   imageAlt,
   useMosaicImage,
   totalItems,
   columns,
   index,
   heightClass,
   widthClass,
   backToneClass,
   frontBorderColor,
}: {
   item: { id: string; title: string; description: string; icon: LucideIcon; category?: string };
   imageSrc: string;
   imageAlt?: string;
   useMosaicImage: boolean;
   totalItems: number;
   columns: number;
   index: number;
   heightClass: string;
   widthClass: string;
   backToneClass: string;
   frontBorderColor: string;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isDesktop = useIsDesktop();
  const Icon = item.icon;


  const col = index % columns;
  const row = Math.floor(index / columns);
  const bgPositionX = `${-(col * 100)}%`;
  const bgPositionY = `${-(row * 100)}%`;
  const rows = Math.ceil(totalItems / columns);

  // Mobile/tablet (<768px): card piatta come default, nessun flip
  if (!isDesktop) {
    return (
      <div className={`${widthClass} mx-auto rounded-xl border p-3 flex flex-col gap-1.5 shadow-sm ${backToneClass}`}>
        {item.category ? (
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{item.category}</p>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4 opacity-90 shrink-0" aria-hidden="true" />
          <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
        </div>
        <p className="text-xs leading-snug opacity-90">{item.description}</p>
      </div>
    );
  }

  return (
    <div
      className={`${widthClass} ${heightClass} mx-auto cursor-pointer perspective`}
      onMouseEnter={() => setIsFlipped(true)}
      onClick={() => setIsFlipped((prev) => !prev)}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={`${item.title} - ${isFlipped ? 'dettagli' : 'mostra dettagli'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsFlipped(!isFlipped);
        }
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
         <div
           className="absolute w-full h-full rounded-xl overflow-hidden border-2"
           style={{
             backfaceVisibility: 'hidden',
             borderColor: frontBorderColor,
             boxShadow: `0 4px 18px -2px ${frontBorderColor}99, 0 0 0 0 transparent`,
           }}
         >
           <div
             className="w-full h-full bg-cover bg-center"
             style={{
               backgroundImage: `url('${imageSrc}')`,
                // Mosaico solo con immagine globale condivisa; con immagine per-card usiamo cover piena.
                backgroundPosition: useMosaicImage ? `${bgPositionX} ${bgPositionY}` : 'center',
                backgroundSize: useMosaicImage ? `${columns * 100}% ${rows * 100}%` : 'cover',
             }}
             role="img"
             aria-label={imageAlt || item.title}
           />
          <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
        </div>

        <div
          className={`absolute w-full h-full rounded-xl border p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm ${backToneClass}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {item.category ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{item.category}</p>
          ) : null}
          <div className="mt-1 flex items-center gap-1.5 justify-center">
            <Icon className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden="true" />
            <h3 className="text-sm sm:text-base font-semibold leading-tight">{item.title}</h3>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm leading-snug opacity-95 overflow-visible">{item.description}</p>
        </div>
      </div>
    </div>
  );
}

export function CardGrid({
   variant = 'default',
   title = 'Ultime Avventure',
   subtitle = 'I momenti piu recenti dalle mie attivita',
   items = defaultItems,
   className = '',
   containerClassName = '',
   gridClassName = '',
   cardClassName = '',
   imageClassName = '',
   columnsClassName = 'grid grid-cols-1 md:grid-cols-3 gap-6',
   fallbackImage = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
   showTypeBadge = true,
   showBadgeOnImage = false,
   showDate = true,
   showDescription = false,
   useMotion = true,
   visibleItems,
   showVisibilityToggle = true,
   showMoreLabel = 'Mostra tutte',
   showLessLabel = 'Mostra meno',
   visibilityToggleClassName = '',
   showMoreTone = 'navy',
   showLessTone = 'transparent-white',
   sortOptions,
   sortValue,
   onSortChange,
   sortLabel = 'Sort by',
   showItemsCount = false,
   itemsCountLabel = 'attività',
   tone,
   headerColor,
   sectionClassName = 'px-4 pt-8 pb-8 sm:px-6 lg:px-8',
   titleColor = 'current',
   subtitleColor = 'current',
   titlePosition = 'left',
   onItemClick,
   maxCards,
   activityPhotoBadgePosition = 'border',
   activityPhotoBadgeSize = 'medium',
   activityPhotoBadgeRounded = false,
   activityTextColor = 'current',
   flipCardOrientation = 'horizontal',
   flipCardImageSrc = '',
   flipCardImageAlt = '',
   flipCardWidth = 'large',
   flipCardColumns,
   flipCardCenterIncompleteRow = false,
   cardHeight = 'medium',
   onLoadMore,
   isLoadingMore = false,
   paginationResetKey = 'default',
}: CardGridProps) {
   const resolvedTitleColor = headerColor ?? (tone ?? titleColor);
   const resolvedSubtitleColor = headerColor ?? (tone ?? subtitleColor);
   const titleColorClass = textColorVariants[resolvedTitleColor].title;
   const subtitleColorClass = textColorVariants[resolvedSubtitleColor].subtitle;
   const activityTextStyle = activityTextVariants[activityTextColor];
   const normalizedVisibleItems =
     typeof visibleItems === 'number' && Number.isFinite(visibleItems) && visibleItems > 0
       ? Math.floor(visibleItems)
       : null;

   const resolvedGridClass = columnsClassName;
   const cardHeightClass = cardHeightVariants[cardHeight];
   const flipCardWidthClass = flipCardWidthVariants[flipCardWidth];

   const orientationDefaultColumns: FlipCardColumns = flipCardOrientation === 'vertical' ? 1 : 3;
   const resolvedFlipCardColumns = flipCardColumns ?? orientationDefaultColumns;
   const flipCardColSpan = flipCardGridColSpan[resolvedFlipCardColumns];
   const flipCardSpanClass = flipCardGridSpanClass[resolvedFlipCardColumns];
   const flipCardGapClass = flipCardOrientation === 'vertical' ? 'gap-3 sm:gap-4' : 'gap-4 sm:gap-5';
   const flipCardGridClass = `grid grid-cols-1 md:grid-cols-12 ${flipCardGapClass}`;

  // Stato paginazione senza reset via effect (evita setState sincrono nell'effect).
  const paginationKey = `${paginationResetKey}:${normalizedVisibleItems ?? 'all'}:${maxCards ?? 'none'}`;
  const [paginationState, setPaginationState] = useState<{ key: string; shownCount: number }>({
    key: '',
    shownCount: Infinity,
  });
  const shownCount =
    paginationState.key === paginationKey
      ? paginationState.shownCount
      : normalizedVisibleItems ?? Infinity;

  const displayedItems = useMemo(() => {
    if (maxCards && maxCards > 0) return items.slice(0, maxCards);
    if (!normalizedVisibleItems) return items;
    return items.slice(0, shownCount);
  }, [items, normalizedVisibleItems, shownCount, maxCards]);

  const hasMore = !maxCards && Boolean(normalizedVisibleItems) && items.length > shownCount;
  const hasLess = !maxCards && Boolean(normalizedVisibleItems) && shownCount > (normalizedVisibleItems ?? 0);

  const shouldShowToggle =
    Boolean(showVisibilityToggle) &&
    Boolean(normalizedVisibleItems) &&
    (hasMore || hasLess) &&
    !maxCards;

  const headerAnimation = useMotion
    ? {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.6 },
        viewport: { once: true },
      }
    : {};

  const shouldShowHeader = Boolean(title || subtitle || showItemsCount || (sortOptions && sortOptions.length > 0 && onSortChange));
  const headerBottomSpacing = title || subtitle ? 'mb-10' : 'mb-6';
  const titlePositionClass =
    titlePosition === 'center'
      ? 'w-full text-center'
      : titlePosition === 'right'
        ? 'w-full text-right'
        : '';
  const baseCardSurfaceClass = 'border-[var(--color-comp-cardgrid-card-border)] bg-[var(--color-comp-cardgrid-card-bg)] dark:border-2';
  const defaultCardTitleClass = 'text-xl text-[var(--color-comp-cardgrid-card-title)] transition-colors group-hover:text-[var(--color-comp-cardgrid-card-title-hover)]';
  const defaultCardDescriptionClass = 'text-sm text-[var(--color-comp-cardgrid-card-description)]';
  const defaultCardMetaClass = 'text-sm text-[var(--color-comp-cardgrid-card-meta)]';

  return (
    <section className={`cardgrid-component ${sectionClassName} ${className}`} data-testid="cardgrid-section">
      <div className={`max-w-6xl mx-auto ${containerClassName}`}>
        {shouldShowHeader ? (
          <motion.div
            {...headerAnimation}
            className={`flex items-end justify-between gap-4 flex-wrap ${headerBottomSpacing} cardgrid-header`}
            data-testid="cardgrid-header"
          >
            <div className={`${titlePositionClass} cardgrid-title-wrapper`}>
              {title ? (
                <h2
                  className={`text-3xl sm:text-4xl font-bold mb-2 ${titleColorClass} cardgrid-title`}
                  data-testid="cardgrid-title"
                >
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p
                  className={`${subtitleColorClass} cardgrid-subtitle`}
                  data-testid="cardgrid-subtitle"
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
            {(showItemsCount || (sortOptions && sortOptions.length > 0 && onSortChange)) ? (
              <div className="ml-auto flex items-center gap-4 text-sm text-[var(--color-comp-cardgrid-controls-text)] cardgrid-controls">
                {showItemsCount ? (
                  <span className="whitespace-nowrap cardgrid-count" data-testid="cardgrid-count">
                    {items.length} {itemsCountLabel}
                  </span>
                ) : null}
                {sortOptions && sortOptions.length > 0 && onSortChange ? (
                  <div className="flex items-center gap-2 cardgrid-sort">
                    <span className="font-medium whitespace-nowrap">{sortLabel}</span>
                    <Select value={sortValue} onValueChange={onSortChange}>
                      <SelectTrigger
                        className="h-9 min-w-[12.5rem] border-[var(--color-comp-cardgrid-sort-border)] bg-[var(--color-comp-cardgrid-sort-bg)] text-[var(--color-comp-cardgrid-sort-text)] cardgrid-sort-trigger"
                        data-testid="cardgrid-sort-trigger"
                      >
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.div>
         ) : null}

        {variant === 'flip-card' ? (
           <div className={flipCardGridClass}>
             {displayedItems.map((item, index) => {
               const resolvedFlipCardImageSrc = item.image || flipCardImageSrc || fallbackImage;
               const shouldUseMosaicImage = !item.image && Boolean(flipCardImageSrc);
               const remainder = displayedItems.length % resolvedFlipCardColumns;
               const lastRowStartIndex = remainder === 0 ? -1 : displayedItems.length - remainder;
               const shouldCenterLastRowStart =
                 flipCardCenterIncompleteRow && remainder > 0 && index === lastRowStartIndex;
               const centeredGridStart = shouldCenterLastRowStart
                 ? Math.floor((12 - (remainder * flipCardColSpan)) / 2) + 1
                 : undefined;
               const centeredGridStyle = shouldCenterLastRowStart
                 ? { ['--flip-grid-start' as `--${string}`]: String(centeredGridStart) }
                 : undefined;

               return (
                 <div
                   key={item.id}
                   className={`${flipCardSpanClass} ${shouldCenterLastRowStart ? 'md:[grid-column-start:var(--flip-grid-start)]' : ''}`}
                   style={centeredGridStyle}
                 >
                   <FlipCard
                    item={{
                      id: item.id,
                      title: item.title,
                      description: item.description || '',
                       category: item.category,
                         icon: item.icon || resolveFlipCardIcon(item.iconName),
                    }}
                    imageSrc={resolvedFlipCardImageSrc}
                    imageAlt={item.title || flipCardImageAlt}
                    useMosaicImage={shouldUseMosaicImage}
                    totalItems={displayedItems.length}
                    columns={resolvedFlipCardColumns}
                    index={index}
                    heightClass={cardHeightClass.flipCard}
                    widthClass={flipCardWidthClass}
                    backToneClass={getFlipCardToneClass(item.flipCardTone, index)}
                    frontBorderColor={getFlipCardFrontBorderColor(item.flipCardTone, index)}
                  />
                 </div>
               );
             })}
          </div>
        ) : (
           <div className={`${resolvedGridClass} ${gridClassName} cardgrid-items`} data-testid="cardgrid-grid">
          {displayedItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={useMotion ? { opacity: 0, y: 30 } : undefined}
              whileInView={useMotion ? { opacity: 1, y: 0 } : undefined}
              transition={useMotion ? { duration: 0.5, delay: index * 0.1 } : undefined}
              viewport={useMotion ? { once: true } : undefined}
              className="cardgrid-item-wrapper"
              data-testid={`cardgrid-item-${item.id}`}
            >
              {onItemClick ? (
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="block group h-full w-full text-left cardgrid-item-button"
                  data-testid={`cardgrid-item-button-${item.id}`}
                >
                  {variant === 'activity' ? (
                    // Wrapper relativo per permettere al badge di stare FUORI dalla card (overflow-visible)
                    <div className={`${activityPhotoBadgePosition === 'border' ? 'relative pt-3' : 'relative'} activity-card-wrapper`}>
                      {item.hasPhoto && activityPhotoBadgePosition === 'border' && (
                        <BadgeChip
                          type="photo"
                          size={activityPhotoBadgeSize}
                          rounded={activityPhotoBadgeRounded}
                          text="Foto"
                          className="absolute -top-0 right-3 z-20 shadow-sm"
                          data-testid={`cardgrid-photo-badge-${item.id}`}
                        />
                       )}
                        <Card
                          className={`${baseCardSurfaceClass} overflow-hidden hover:shadow-lg transition-shadow h-full cursor-pointer group-hover:scale-[1.02] duration-300 activity-card ${cardClassName}`}
                          data-testid={`activity-card-${item.id}`}
                        >
                         {item.image ? (
                           <div className={`relative h-52 w-full overflow-hidden bg-[var(--color-comp-cardgrid-image-bg)] activity-card-image-wrapper`}>
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              className={`object-cover group-hover:scale-105 transition-transform duration-300 ${imageClassName}`}
                              sizes="(max-width: 768px) 100vw, 50vw"
                              data-testid={`activity-card-image-${item.id}`}
                            />
                          </div>
                        ) : null}
                        <CardHeader className="pb-2">
                          <CardTitle
                            className={`text-lg truncate ${activityTextStyle.title}`}
                            data-testid={`activity-card-title-${item.id}`}
                          >
                            {item.title}
                          </CardTitle>
                          <div className="flex items-center justify-between mt-1 activity-card-meta">
                            {showDate && item.date ? (
                              <p
                                className={`text-xs ${activityTextStyle.date}`}
                                data-testid={`activity-card-date-${item.id}`}
                              >
                                {item.date}
                              </p>
                            ) : (
                              <span />
                            )}
                            {item.hasPhoto && activityPhotoBadgePosition === 'date-row' && (
                              <BadgeChip
                                type="photo"
                                size={activityPhotoBadgeSize}
                                rounded={activityPhotoBadgeRounded}
                                text="Foto"
                                data-testid={`cardgrid-photo-badge-date-${item.id}`}
                              />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 activity-card-metrics">
                          <div className="activity-metric">
                            <p className={`text-xs ${activityTextStyle.label}`}>Distanza</p>
                            <p
                              className={`font-bold ${activityTextStyle.value}`}
                              data-testid={`activity-card-distance-${item.id}`}
                            >
                              {item.distance || '—'}
                            </p>
                          </div>
                          <div className="activity-metric">
                            <p className={`text-xs ${activityTextStyle.label}`}>Tempo</p>
                            <p
                              className={`font-bold ${activityTextStyle.value}`}
                              data-testid={`activity-card-duration-${item.id}`}
                            >
                              {item.duration || '—'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className={`${baseCardSurfaceClass} relative overflow-hidden hover:shadow-lg transition-shadow h-full cursor-pointer group-hover:scale-[1.02] duration-300 ${cardClassName}`}>
                      {showTypeBadge && !showBadgeOnImage && toBadgeType(item.type) && (
                        <div className="absolute top-3 right-3 z-20 sm:hidden">
                          <BadgeChip type={toBadgeType(item.type) as BadgeChipType} text={item.type} className="whitespace-nowrap" />
                        </div>
                      )}
                      <div className={`relative ${cardHeightClass.image} w-full overflow-hidden bg-[var(--color-comp-cardgrid-image-bg)]`}>
                        <Image
                          src={item.image || fallbackImage}
                          alt={item.title}
                          fill
                          className={`object-cover group-hover:scale-110 transition-transform duration-300 ${imageClassName}`}
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                            {showTypeBadge && showBadgeOnImage && toBadgeType(item.type) && (
                          <BadgeChip
                                type={toBadgeType(item.type) as BadgeChipType}
                            text={item.type}
                            floating
                            position="top-right"
                            className="z-10"
                          />
                        )}
                      </div>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className={defaultCardTitleClass}>
                            {item.title}
                          </CardTitle>
                          {showTypeBadge && !showBadgeOnImage && toBadgeType(item.type) && (
                            <BadgeChip type={toBadgeType(item.type) as BadgeChipType} text={item.type} className="hidden whitespace-nowrap sm:inline-flex" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {showDescription && item.description && (
                            <p className={defaultCardDescriptionClass}>{item.description}</p>
                        )}
                        {showDate && item.date && (
                            <p className={defaultCardMetaClass}>{item.date}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </button>
               ) : (
                 <Link href={item.href} className="block group h-full">
                   {variant === 'activity' ? (
                     <div className={activityPhotoBadgePosition === 'border' ? 'relative pt-3' : 'relative'}>
                       {item.hasPhoto && activityPhotoBadgePosition === 'border' && (
                         <BadgeChip
                           type="photo"
                           size={activityPhotoBadgeSize}
                           rounded={activityPhotoBadgeRounded}
                           text="Foto"
                           className="absolute -top-0 right-3 z-20 shadow-sm"
                         />
                       )}
                        <Card
                          className={`${baseCardSurfaceClass} overflow-hidden hover:shadow-lg transition-shadow h-full cursor-pointer group-hover:scale-[1.02] duration-300 activity-card ${cardClassName}`}
                          data-testid={`activity-card-${item.id}`}
                        >
                          {item.image ? (
                            <div className={`relative h-52 w-full overflow-hidden bg-[var(--color-comp-cardgrid-image-bg)]`}>
                             <Image
                               src={item.image}
                               alt={item.title}
                               fill
                               className={`object-cover group-hover:scale-105 transition-transform duration-300 ${imageClassName}`}
                               sizes="(max-width: 768px) 100vw, 50vw"
                             />
                           </div>
                         ) : null}
                         <CardHeader className="pb-2">
                           <CardTitle className={`text-lg truncate ${activityTextStyle.title}`}>
                             {item.title}
                           </CardTitle>
                           <div className="flex items-center justify-between mt-1">
                             {showDate && item.date ? <p className={`text-xs ${activityTextStyle.date}`}>{item.date}</p> : <span />}
                             {item.hasPhoto && activityPhotoBadgePosition === 'date-row' && (
                               <BadgeChip
                                 type="photo"
                                 size={activityPhotoBadgeSize}
                                 rounded={activityPhotoBadgeRounded}
                                 text="Foto"
                               />
                             )}
                           </div>
                         </CardHeader>
                         <CardContent className="grid grid-cols-2 gap-4">
                           <div>
                             <p className={`text-xs ${activityTextStyle.label}`}>Distanza</p>
                             <p className={`font-bold ${activityTextStyle.value}`}>{item.distance || '—'}</p>
                           </div>
                           <div>
                             <p className={`text-xs ${activityTextStyle.label}`}>Tempo</p>
                             <p className={`font-bold ${activityTextStyle.value}`}>{item.duration || '—'}</p>
                           </div>
                         </CardContent>
                       </Card>
                     </div>
                   ) : (
                           <Card className={`${baseCardSurfaceClass} relative overflow-hidden hover:shadow-lg transition-shadow h-full cursor-pointer group-hover:scale-[1.02] duration-300 ${cardClassName}`}>
                             {showTypeBadge && !showBadgeOnImage && toBadgeType(item.type) && (
                               <div className="absolute top-3 right-3 z-20 sm:hidden">
                                 <BadgeChip type={toBadgeType(item.type) as BadgeChipType} text={item.type} className="whitespace-nowrap" />
                               </div>
                             )}
                       <div className={`relative ${cardHeightClass.image} w-full overflow-hidden bg-[var(--color-comp-cardgrid-image-bg)]`}>
                         <Image
                           src={item.image || fallbackImage}
                           alt={item.title}
                           fill
                           className={`object-cover group-hover:scale-110 transition-transform duration-300 ${imageClassName}`}
                           sizes="(max-width: 768px) 100vw, 33vw"
                         />
                         {showTypeBadge && showBadgeOnImage && toBadgeType(item.type) && (
                           <BadgeChip
                             type={toBadgeType(item.type) as BadgeChipType}
                             text={item.type}
                             floating
                             position="top-right"
                             className="z-10"
                           />
                         )}
                       </div>
                       <CardHeader>
                         <div className="flex items-start justify-between gap-2">
                            <CardTitle className={defaultCardTitleClass}>
                             {item.title}
                           </CardTitle>
                           {showTypeBadge && !showBadgeOnImage && toBadgeType(item.type) && (
                              <BadgeChip type={toBadgeType(item.type) as BadgeChipType} text={item.type} className="hidden whitespace-nowrap sm:inline-flex" />
                           )}
                         </div>
                       </CardHeader>
                       <CardContent className="space-y-2">
                         {showDescription && item.description && (
                            <p className={defaultCardDescriptionClass}>{item.description}</p>
                         )}
                         {showDate && item.date && (
                            <p className={defaultCardMetaClass}>{item.date}</p>
                         )}
                       </CardContent>
                     </Card>
                   )}
                 </Link>
               )}
            </motion.div>
           ))}
          </div>
        )}

         {shouldShowToggle ? (
           <div className={`mt-8 flex justify-center gap-3 ${visibilityToggleClassName} cardgrid-toggle`} data-testid="cardgrid-toggle">
             {hasMore && (
               <Button
                 variant="default"
                 tone={showMoreTone}
                 disabled={isLoadingMore}
                 onClick={() => {
                   const step = normalizedVisibleItems ?? 4;
                   const nextShownCount = shownCount + step;
                   setPaginationState({
                     key: paginationKey,
                     shownCount: nextShownCount,
                   });
                   if (onLoadMore && nextShownCount > items.length) {
                     onLoadMore();
                   }
                 }}
                 className="cardgrid-show-more"
                 data-testid="cardgrid-show-more"
               >
                 {showMoreLabel}
               </Button>
             )}
             {hasLess && (
               <Button
                 variant="default"
                 tone={showLessTone}
                 onClick={() =>
                   setPaginationState({
                     key: paginationKey,
                     shownCount: normalizedVisibleItems ?? 4,
                   })
                 }
                 className="cardgrid-show-less"
                 data-testid="cardgrid-show-less"
               >
                 {showLessLabel}
               </Button>
             )}
           </div>
         ) : null}
      </div>
    </section>
  );
}

