'use client';

import React, { useRef, useState } from 'react';
import { ICON_REGISTRY, Icon, type IconName, type LucideIcon } from '@/components/Icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type FilterType =
  | 'dateStart'
  | 'dateEnd'
  | 'activityType'
  | 'sortBy'
  | 'distanceMin'
  | 'distanceMax'
  | 'durationMin'
  | 'durationMax'
  | 'location'
  | 'pace';

type FilterTone = 'current' | 'blue' | 'purple' | 'black';

export interface FilterOption {
  value: string;
  label: string;
  appliedLabel?: string;
}

export interface FilterConfig {
  type: FilterType;
  label: string;
  shortLabel?: string;
  placeholder?: string;
  options?: FilterOption[];
  /** Unità mostrata nella chip attiva (es. 'km') */
  unit?: string;
}

export interface FilterState {
  [key: string]: string;
}

interface FilterProps {
  filters: FilterConfig[];
  onFilterChange: (state: FilterState) => void;
  onReset?: () => void;
  resetLabel?: string;
  applyLabel?: string;
  tone?: FilterTone;
  syncChannel?: string;
  disabled?: boolean;
  className?: string;
  density?: 'default' | 'compact';
  variant?: 'default' | 'minimal';
}

function stripUnitSuffix(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/u, '').trim();
}

const filterTypeIcons: Record<FilterType, IconName> = {
  dateStart:   'calendar-days',
  dateEnd:     'calendar-days',
  activityType:'footprints',
  sortBy:      'gauge',
  distanceMin: 'ruler',
  distanceMax: 'route',
  durationMin: 'timer',
  durationMax: 'timer',
  location:    'map-pin',
  pace:        'gauge',
};

const toneStyles: Record<FilterTone, { wrapper: string; field: string; text: string; icon: string; buttonTone: 'blue' | 'purple' | 'black' | 'current' }> = {
  current: {
    wrapper: 'border-[var(--color-comp-filter-current-wrapper-border)] bg-[var(--color-comp-filter-current-wrapper-bg)]',
    field:   'border-[var(--color-comp-filter-current-field-border)] bg-[var(--color-comp-filter-current-field-bg)]',
    text:    'text-[var(--color-comp-filter-current-text)]',
    icon:    'text-[var(--color-comp-filter-current-icon)]',
    buttonTone: 'blue',
  },
  blue: {
    wrapper: 'border-[var(--color-comp-filter-blue-wrapper-border)] bg-[var(--color-comp-filter-blue-wrapper-bg)]',
    field:   'border-[var(--color-comp-filter-blue-field-border)] bg-[var(--color-comp-filter-blue-field-bg)]',
    text:    'text-[var(--color-comp-filter-blue-text)]',
    icon:    'text-[var(--color-comp-filter-blue-icon)]',
    buttonTone: 'blue',
  },
  purple: {
    wrapper: 'border-[var(--color-comp-filter-purple-wrapper-border)] bg-[var(--color-comp-filter-purple-wrapper-bg)]',
    field:   'border-[var(--color-comp-filter-purple-field-border)] bg-[var(--color-comp-filter-purple-field-bg)]',
    text:    'text-[var(--color-comp-filter-purple-text)]',
    icon:    'text-[var(--color-comp-filter-purple-icon)]',
    buttonTone: 'purple',
  },
  black: {
    wrapper: 'border-[var(--color-comp-filter-black-wrapper-border)] bg-[var(--color-comp-filter-black-wrapper-bg)]',
    field:   'border-[var(--color-comp-filter-black-field-border)] bg-[var(--color-comp-filter-black-field-bg)]',
    text:    'text-[var(--color-comp-filter-black-text)]',
    icon:    'text-[var(--color-comp-filter-black-icon)]',
    buttonTone: 'black',
  },
};

