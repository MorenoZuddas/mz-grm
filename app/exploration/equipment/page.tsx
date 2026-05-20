import Image from 'next/image';
import Link from 'next/link';

import equipmentData from '@/lib/data/equipment.json';
import { hydrateEquipmentFromCloudinary } from '@/lib/cloudinary/equipment';
import type { EquipmentItem } from '@/lib/equipment/types';
import { Divider, PageShell, Text } from '@/components/generic';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CarouselCards } from '@/components/ui/carousel';

export const dynamic = 'force-dynamic';

type SectionKey = 'running' | 'trekking';

type SectionConfig = {
  key: SectionKey;
  title: string;
  subtitle: string;
  tone: 'blue' | 'purple';
  defaultBackground: 'default' | 'soft' | 'sky' | 'glass' | 'navy';
  backUrl: string;
  items: EquipmentItem[];
};

const conditionClassMap: Record<EquipmentItem['condition'], string> = {
  Nuovo: 'bg-[var(--color-comp-equipment-condition-new-bg)] text-[var(--color-comp-equipment-condition-new-text)]',
  Buono: 'bg-[var(--color-comp-equipment-condition-good-bg)] text-[var(--color-comp-equipment-condition-good-text)]',
  Usurato: 'bg-[var(--color-comp-equipment-condition-used-bg)] text-[var(--color-comp-equipment-condition-used-text)]',
};

const equipmentTypography = {
  medium: {
    title: 'text-base',
    subtitle: 'text-xs',
    body: 'text-xs',
    label: 'text-xs',
    value: 'text-base',
  },
} as const;

