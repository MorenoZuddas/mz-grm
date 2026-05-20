"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { PageShell, type PageBackground } from '@/components/generic';

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  year: number;
  description: string;
  icon: string;
  km?: number;
  condition: 'Nuovo' | 'Buono' | 'Usurato';
  url?: string;
  image?: string;
  productDescription?: string;
  productUrl?: string;
}

interface EquipmentPageProps {
  title: string;
  backUrl: string;
  items: EquipmentItem[];
  subtitle?: string;
  className?: string;
  tone?: 'current' | 'blue' | 'purple' | 'black';
  background?: PageBackground;
  backLabel?: string;
  conditionClassMap?: Partial<Record<EquipmentItem['condition'], string>>;
}

const defaultConditionClassMap: Record<EquipmentItem['condition'], string> = {
  Nuovo:   'bg-[var(--color-comp-equipment-condition-new-bg)]  text-[var(--color-comp-equipment-condition-new-text)]',
  Buono:   'bg-[var(--color-comp-equipment-condition-good-bg)] text-[var(--color-comp-equipment-condition-good-text)]',
  Usurato: 'bg-[var(--color-comp-equipment-condition-used-bg)] text-[var(--color-comp-equipment-condition-used-text)]',
};

const toneTitleClassMap: Record<NonNullable<EquipmentPageProps['tone']>, string> = {
  current: 'text-[var(--color-tone-current-title)]',
  blue:    'text-[var(--color-tone-blue-title)]',
  purple:  'text-[var(--color-tone-purple-title)]',
  black:   'text-[var(--color-tone-black-title)]',
};

const toneLinkClassMap: Record<NonNullable<EquipmentPageProps['tone']>, string> = {
  current: 'text-[var(--color-tone-current-accent)] hover:text-[var(--color-tone-current-accent-hover)]',
  blue:    'text-[var(--color-tone-blue-accent)] hover:text-[var(--color-tone-blue-accent-hover)]',
  purple:  'text-[var(--color-tone-purple-accent)] hover:text-[var(--color-tone-purple-accent-hover)]',
  black:   'text-[var(--color-tone-black-accent)] hover:text-[var(--color-tone-black-accent-hover)]',
};

export default function EquipmentPage({
  title,
  backUrl,
  items,
  subtitle = "L'attrezzatura che utilizzo per le mie avventure",
  className = '',
  tone = 'current',
  background = 'white',
  backLabel = '← Torna Indietro',
  conditionClassMap,
}: EquipmentPageProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const resolvedConditionClassMap = { ...defaultConditionClassMap, ...conditionClassMap };
  const groupedByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, EquipmentItem[]>);

  return (
    <PageShell background={background} className={className}>
      {/* Header */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 border-b border-[var(--color-comp-equipment-section-border)]">
        <div className="max-w-4xl mx-auto">
          <Link
            href={backUrl}
            className={`inline-flex items-center mb-6 font-semibold ${toneLinkClassMap[tone]}`}
          >
            {backLabel}
          </Link>
          <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${toneTitleClassMap[tone]}`}>
            🎽 {title}
          </h1>
          <p className="text-lg text-[var(--color-comp-equipment-meta-text)]">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Equipment Grid */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
            <div key={category} className="mb-12">
              <h2 className={`text-2xl font-bold mb-6 ${toneTitleClassMap[tone]}`}>
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {categoryItems.map((item) => {
                  const officialUrl = item.productUrl || item.url;

                  return (
                    <article
                    key={item.id}
                    className="group/card relative rounded-lg border border-[1.5px] border-[#1e3a8a] bg-white dark:bg-slate-950/40 overflow-hidden hover:shadow-md transition-all self-start hover:scale-105 duration-200"
                  >
                    {/* Immagine */}
                    {item.image && !imageErrors[item.id] ? (
                      <div className="relative h-40 bg-slate-100 dark:bg-slate-900 overflow-hidden p-3">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          unoptimized
                          onError={() => {
                            setImageErrors((prev) => ({ ...prev, [item.id]: true }));
                          }}
                          className="object-contain group-hover/card:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                        <div className="text-center px-4">
                          <div className="text-3xl mb-2">{item.icon}</div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Glow bordo */}
                    <div
                      className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity"
                      style={{
                        boxShadow: 'inset 0 0 16px rgba(30, 58, 138, 0.25), 0 0 20px rgba(30, 58, 138, 0.25)',
                      }}
                    />

                    {/* Contenuto */}
                    <div className="relative z-10 p-4 space-y-3">
                      {/* Header con icon e condition */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-2xl flex-shrink-0">{item.icon}</span>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm leading-tight text-slate-900 dark:text-white">
                              {item.name}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                              {item.brand} {item.model}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${resolvedConditionClassMap[item.condition]}`}>
                          {item.condition}
                        </span>
                      </div>

                      {/* Centro bar decorativo */}
                      <div className="flex justify-center pt-1">
                        <div className="h-1 w-6 bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded-full" />
                      </div>

                      {/* Descrizione */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Meta info */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <p className="text-slate-500 dark:text-slate-500">Anno Acquisto</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{item.year}</p>
                        </div>
                        {item.km && (
                          <div>
                            <p className="text-slate-500 dark:text-slate-500">Km/Usi</p>
                            <p className="font-semibold text-slate-900 dark:text-white">{item.km}</p>
                          </div>
                        )}
                      </div>

                      {officialUrl && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <a
                            href={officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 dark:text-blue-400 truncate hover:underline inline-block"
                            title={item.productDescription || 'Vai alla scheda ufficiale del prodotto'}
                          >
                            Product Description →
                          </a>
                        </div>
                      )}
                    </div>
                    </article>
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

