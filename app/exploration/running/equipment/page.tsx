import Image from 'next/image';
import Link from 'next/link';
import equipmentData from '@/lib/data/equipment.json';
import { hydrateEquipmentFromCloudinary } from '@/lib/cloudinary/equipment';
import type { EquipmentItem } from '@/lib/equipment/types';
import { Divider, PageShell, Text } from '@/components/generic';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const conditionClassMap: Record<EquipmentItem['condition'], string> = {
  Nuovo: 'bg-[var(--color-comp-equipment-condition-new-bg)] text-[var(--color-comp-equipment-condition-new-text)]',
  Buono: 'bg-[var(--color-comp-equipment-condition-good-bg)] text-[var(--color-comp-equipment-condition-good-text)]',
  Usurato: 'bg-[var(--color-comp-equipment-condition-used-bg)] text-[var(--color-comp-equipment-condition-used-text)]',
};

const equipmentCardBackground: 'default' | 'soft' | 'sky' | 'glass' | 'navy' = 'sky';
const equipmentFontSize = 'medium' as const;

const equipmentTypography = {
  small: {
    title: 'text-sm',
    subtitle: 'text-[11px]',
    body: 'text-[11px]',
    label: 'text-[11px]',
    value: 'text-sm',
  },
  medium: {
    title: 'text-base',
    subtitle: 'text-xs',
    body: 'text-xs',
    label: 'text-xs',
    value: 'text-base',
  },
  large: {
    title: 'text-lg',
    subtitle: 'text-sm',
    body: 'text-sm',
    label: 'text-sm',
    value: 'text-lg',
  },
} as const;

export default async function RunningEquipmentPage() {
  const items = await hydrateEquipmentFromCloudinary(equipmentData.running);
  const visibleItems = items.filter((item) => item.visible !== false);
  const groupedByCategory = visibleItems.reduce<Record<string, EquipmentItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <PageShell background="sky">
      <section className="relative w-full h-[34vh] sm:h-[38vh] overflow-hidden run-eq-hero-1" data-testid="run-eq-hero-1">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 run-eq-hero-bg-1"
          style={{
            backgroundImage:
              'url(https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/running_Large_zorzw2.jpg)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20 run-eq-hero-overlay-1" />

        <Link
          href="/exploration/running"
          className="absolute top-6 left-6 sm:left-10 inline-flex items-center gap-1.5 text-white/85 hover:text-white text-sm font-medium transition z-10 run-eq-back-link-1"
          data-testid="run-eq-back-link-1"
        >
          ← Running
        </Link>

        <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-7 sm:px-10 sm:pb-8 run-eq-hero-content-1" data-testid="run-eq-hero-content-1">
          <div className="w-full max-w-2xl space-y-2 mb-5 text-center run-eq-hero-text-1" data-testid="run-eq-hero-text-1">
            <Text as="h1" variant="title" tone="white" align="center" className="text-4xl sm:text-5xl lg:text-6xl leading-tight run-eq-title-1" data-testid="run-eq-title-1">
              Attrezzatura Running
            </Text>
            <Text as="p" variant="body" tone="white" align="center" className="text-sm sm:text-base text-white/85 max-w-xl mx-auto run-eq-subtitle-1" data-testid="run-eq-subtitle-1">
              Scarpe, orologi e accessori che uso nei miei allenamenti e nelle gare.
            </Text>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
            <div key={category} className="mb-12">
              <Text as="h2" variant="title" tone="blue" align="center" size="2xl" className="mb-6">
                {category}
              </Text>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {categoryItems.map((item) => {
                  const officialUrl = item.productUrl || item.url;
                  const cardBackground = item.cardColor ?? equipmentCardBackground;
                  const isCardNavy = cardBackground === 'navy';
                  return (
                    <Card key={item.id} variant="equipment" equipmentBackground={cardBackground} equipmentFontSize={equipmentFontSize}>
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
                              <Text as="h3" variant="title" className={`font-semibold leading-tight ${isCardNavy ? 'text-white' : 'text-slate-900 dark:text-white'} ${equipmentTypography[equipmentFontSize].title}`}>
                                {item.model}
                              </Text>
                              <Text as="p" variant="caption" className={`${isCardNavy ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'} truncate ${equipmentTypography[equipmentFontSize].subtitle}`}>
                                {item.brand}
                              </Text>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${conditionClassMap[item.condition]}`}>{item.condition}</span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-0 space-y-3">
                        <Divider tone="blue" size="sm" iconType="default" containerClassName="px-0 py-0" className="gap-2" />
                        <Text as="p" variant="body" className={`${isCardNavy ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'} leading-relaxed ${equipmentTypography[equipmentFontSize].body}`}>
                          {item.description}
                        </Text>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <Text as="p" variant="caption" className={`${isCardNavy ? 'text-slate-300' : 'text-slate-500 dark:text-slate-500'} ${equipmentTypography[equipmentFontSize].label}`}>
                              Anno Acquisto
                            </Text>
                            <Text as="p" variant="body" weight="semibold" className={`${isCardNavy ? 'text-white' : 'text-slate-900 dark:text-white'} ${equipmentTypography[equipmentFontSize].value}`}>
                              {item.year}
                            </Text>
                          </div>
                          {item.km ? (
                            <div>
                              <Text as="p" variant="caption" className={`${isCardNavy ? 'text-slate-300' : 'text-slate-500 dark:text-slate-500'} ${equipmentTypography[equipmentFontSize].label}`}>
                                Km/Usi
                              </Text>
                              <Text as="p" variant="body" weight="semibold" className={`${isCardNavy ? 'text-white' : 'text-slate-900 dark:text-white'} ${equipmentTypography[equipmentFontSize].value}`}>
                                {item.km}
                              </Text>
                            </div>
                          ) : null}
                        </div>
                        {officialUrl ? (
                          <div className="pt-2 flex justify-center">
                            <Button asChild variant="outline" tone="blue" size="default" width="auto">
                              <a href={officialUrl} target="_blank" rel="noopener noreferrer" title={item.productDescription || 'Vai alla scheda ufficiale del prodotto'}>
                                Product Description →
                              </a>
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