function groupByCategory(items: EquipmentItem[]): Record<string, EquipmentItem[]> {
  return items.reduce<Record<string, EquipmentItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

function renderEquipmentCard(
  item: EquipmentItem,
  tone: 'blue' | 'purple',
  defaultBackground: 'default' | 'soft' | 'sky' | 'glass' | 'navy',
) {
  const officialUrl = item.productUrl || item.url;
  const cardBackground = item.cardColor ?? defaultBackground;
  const isCardNavy = cardBackground === 'navy';

  return (
    <Card key={item.id} variant="equipment" equipmentBackground={cardBackground} equipmentFontSize="medium" className="h-full flex flex-col">
      {item.image ? (
        <div className="relative h-40 bg-slate-100 dark:bg-slate-900 overflow-hidden p-3">
          <Image src={item.image} alt={item.name ?? item.model} fill unoptimized className="object-contain group-hover/card:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-3xl">{item.icon}</div>
        </div>
      )}

      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl flex-shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <Text as="h3" variant="title" className={`font-semibold leading-tight ${isCardNavy ? 'text-white' : 'text-slate-900 dark:text-white'} ${equipmentTypography.medium.title}`}>
                {item.model}
              </Text>
              <Text as="p" variant="caption" className={`${isCardNavy ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'} truncate ${equipmentTypography.medium.subtitle}`}>
                {item.brand}
              </Text>
            </div>
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${conditionClassMap[item.condition]}`}>{item.condition}</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3 flex flex-1 flex-col">
        <Divider tone={tone} size="sm" iconType="default" containerClassName="px-0 py-0" className="gap-2" />
        <Text as="p" variant="body" className={`${isCardNavy ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'} leading-relaxed ${equipmentTypography.medium.body}`}>
          {item.description}
        </Text>
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div>
            <Text as="p" variant="caption" className={`${isCardNavy ? 'text-slate-300' : 'text-slate-500 dark:text-slate-500'} ${equipmentTypography.medium.label}`}>
              Anno Acquisto
            </Text>
            <Text as="p" variant="body" weight="semibold" className={`${isCardNavy ? 'text-white' : 'text-slate-900 dark:text-white'} ${equipmentTypography.medium.value}`}>
              {item.year}
            </Text>
          </div>
          {item.km ? (
            <div>
              <Text as="p" variant="caption" className={`${isCardNavy ? 'text-slate-300' : 'text-slate-500 dark:text-slate-500'} ${equipmentTypography.medium.label}`}>
                Km/Usi
              </Text>
              <Text as="p" variant="body" weight="semibold" className={`${isCardNavy ? 'text-white' : 'text-slate-900 dark:text-white'} ${equipmentTypography.medium.value}`}>
                {item.km}
              </Text>
            </div>
          ) : null}
        </div>
        {officialUrl ? (
          <div className="pt-2 mt-auto flex justify-center">
            <Button asChild variant="outline" tone={tone} size="default" width="auto">
              <a href={officialUrl} target="_blank" rel="noopener noreferrer" title={item.productDescription || 'Vai alla scheda ufficiale del prodotto'}>
                Product Description →
              </a>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function UnifiedEquipmentPage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const focusSection: SectionKey = params?.focus === 'trekking' ? 'trekking' : 'running';

  const [runningHydrated, trekkingHydrated] = await Promise.all([
    hydrateEquipmentFromCloudinary(equipmentData.running),
    hydrateEquipmentFromCloudinary(equipmentData.trekking),
  ]);

  const runningItems = runningHydrated.filter((item) => item.visible !== false);
  const trekkingItems = trekkingHydrated.filter((item) => item.visible !== false);

  const sections: SectionConfig[] = [
    {
      key: 'running',
      title: 'Running',
      subtitle: 'Attrezzatura road, pista e allenamenti veloci.',
      tone: 'blue',
      defaultBackground: 'sky',
      backUrl: '/exploration/running',
      items: runningItems,
    },
    {
      key: 'trekking',
      title: 'Trekking',
      subtitle: 'Equipaggiamento per sentieri, uscite outdoor e dislivelli.',
      tone: 'purple',
      defaultBackground: 'soft',
      backUrl: '/exploration/trekking',
      items: trekkingItems,
    },
  ];

  const orderedSections = sections.slice().sort((a, b) => {
    if (a.key === focusSection) return -1;
    if (b.key === focusSection) return 1;
    return 0;
  });

  return (
    <PageShell background="sky">
      <section className="relative w-full h-[34vh] sm:h-[38vh] overflow-hidden" data-testid="equipment-unified-hero">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage:
              focusSection === 'running'
                ? 'url(https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/running_Large_zorzw2.jpg)'
                : 'url(https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/trekking_h2lev5.jpg)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />

        <Link
          href={focusSection === 'running' ? '/exploration/running' : '/exploration/trekking'}
          className="absolute top-6 left-6 sm:left-10 inline-flex items-center gap-1.5 text-white/85 hover:text-white text-sm font-medium transition z-10"
        >
          ← {focusSection === 'running' ? 'Running' : 'Trekking'}
        </Link>

        <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-7 sm:px-10 sm:pb-8">
          <div className="w-full max-w-2xl space-y-2 mb-5 text-center">
            <Text as="h1" variant="title" tone="white" align="center" className="text-4xl sm:text-5xl lg:text-6xl leading-tight">
              Attrezzatura
            </Text>
            <Text as="p" variant="body" tone="white" align="center" className="text-sm sm:text-base text-white/85 max-w-xl mx-auto">
              Sezione unificata per Running e Trekking.
            </Text>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {sections.map((section) => {
              const isActive = section.key === focusSection;
              return (
                <Link
                  key={`switch-${section.key}`}
                  href={`/exploration/equipment?focus=${section.key}#section-${section.key}`}
                  className={
                    isActive
                      ? section.key === 'running'
                        ? 'inline-flex items-center rounded-full border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm'
                        : 'inline-flex items-center rounded-full border border-purple-500 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm'
                      : 'inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }
                >
                  {section.title}
                </Link>
              );
            })}
          </div>

          {orderedSections.map((section) => {
            const grouped = groupByCategory(section.items);
            const isFocused = section.key === focusSection;

            return (
              <section
                id={`section-${section.key}`}
                key={section.key}
                className={
                  isFocused
                    ? section.key === 'running'
                      ? 'rounded-2xl ring-2 ring-blue-300/60 dark:ring-blue-800/40 ring-offset-2 ring-offset-sky-50 p-3 sm:p-4 scroll-mt-24'
                      : 'rounded-2xl ring-2 ring-purple-300/60 dark:ring-purple-800/40 ring-offset-2 ring-offset-sky-50 p-3 sm:p-4 scroll-mt-24'
                    : 'scroll-mt-24'
                }
              >
                <Text as="h2" variant="title" tone={section.tone} align="center" size="3xl" className="mb-2">
                  {section.title}
                </Text>
                <Text as="p" variant="body" tone={section.tone} align="center" className="mb-8 opacity-85">
                  {section.subtitle}
                </Text>

                {Object.entries(grouped).map(([category, categoryItems]) => {
                  const useCarousel = categoryItems.length >= 3;
                  return (
                    <div key={`${section.key}-${category}`} className="mb-12">
                      <Text as="h3" variant="title" tone={section.tone} align="center" size="2xl" className="mb-6">
                        {category}
                      </Text>
                      {useCarousel ? (
                        <CarouselCards
                          cardsPerView={{ base: 1, md: 2, lg: 3 }}
                          focusCenterSlide
                          gap="md"
                          showControls
                          showDots
                          arrowsPositionMobile="top-right"
                          contentClassName="py-5 sm:py-6"
                        >
                          {categoryItems.map((item) => renderEquipmentCard(item, section.tone, section.defaultBackground))}
                        </CarouselCards>
                      ) : (
                        <div className={categoryItems.length === 1 ? 'mx-auto grid w-full max-w-[24rem] grid-cols-1 justify-items-center gap-5' : 'mx-auto grid w-full max-w-4xl grid-cols-1 sm:grid-cols-2 items-stretch gap-5'}>
                          {categoryItems.map((item) => (
                            <div key={item.id} className="w-full max-w-[24rem] mx-auto h-full">
                              {renderEquipmentCard(item, section.tone, section.defaultBackground)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}