export function Filter({
  filters,
  onFilterChange,
  onReset,
  resetLabel = 'Reset',
  applyLabel = 'Applica',
  tone = 'current',
  syncChannel,
  disabled = false,
  className = '',
  density = 'default',
  variant = 'default',
}: FilterProps) {
  const style = toneStyles[tone];
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const buildEmptyState = () => filters.reduce((acc, f) => ({ ...acc, [f.type]: '' }), {} as FilterState);
  const mergeFilterStates = (base: FilterState, draft: FilterState): FilterState =>
    filters.reduce((acc, f) => {
      const draftValue = draft[f.type] ?? '';
      acc[f.type] = draftValue.trim() !== '' ? draftValue : (base[f.type] ?? '');
      return acc;
    }, {} as FilterState);
  const [filterState, setFilterState] = useState<FilterState>(buildEmptyState);
  const [appliedFilterState, setAppliedFilterState] = useState<FilterState>(buildEmptyState);

  const handleChange = (type: FilterType, value: string) => {
    const newState = { ...filterState, [type]: value };
    setFilterState(newState);
  };

  const handleApply = () => {
    const mergedState = mergeFilterStates(appliedFilterState, filterState);
    setAppliedFilterState(mergedState);
    onFilterChange(mergedState);
    setFilterState(buildEmptyState());
    if (syncChannel) {
      window.dispatchEvent(new CustomEvent(`mz-filter:${syncChannel}`, { detail: mergedState }));
    }
  };

  const handleReset = () => {
    const resetState = buildEmptyState();
    setFilterState(resetState);
    setAppliedFilterState(resetState);
    onReset?.();
    onFilterChange(resetState);
    if (syncChannel) {
      window.dispatchEvent(new CustomEvent(`mz-filter:${syncChannel}`, { detail: resetState }));
    }
  };

  const hasActiveFilters = filters.some((f) => {
    const val = appliedFilterState[f.type];
    return typeof val === 'string' && val.trim() !== '';
  });

  const activeFilters = filters
    .map((f) => {
      const rawValue = appliedFilterState[f.type] || '';
      const matchedOption = f.options?.find((opt) => opt.value === rawValue);
      const rawDisplay = matchedOption?.appliedLabel ?? matchedOption?.label ?? rawValue;
      const chipBaseLabel = stripUnitSuffix(f.shortLabel || f.label);
      const display = rawDisplay
        ? f.type === 'distanceMin' || f.type === 'distanceMax'
          ? `${chipBaseLabel} ${rawDisplay}${f.unit ? ` (${f.unit.toUpperCase()})` : ''}`
          : f.unit
            ? `${rawDisplay} ${f.unit}`
            : rawDisplay
        : '';
      return {
        type: f.type,
        label: f.label,
        value: rawValue,
        display,
      };
    })
    .filter((f) => f.value.trim() !== '');

  const clearSingleFilter = (type: FilterType) => {
    const nextApplied = { ...appliedFilterState, [type]: '' };
    setAppliedFilterState(nextApplied);
    setFilterState((prev) => ({ ...prev, [type]: '' }));
    onFilterChange(nextApplied);
    if (syncChannel) {
      window.dispatchEvent(new CustomEvent(`mz-filter:${syncChannel}`, { detail: nextApplied }));
    }
  };

  const renderFilterInput = (config: FilterConfig) => {
    const value = filterState[config.type] || '';
    const iconName = filterTypeIcons[config.type] ?? 'calendar-days';
    const IconComp = (ICON_REGISTRY[iconName] ?? ICON_REGISTRY['calendar-days']) as LucideIcon;

    const isCompact = density === 'compact';
    const isMinimal = variant === 'minimal';
    const rawFieldLabel = (isMinimal ? (config.shortLabel || config.label) : config.label) || config.placeholder || '';
    const fieldLabel = rawFieldLabel.toUpperCase();
    const fieldHeight = isCompact ? 'h-9' : 'h-10';
    const fieldPadding = isCompact ? 'px-2.5' : 'px-3';
    const iconSize = isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4';
    const labelSize = isCompact ? 'text-[11px]' : 'text-xs';
    const minimalControlWidth = 'w-[9rem] xl:w-[9.5rem]';
    const minimalTextClass = 'text-[var(--color-comp-filter-minimal-text)]';
    const minimalPlaceholderClass = 'placeholder:text-[var(--color-comp-filter-minimal-text)]';
    const minimalFieldClass = isMinimal
      ? 'border-[var(--color-comp-filter-minimal-border)] bg-[var(--color-comp-filter-minimal-bg)] text-[var(--color-comp-filter-minimal-text)]'
      : '';
    const minimalIconClass = isMinimal ? 'text-[var(--color-comp-filter-minimal-icon)]' : style.icon;
    const resolvedFieldClass = isMinimal ? minimalFieldClass : style.field;
    const neutralFocusWithinBg = 'focus-within:bg-slate-100 dark:focus-within:bg-slate-800';
    const neutralOpenBg = 'focus:bg-slate-100 dark:focus:bg-slate-800 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800';

    if (config.type === 'dateStart' || config.type === 'dateEnd') {
      if (isMinimal) {
        return (
          <div
            role="button"
            tabIndex={0}
            onClick={() => dateInputRefs.current[config.type]?.showPicker?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dateInputRefs.current[config.type]?.showPicker?.();
              }
            }}
            className={`${minimalControlWidth} inline-flex h-9 items-center justify-between gap-2 cursor-pointer rounded-md border border-[var(--color-comp-filter-minimal-border)] bg-[var(--color-comp-filter-minimal-bg)] px-2.5 transition-colors ${neutralFocusWithinBg} ${minimalTextClass}`}
            aria-label={`Apri calendario ${fieldLabel}`}
          >
            <IconComp className={`w-4 h-4 ${minimalIconClass}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${minimalTextClass}`}>
              {value || fieldLabel}
            </span>
            <Icon name="chevron-down" className={`w-4 h-4 ${minimalIconClass}`} />
            <input
              ref={(el) => {
                dateInputRefs.current[config.type] = el;
              }}
              type="date"
              value={value}
              onChange={(e) => handleChange(config.type, e.target.value)}
              disabled={disabled}
              className="sr-only"
            />
          </div>
        );
      }

      return (
        <div
          role="button"
          tabIndex={0}
          onClick={() => dateInputRefs.current[config.type]?.showPicker?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              dateInputRefs.current[config.type]?.showPicker?.();
            }
          }}
          className={`rounded-lg border ${fieldPadding} ${fieldHeight} flex items-center justify-between gap-2 cursor-pointer transition-colors ${neutralFocusWithinBg} ${resolvedFieldClass}`}
          aria-label={`Apri calendario ${fieldLabel}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <IconComp className={`${iconSize} shrink-0 ${minimalIconClass}`} />
            <span className={`${labelSize} font-semibold tracking-wide truncate ${minimalIconClass}`}>
              {value || fieldLabel}
            </span>
          </div>
          <input
            ref={(el) => {
              dateInputRefs.current[config.type] = el;
            }}
            type="date"
            value={value}
            onChange={(e) => handleChange(config.type, e.target.value)}
            disabled={disabled}
            className="sr-only"
          />
        </div>
      );
    }

    if (config.options) {
      if (isMinimal) {
        return (
          <Select value={value} onValueChange={(v) => handleChange(config.type, v)} disabled={disabled}>
            <SelectTrigger className={`h-9 ${minimalControlWidth} rounded-md border border-[var(--color-comp-filter-minimal-border)] bg-[var(--color-comp-filter-minimal-bg)] px-2.5 py-0 shadow-none text-xs font-semibold uppercase tracking-wide transition-colors focus:ring-0 focus:ring-offset-0 ${neutralOpenBg} data-[placeholder]:${minimalTextClass} [&_svg]:${minimalIconClass} ${minimalTextClass}`}>
              <div className="flex items-center gap-2">
                <IconComp className={`w-4 h-4 ${minimalIconClass}`} />
                <SelectValue placeholder={fieldLabel} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {config.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      return (
        <Select value={value} onValueChange={(v) => handleChange(config.type, v)} disabled={disabled}>
          <SelectTrigger className={`${fieldHeight} ${resolvedFieldClass} ${isMinimal ? minimalTextClass : style.text} transition-colors focus:ring-0 focus:ring-offset-0 ${neutralOpenBg}`}>
            <div className="flex items-center gap-2">
              <IconComp className={`${iconSize} ${minimalIconClass}`} />
              <SelectValue placeholder={fieldLabel} />
            </div>
          </SelectTrigger>
          <SelectContent>
            {config.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    const inputType =
      config.type.includes('distance') || config.type === 'pace'
        ? 'number'
        : config.type.includes('duration')
          ? 'number'
          : 'text';

    const isNumberInput = inputType === 'number';
    const hasTypedValue = value.trim() !== '';
    const showUnit = isNumberInput && hasTypedValue && Boolean(config.unit);

    return (
      isMinimal ? (
        <div className={`${minimalControlWidth} inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-comp-filter-minimal-border)] bg-[var(--color-comp-filter-minimal-bg)] px-2.5 transition-colors focus-within:bg-slate-100 dark:focus-within:bg-slate-800 ${minimalTextClass}`}>
          <IconComp className={`w-4 h-4 shrink-0 ${minimalIconClass}`} />
          <Input
            type={inputType}
            placeholder={fieldLabel}
            value={value}
            onChange={(e) => handleChange(config.type, e.target.value)}
            disabled={disabled}
            inputMode={isNumberInput ? 'decimal' : undefined}
            step={isNumberInput ? 'any' : undefined}
            className={`h-auto w-full border-0 bg-transparent px-0 shadow-none text-xs font-semibold tracking-wide focus-visible:ring-0 focus-visible:ring-offset-0 ${isNumberInput ? 'filter-number-input text-center tabular-nums [appearance:textfield] [-moz-appearance:textfield]' : 'uppercase'} ${minimalTextClass} ${minimalPlaceholderClass}`}
          />
          {showUnit ? <span className={`text-[11px] font-semibold uppercase tracking-wide ${minimalTextClass}`}>{config.unit}</span> : null}
        </div>
      ) : (
        <div className={`rounded-lg border ${fieldPadding} ${fieldHeight} flex items-center gap-2 transition-colors focus-within:bg-slate-100 dark:focus-within:bg-slate-800 ${resolvedFieldClass}`}>
          <IconComp className={`${iconSize} shrink-0 ${minimalIconClass}`} />
          <Input
            type={inputType}
            placeholder={fieldLabel}
            value={value}
            onChange={(e) => handleChange(config.type, e.target.value)}
            disabled={disabled}
            inputMode={isNumberInput ? 'decimal' : undefined}
            step={isNumberInput ? 'any' : undefined}
            className={`border-0 bg-transparent shadow-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 ${isNumberInput ? 'filter-number-input text-center tabular-nums [appearance:textfield] [-moz-appearance:textfield]' : ''} ${isMinimal ? minimalTextClass : style.text}`}
          />
          {showUnit ? <span className={`text-[11px] font-semibold uppercase tracking-wide ${isMinimal ? minimalTextClass : style.text}`}>{config.unit}</span> : null}
        </div>
      )
    );
  };

  return (
    variant === 'minimal' ? (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1">
          {filters.map((filter, index) => (
            <div key={filter.type} className="shrink-0 flex items-center gap-3">
              {renderFilterInput(filter)}
              {index < filters.length - 1 ? <span className="h-5 w-px bg-[var(--color-comp-filter-separator)]" /> : null}
            </div>
          ))}
          <div className="ml-auto shrink-0 flex items-center gap-2 pl-2">
            <Button tone="black" onClick={handleApply} disabled={disabled} size={density === 'compact' ? 'sm' : 'default'}>
              {applyLabel}
            </Button>
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="flex items-center flex-wrap gap-2 pt-1">
            {activeFilters.map((f) => (
              <button
                key={f.type}
                type="button"
                onClick={() => clearSingleFilter(f.type)}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--color-comp-filter-active-badge-bg)] text-[var(--color-comp-filter-active-badge-text)] text-xs font-medium px-2.5 py-1"
                aria-label={`Rimuovi filtro ${f.label}`}
              >
                <span className="uppercase tracking-wide">{f.display}</span>
                <Icon name="x" size="sm" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled}
              className="text-sm font-semibold uppercase tracking-wide text-[var(--color-comp-filter-reset-text)] underline underline-offset-2"
            >
              CLEAR ALL FILTERS
            </button>
          </div>
        ) : null}
      </div>
    ) : (
      <div className={`flex flex-col ${density === 'compact' ? 'gap-3 p-3 rounded-lg border' : 'gap-4 p-4 rounded-lg border'} ${style.wrapper} ${className}`}>
        <div className={density === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'}>
          {filters.map((filter) => (
            <div key={filter.type}>
              {renderFilterInput(filter)}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          {hasActiveFilters ? (
            <Button variant="outline" tone="black" onClick={handleReset} disabled={disabled} size={density === 'compact' ? 'sm' : 'default'}>
              {resetLabel}
            </Button>
          ) : null}
          <Button tone={style.buttonTone} onClick={handleApply} disabled={disabled} size={density === 'compact' ? 'sm' : 'default'}>
            {applyLabel}
          </Button>
        </div>
      </div>
    )
  );
}


