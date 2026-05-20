"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { ButtonSize, ButtonTone, ButtonVariant } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardMedia, CardTitle, type CardTone } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, Palette, Activity, Code2, Lightbulb, Plane, Puzzle } from "lucide-react"
import {
  Carousel,
  CarouselCards,
  CarouselSection as UICarouselSection,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type ArrowsPosition,
  type CarouselGap,
} from "@/components/ui/carousel"
import Loader from "@/components/Loader"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Modal } from "@/components/Modal"
import type { ApiPhoto } from "@/components/Modal"
import { BadgeChip, type BadgeChipType } from "@/components/BadgeChip"
import { ActivityPhotos } from "@/components/ActivityPhotos"
import { ActivityClickHandler } from "@/components/ActivityClickWrapper"
import { Filter, type FilterConfig, type FilterOption, type FilterType } from "@/components/Filter"
import { Statistics, type StatisticsMetricKey } from "@/components/Statistics"
import { AnimatedSection, CardGrid, Divider, Hero, PageShell, Text, type CardGridItem } from "@/components/generic"
import { Stripe } from "@/components/Stripe"
import { Icon, ICON_CATEGORIES, SOCIAL_BRAND_COLORS } from "@/components/Icons"
import { cn } from "@/lib/utils"

type Tone = "current" | "blue" | "purple" | "black"
type HeroAlign = "center" | "left" | "right"
type CardVariant = "default" | "horizontal" | "vertical"
type CardSize = "sm" | "md" | "lg"

const BTN_VARIANTS: ButtonVariant[] = ["default", "destructive", "outline", "secondary", "ghost", "link"]
const BTN_TONES: ButtonTone[] = ["current", "blue", "purple", "black", "navy", "white", "transparent-white"]
const BTN_SIZES: ButtonSize[] = ["xs", "sm", "default", "lg", "xl", "icon"]
const CAROUSEL_ARROW_POSITIONS: ArrowsPosition[] = ["top-right", "sides"]
const CAROUSEL_ACCENT_COLORS = ["text-blue-300", "text-emerald-300", "text-violet-300", "text-amber-300", "text-rose-300"] as const
const CAROUSEL_IMAGE_HEIGHTS = ["h-[16rem]", "h-[18rem]", "h-[20rem]", "h-[22rem]"] as const
const CARD_VARIANTS: CardVariant[] = ["default", "horizontal", "vertical"]
const CARD_TONES: Tone[] = ["current", "blue", "purple", "black"]
const CARD_COLORS: CardTone[] = ["current", "blue", "purple", "black", "navy", "crimson", "pear"]
const CARD_SIZES: CardSize[] = ["sm", "md", "lg"]
const HERO_ALIGNS: HeroAlign[] = ["center", "left", "right"]
const HERO_SIZES = {
  little: "text-2xl sm:text-3xl",
  medium: "text-3xl sm:text-4xl lg:text-5xl",
  large: "text-4xl sm:text-5xl lg:text-6xl",
  extralarge: "text-5xl sm:text-6xl lg:text-7xl",
} as const
const SUBTITLE_SIZES = {
  little: "text-sm sm:text-base",
  medium: "text-base sm:text-lg lg:text-xl",
  large: "text-lg sm:text-xl lg:text-2xl",
  extralarge: "text-xl sm:text-2xl lg:text-3xl",
} as const
const LOADER_TONES: Tone[] = ["current", "blue", "purple", "black"]
const LOADER_SIZES = ["sm", "md", "lg"] as const
const BADGE_TYPES: BadgeChipType[] = ["running", "trekking", "trip", "books", "photo", "music"]
const BG_OPTIONS = {
  navy: "bg-slate-900",
  black: "bg-black",
  blue: "bg-blue-900",
  purple: "bg-violet-900",
  white: "bg-white",
} as const
type BgKey = keyof typeof BG_OPTIONS
const DIVIDER_ICON_TYPES = ["running", "trekking", "trip", "books", "photo", "music", "default"] as const
const FILTER_TYPES: FilterType[] = ["dateStart", "dateEnd", "activityType", "distanceMin", "distanceMax", "durationMin", "durationMax", "location", "pace"]
const TEXT_TONES = ["current", "blue", "purple", "black", "navy", "white"] as const
const TEXT_VARIANTS = ["title", "subtitle", "body", "caption", "overline"] as const
const TEXT_SIZES = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const
const TEXT_WEIGHTS = ["normal", "medium", "semibold", "bold", "extrabold"] as const
const TEXT_TAGS = ["h1", "h2", "h3", "h4", "h5", "p", "span", "div"] as const
const TEXT_ALIGNS = ["left", "center", "right", "justify"] as const
const TEXT_POSITIONS = ["left", "center", "right"] as const
const STAT_METRICS_ALL: StatisticsMetricKey[] = [
  "pb_100",
  "pb_200",
  "pb_400",
  "pb_800",
  "pb_1000",
  "pb_1500",
  "pb_2000",
  "pb_5000",
  "pb_10000",
  "pb_half",
  "pb_marathon",
  "total_activities",
  "total_runs",
  "total_trekkings",
  "total_distance",
  "total_distance_runs",
  "longest_run",
  "total_running_hours",
  "total_trekking_hours",
]

const MOCK_PHOTOS = [
  {
    public_id: "storybook/photo-1",
    secure_url: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80",
    width: 1200,
    height: 800,
  },
  {
    public_id: "storybook/photo-2",
    secure_url: "https://images.pexels.com/photos/355465/pexels-photo-355465.jpeg?auto=compress&cs=tinysrgb&w=1200",
    width: 1200,
    height: 800,
  },
  {
    public_id: "storybook/photo-3",
    secure_url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
    width: 1200,
    height: 800,
  },
] as const

function Ctl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[] | T[]
  onChange: (v: T) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  )
}

function TxtCtl({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8"
      />
    </label>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-8 border-b border-slate-200 dark:border-slate-800 overflow-x-hidden">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-w-0 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900", className)}>{children}</div>
}

type PropLegendItem = { prop: string; values: string[]; description?: string }
type PaletteTokenCategory = "ref" | "role" | "comp" | "page" | "brand"
type PaletteCategoryMeta = {
  id: PaletteTokenCategory
  title: string
  description: string
  impact: string
  tokens: string[]
}

const COLOR_PALETTE_CATEGORIES: PaletteCategoryMeta[] = [
  {
    id: "ref",
    title: "Reference Tokens",
    description: "Palette base (raw). Sono i colori sorgente da cui dipende il resto.",
    impact: "Impatto alto: modifica globale a cascata.",
    tokens: [
      "--color-ref-white",
      "--color-ref-ink",
      "--color-ref-slate-50",
      "--color-ref-slate-100",
      "--color-ref-slate-300",
      "--color-ref-slate-600",
      "--color-ref-slate-700",
      "--color-ref-slate-800",
      "--color-ref-slate-900",
      "--color-ref-slate-950",
      "--color-ref-sky-50",
      "--color-ref-sky-100",
      "--color-ref-crimson-600",
      "--color-ref-crimson-500",
      "--color-ref-pear-500",
      "--color-ref-pear-100",
      "--color-ref-pear-900",
    ],
  },
  {
    id: "role",
    title: "Role Tokens",
    description: "Ruoli UI trasversali: superfici, testi, bordi.",
    impact: "Impatto medio-alto: cambia look sistemico.",
    tokens: [
      "--color-role-surface-base",
      "--color-role-surface-soft",
      "--color-role-surface-muted",
      "--color-role-surface-strong",
      "--color-role-surface-stronger",
      "--color-role-text-primary",
      "--color-role-text-secondary",
      "--color-role-text-inverse",
      "--color-role-border-soft",
      "--color-role-border-strong",
    ],
  },
  {
    id: "comp",
    title: "Component Tokens",
    description: "Varianti locali dei componenti (Card, Stripe, Header, Footer, Badge, Divider, Hero, Modal).",
    impact: "Impatto mirato: cambia solo il componente/famiglia.",
    tokens: [
      "--color-comp-tone-blue-bg",
      "--color-comp-tone-blue-border",
      "--color-comp-tone-blue-text",
      "--color-comp-tone-purple-bg",
      "--color-comp-tone-purple-border",
      "--color-comp-tone-purple-text",
      "--color-comp-tone-navy-bg",
      "--color-comp-tone-navy-border",
      "--color-comp-tone-navy-text",
      "--color-comp-tone-crimson-bg",
      "--color-comp-tone-crimson-border",
      "--color-comp-tone-crimson-text",
      "--color-comp-tone-pear-bg",
      "--color-comp-tone-pear-border",
      "--color-comp-tone-pear-text",
      "--color-comp-stripe-white-bg",
      "--color-comp-stripe-white-border",
      "--color-comp-stripe-white-title",
      "--color-comp-stripe-white-text",
      "--color-comp-stripe-white-image-bg",
      "--color-comp-stripe-white-image-border",
      "--color-comp-stripe-navy-bg",
      "--color-comp-stripe-navy-border",
      "--color-comp-stripe-navy-title",
      "--color-comp-stripe-navy-text",
      "--color-comp-stripe-navy-image-bg",
      "--color-comp-stripe-navy-image-border",
      "--color-comp-header-bg",
      "--color-comp-header-text",
      "--color-comp-header-link-hover",
      "--color-comp-header-hover-bg",
      "--color-comp-header-border",
      "--color-comp-header-dropdown-bg",
      "--color-comp-header-divider",
      "--color-comp-footer-bg",
      "--color-comp-footer-text",
      "--color-comp-footer-link",
      "--color-comp-footer-link-hover",
      "--color-comp-footer-separator",
      "--color-comp-footer-border",
      "--color-comp-footer-copyright",
      "--color-comp-modal-bg",
      "--color-comp-modal-title",
      "--color-comp-modal-subtitle",
      "--color-comp-modal-border",
      "--color-comp-modal-metric-current",
      "--color-comp-modal-metric-blue",
      "--color-comp-modal-metric-purple",
      "--color-comp-modal-metric-black",
      "--color-comp-badge-running-bg",
      "--color-comp-badge-running-text",
      "--color-comp-badge-trekking-bg",
      "--color-comp-badge-trekking-text",
      "--color-comp-badge-trip-bg",
      "--color-comp-badge-trip-text",
      "--color-comp-badge-books-bg",
      "--color-comp-badge-books-text",
      "--color-comp-badge-photo-bg",
      "--color-comp-badge-photo-text",
      "--color-comp-badge-music-bg",
      "--color-comp-badge-music-text",
      "--color-comp-divider-current-line",
      "--color-comp-divider-current-symbol",
      "--color-comp-divider-blue-line",
      "--color-comp-divider-blue-symbol",
      "--color-comp-divider-purple-line",
      "--color-comp-divider-purple-symbol",
      "--color-comp-divider-black-line",
      "--color-comp-divider-black-symbol",
      "--color-comp-hero-overlay",
      "--color-comp-hero-title-current",
      "--color-comp-hero-title-blue",
      "--color-comp-hero-title-purple",
      "--color-comp-hero-title-black",
      "--color-comp-hero-subtitle-current",
      "--color-comp-hero-subtitle-blue",
      "--color-comp-hero-subtitle-purple",
      "--color-comp-hero-subtitle-black",
    ],
  },
  {
    id: "page",
    title: "Page Backgrounds",
    description: "Gradienti pagina di alto livello.",
    impact: "Impatto alto su tutte le pagine che usano PageShell.",
    tokens: ["--gradient-page-white", "--gradient-page-sky", "--gradient-page-navy"],
  },
  {
    id: "brand",
    title: "Brand Aliases",
    description: "Alias leggibili per naming business/prodotto.",
    impact: "Impatto variabile: dipende da dove vengono usati.",
    tokens: [
      "--color-brand-navy",
      "--color-brand-navy-strong",
      "--color-brand-sky",
      "--color-brand-sky-strong",
      "--color-brand-crimson",
      "--color-brand-crimson-strong",
      "--color-brand-pear",
      "--color-brand-pear-soft",
    ],
  },
]

const PROP_DESCRIPTIONS: Record<string, string> = {
  tone: "Tema colore del componente.",
  variant: "Stile visuale principale del componente.",
  size: "Dimensione generale del componente.",
  mode: "Modalita di rendering del componente (data-driven o children).",
  orientation: "Direzione principale del layout o dello scorrimento.",
  gap: "Spaziatura tra elementi o slide.",
  cardsPerView: "Numero di card visibili contemporaneamente.",
  "cards/view": "Numero di card visibili contemporaneamente.",
  loop: "Se attivo, il contenuto ricomincia dall'inizio in modo ciclico.",
  showControls: "Mostra o nasconde i controlli di navigazione.",
  "show controls": "Mostra o nasconde i controlli di navigazione.",
  showDots: "Mostra o nasconde l'indicatore a pallini dello slider.",
  arrowsPosition: "Posizione delle frecce su desktop.",
  arrowsPositionMobile: "Posizione delle frecce su mobile.",
  title: "Titolo principale della sezione o del componente.",
  description: "Testo descrittivo di supporto sotto il titolo.",
  cardImage: "Immagine della card (fallback se non specificata nell'item).",
  cardAccentLabel: "Etichetta colorata sopra il titolo card (es. Road to Marathon).",
  cardAccentColor: "Classe colore Tailwind usata per l'etichetta accent.",
  cardTitle: "Titolo principale della card.",
  cardDescription: "Descrizione testuale della card.",
  cardButtonText: "Testo visualizzato nel bottone card.",
  cardButtonVariant: "Variant del bottone (stili del componente Button).",
  cardButtonTone: "Tone del bottone (palette colore del componente Button).",
  cardButtonSize: "Dimensione del bottone card.",
  iconType: "Tipo icona usata nel componente.",
  symbol: "Simbolo testuale personalizzato (se supportato).",
  metrics: "Elenco metriche mostrate dal componente statistiche.",
  filters: "Configurazione filtri disponibili nel componente.",
  endpoint: "Endpoint API usato per recuperare i dati demo.",
  totalCards: "Numero totale di card generate nel demo.",
  "total cards": "Numero totale di card generate nel demo.",
  visibleCards: "Numero di card inizialmente visibili prima del toggle.",
  "visible cards": "Numero di card inizialmente visibili prima del toggle.",
  maxCards: "Limite massimo rigido di card renderizzate.",
  showDate: "Mostra la data nelle card che la supportano.",
  showTypeBadge: "Mostra il badge tipo attivita/categoria.",
  showBadgeOnImage: "Posiziona il badge sopra l'immagine invece che nel contenuto.",
  showDescription: "Mostra il testo descrittivo secondario.",
  activityPhotoBadgePosition: "Posizione del badge foto nelle activity card.",
  activityPhotoBadgeSize: "Dimensione del badge foto.",
  activityPhotoBadgeRounded: "Forma arrotondata del badge foto.",
  activityTextColor: "Colore testi interni alla activity card.",
}

function PropsLegend({ items }: { items: PropLegendItem[] }) {
  return (
    <Panel>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Props disponibili</p>
      <div className="space-y-2 text-xs">
        {items.map((item) => (
          <div key={item.prop}>
            <p>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{item.prop}:</span>{" "}
              <span className="text-slate-500">{item.values.join(" | ")}</span>
            </p>
            {(item.description ?? PROP_DESCRIPTIONS[item.prop]) ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {item.description ?? PROP_DESCRIPTIONS[item.prop]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  )
}

const PALETTE_NAV = [
  { id: "color-palette", label: "Color Palette" },
  { id: "color-palette-ref", label: "Reference Tokens" },
  { id: "color-palette-role", label: "Role Tokens" },
  { id: "color-palette-comp", label: "Component Tokens" },
  { id: "color-palette-page", label: "Page Backgrounds" },
  { id: "color-palette-brand", label: "Brand Aliases" },
  { id: "color-palette-props", label: "Props" },
] as const

const COMPONENTS_NAV = [
  { id: "activity-components", label: "Activity Components" },
  { id: "animated", label: "AnimatedSection" },
  { id: "badge-chip", label: "Badge / Chip" },
  { id: "button", label: "Button" },
  { id: "card", label: "Card" },
  { id: "cardgrid", label: "CardGrid" },
  { id: "carousel", label: "Carousel" },
  { id: "divider", label: "Divider" },
  { id: "filter", label: "Filter" },
  { id: "header-footer", label: "Header + Footer" },
  { id: "hero", label: "Hero" },
  { id: "icons", label: "Icons" },
  { id: "input-select", label: "Input + Select" },
  { id: "loader", label: "Loader" },
  { id: "modal", label: "Modal" },
  { id: "statistics-single", label: "Statistics - Single Test" },
  { id: "statistics", label: "Statistics + Filter Sync" },
  { id: "stripe", label: "Stripe" },
  { id: "text", label: "Text" },
] as const

const STORYBOOK_NAV = [...PALETTE_NAV, ...COMPONENTS_NAV]

function ColorPaletteSection() {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const root = document.documentElement
    const computed = getComputedStyle(root)
    const next: Record<string, string> = {}

    COLOR_PALETTE_CATEGORIES.flatMap((group) => group.tokens).forEach((token) => {
      next[token] = computed.getPropertyValue(token).trim()
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(next)
  }, [])

  return (
    <Section id="color-palette" title="Color Palette">
      <div className="grid gap-4">
        {COLOR_PALETTE_CATEGORIES.map((group) => (
          <Panel key={group.id}>
            <div id={`color-palette-${group.id}`} className="scroll-mt-24" />
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">{group.description}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{group.impact}</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {group.tokens.map((token) => {
                const isGradient = token.startsWith("--gradient-page-")
                const value = values[token] ?? ""

                return (
                  <div key={token} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-950">
                    <div
                      className="h-10 rounded border border-slate-200 dark:border-slate-700"
                      style={
                        isGradient
                          ? { backgroundImage: `var(${token})` }
                          : { backgroundColor: `var(${token})` }
                      }
                    />
                    <p className="mt-2 text-[11px] font-medium text-slate-800 dark:text-slate-200 break-all">{token}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 break-all">{value || "(vuoto)"}</p>
                  </div>
                )
              })}
            </div>
          </Panel>
        ))}
      </div>
      {/* Tone Cheat Sheet */}
      <div id="color-palette-props" className="mt-4 scroll-mt-24">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Tone Cheat Sheet — cosa scrivere nella prop</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Quando un componente accetta una prop <code className="bg-slate-100 dark:bg-slate-800 rounded px-1">tone</code> o <code className="bg-slate-100 dark:bg-slate-800 rounded px-1">flipCardTone</code>, usa i valori nella prima colonna. La colonna <em>Tipo</em> indica se è chiaro (light) o scuro (dark).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-4 font-semibold">Valore prop</th>
                  <th className="pb-2 pr-4 font-semibold">Sfondo</th>
                  <th className="pb-2 pr-4 font-semibold">Testo</th>
                  <th className="pb-2 pr-4 font-semibold">Tipo</th>
                  <th className="pb-2 pr-4 font-semibold">Componenti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  {
                    value: "current",
                    bg: "var(--color-comp-cardgrid-card-bg, #ffffff)",
                    border: "var(--color-comp-cardgrid-card-border, #e2e8f0)",
                    textSample: "var(--color-comp-cardgrid-card-title, #0f172a)",
                    type: "adaptive",
                    desc: "Segue il tema (light/dark) dell'app",
                    components: "CardGrid, Button, Text, Card",
                  },
                  {
                    value: "blue",
                    bg: "#eff6ff",
                    border: "#bfdbfe",
                    textSample: "#0f172a",
                    type: "light",
                    desc: "Azzurro tenue, testo scuro",
                    components: "CardGrid, flip-card, Button, Card, Divider",
                  },
                  {
                    value: "purple",
                    bg: "#f5f3ff",
                    border: "#ddd6fe",
                    textSample: "#0f172a",
                    type: "light",
                    desc: "Viola tenue, testo scuro",
                    components: "CardGrid, flip-card, Button, Card, Divider",
                  },
                  {
                    value: "navy",
                    bg: "#0f172a",
                    border: "#1e293b",
                    textSample: "#f1f5f9",
                    type: "dark",
                    desc: "Blu notte scuro, testo chiaro",
                    components: "flip-card (flipCardTone), Button",
                  },
                  {
                    value: "crimson",
                    bg: "#ba0c2f",
                    border: "#ba0c2f",
                    textSample: "#ffffff",
                    type: "dark",
                    desc: "Rosso intenso, testo bianco",
                    components: "flip-card (flipCardTone)",
                  },
                  {
                    value: "pear",
                    bg: "#e8f2c5",
                    border: "#8db600",
                    textSample: "#0f172a",
                    type: "light",
                    desc: "Verde pera, testo scuro",
                    components: "flip-card (flipCardTone)",
                  },
                  {
                    value: "black",
                    bg: "#0f172a",
                    border: "#334155",
                    textSample: "#f1f5f9",
                    type: "dark",
                    desc: "Quasi nero, testo chiaro",
                    components: "CardGrid, Button, Card, Text",
                  },
                  {
                    value: "white",
                    bg: "#ffffff",
                    border: "#e2e8f0",
                    textSample: "#0f172a",
                    type: "light",
                    desc: "Bianco puro, testo scuro",
                    components: "Button, Stripe (background)",
                  },
                ].map((row) => (
                  <tr key={row.value} className="align-middle">
                    <td className="py-2 pr-4">
                      <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                        {row.value}
                      </code>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-5 w-5 flex-shrink-0 rounded border border-slate-300 dark:border-slate-600 shadow-sm"
                          style={{ backgroundColor: row.bg }}
                          title={row.bg}
                        />
                        <span
                          className="inline-block h-5 w-5 flex-shrink-0 rounded-full border-2 shadow-sm"
                          style={{ backgroundColor: row.textSample, borderColor: row.border }}
                          title={`testo: ${row.textSample}`}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-[11px] text-slate-600 dark:text-slate-400">{row.desc}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        row.type === "dark"
                          ? "bg-slate-800 text-slate-100"
                          : row.type === "adaptive"
                            ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
                            : "bg-slate-100 text-slate-700"
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2 text-[11px] text-slate-500 dark:text-slate-400">{row.components}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-semibold">⚠️ Attenzione: non tutti i valori funzionano su tutti i componenti</p>
            <p><code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1">navy</code>, <code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1">crimson</code>, <code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1">pear</code> sono disponibili solo per <strong>flip-card</strong> tramite la prop <code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1">flipCardTone</code> su ogni item.</p>
            <p><code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1">CardGrid tone</code> accetta solo: <strong>current · blue · purple · black</strong>.</p>
            <p><code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1">headerColor</code> su CardGrid accetta: <strong>current · blue · purple · black</strong>.</p>
          </div>
        </Panel>
        <div className="mt-3">
          <PropsLegend
            items={[
              { prop: "ref", values: ["raw palette"], description: "Colori sorgente." },
              { prop: "role", values: ["surface/text/border"], description: "Ruoli UI globali." },
              { prop: "comp", values: ["component variants"], description: "Override mirati per componente." },
              { prop: "page", values: ["gradients"], description: "Sfondi pagina di alto livello." },
              { prop: "brand", values: ["business aliases"], description: "Alias di naming prodotto." },
            ]}
          />
        </div>
      </div>
    </Section>
  )
}

function StorybookSidebar() {
  const [activeSectionId, setActiveSectionId] = useState<string>(STORYBOOK_NAV[0]?.id ?? "")
  const [isOpen, setIsOpen] = useState(true)
  const [isPaletteOpen, setIsPaletteOpen] = useState(true)
  const [isComponentsOpen, setIsComponentsOpen] = useState(true)

  useEffect(() => {
    const sections = STORYBOOK_NAV
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section))

    if (sections.length === 0) return

    const updateActiveFromScroll = () => {
      const offset = 160
      const nearest = sections
        .map((section) => ({ id: section.id, distance: Math.abs(section.getBoundingClientRect().top - offset) }))
        .sort((a, b) => a.distance - b.distance)[0]

      if (nearest?.id) setActiveSectionId(nearest.id)
    }

    const updateActiveWithRaf = () => {
      window.requestAnimationFrame(updateActiveFromScroll)
    }

    updateActiveFromScroll()
    window.addEventListener("scroll", updateActiveWithRaf, { passive: true })
    window.addEventListener("resize", updateActiveWithRaf)

    return () => {
      window.removeEventListener("scroll", updateActiveWithRaf)
      window.removeEventListener("resize", updateActiveWithRaf)
    }
  }, [])

  return (
    <aside className={cn("relative hidden lg:block shrink-0", isOpen ? "w-56" : "w-[26px]")}>
      <div
        className={cn(
          "fixed top-6 z-30",
          isOpen
            ? "flex h-[calc(100vh-3rem)] w-56 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3 pt-2 dark:border-slate-700 dark:bg-slate-900"
            : "w-[26px]"
        )}
        style={{ left: "max(1.5rem, calc((100vw - 1500px)/2 + 1.5rem))" }}
      >
        {/* Strip con bottone toggle */}
        <div className={cn("flex items-center justify-start", isOpen ? "mb-2 gap-2" : "mb-0")}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={isOpen ? "Chiudi sidebar" : "Apri sidebar"}
          >
            {isOpen ? <ChevronLeft className="w-[17px] h-[17px]" /> : <ChevronRight className="w-[17px] h-[17px]" />}
          </button>
          {isOpen ? <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Storybook</p> : null}
        </div>

        {/* Contenuto sidebar (sparisce quando chiuso) */}
        {isOpen && (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setIsPaletteOpen((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-md px-2 py-1 text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-900/20"
                aria-expanded={isPaletteOpen}
                aria-controls="palette-menu-group"
                title="Color Palette"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Palette className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider truncate">Color Palette</span>
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", !isPaletteOpen && "-rotate-90")} />
              </button>

              {isPaletteOpen && (
                <div id="palette-menu-group" className="space-y-1">
                  {PALETTE_NAV.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={() => setActiveSectionId(item.id)}
                      className={cn(
                        "block rounded-md px-2 py-1 text-[13px] transition-colors truncate",
                        activeSectionId === item.id
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                      )}
                      aria-current={activeSectionId === item.id ? "true" : undefined}
                      title={item.label}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}

              <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                onClick={() => setIsComponentsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                aria-expanded={isComponentsOpen}
                aria-controls="components-menu-group"
                title="Componenti (A-Z)"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider truncate">Componenti (A-Z)</span>
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", !isComponentsOpen && "-rotate-90")} />
              </button>

              {isComponentsOpen && (
                <div id="components-menu-group" className="space-y-1">
                  {COMPONENTS_NAV.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={() => setActiveSectionId(item.id)}
                      className={cn(
                        "block rounded-md px-2 py-1 text-[13px] transition-colors truncate",
                        activeSectionId === item.id
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                      )}
                      aria-current={activeSectionId === item.id ? "true" : undefined}
                      title={item.label}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </aside>
  )
}

function CardSection() {
  const [variant, setVariant] = useState<CardVariant>("default")
  const [tone, setTone] = useState<CardTone>("current")
  const [size, setSize] = useState<CardSize>("md")
  const [withImage, setWithImage] = useState(true)
  const [imagePos, setImagePos] = useState<"top" | "left">("top")
  const [animated, setAnimated] = useState(true)
  const [b1v, setB1v] = useState<ButtonVariant>("default")
  const [b1t, setB1t] = useState<ButtonTone>("blue")
  const [b2v, setB2v] = useState<ButtonVariant>("ghost")
  const [b2t, setB2t] = useState<ButtonTone>("current")
  const [dataName, setDataName] = useState("storybook-card")
  const [customClass, setCustomClass] = useState("")
  const isLeftImage = withImage && variant !== "horizontal" && imagePos === "left"
  const body = (
    <Card
      variant={variant}
      tone={tone}
      size={size}
      dataName={dataName || undefined}
      className={`${(variant === "horizontal" && withImage) || isLeftImage ? "overflow-hidden" : ""} ${isLeftImage ? "flex flex-row" : ""} ${customClass}`.trim()}
    >
      {withImage && variant !== "horizontal" && imagePos === "top" ? <div className="h-28 bg-gradient-to-r from-blue-600 to-violet-600" /> : null}
      {withImage && variant === "horizontal" ? <CardMedia className="w-28 bg-gradient-to-b from-blue-600 to-violet-600" /> : null}
      {isLeftImage ? <CardMedia className="w-28 bg-gradient-to-b from-blue-600 to-violet-600" /> : null}
      <div className={withImage && (variant === "horizontal" || imagePos === "left") ? "flex-1" : ""}>
        <CardHeader>
          <CardTitle>Card demo</CardTitle>
          <CardDescription>Con immagine, animazione e footer configurabile.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Variant {variant} - Tone {tone} - Size {size}</p>
        </CardContent>
        <CardFooter className="gap-2">
          <Button variant={b1v} tone={b1t} size="sm">
            Primaria
          </Button>
          <Button variant={b2v} tone={b2t} size="sm">
            Secondaria
          </Button>
        </CardFooter>
      </div>
    </Card>
  )

  return (
    <Section id="card" title="Card">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="variant" value={variant} options={CARD_VARIANTS} onChange={setVariant} />
            <Ctl label="tone" value={tone} options={CARD_COLORS} onChange={setTone} />
            <Ctl label="size" value={size} options={CARD_SIZES} onChange={setSize} />
            {variant !== "horizontal" ? <Ctl label="image position" value={imagePos} options={["top", "left"]} onChange={setImagePos} /> : null}
            <Toggle label="show image" checked={withImage} onChange={setWithImage} />
            <Toggle label="animated section" checked={animated} onChange={setAnimated} />
            <Ctl label="btn1 variant" value={b1v} options={BTN_VARIANTS} onChange={setB1v} />
            <Ctl label="btn1 tone" value={b1t} options={BTN_TONES} onChange={setB1t} />
            <Ctl label="btn2 variant" value={b2v} options={BTN_VARIANTS} onChange={setB2v} />
            <Ctl label="btn2 tone" value={b2t} options={BTN_TONES} onChange={setB2t} />
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">dataName</span>
              <input value={dataName} onChange={(e) => setDataName(e.target.value)} className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">className</span>
              <input value={customClass} onChange={(e) => setCustomClass(e.target.value)} className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </label>
          </div>
        </Panel>
        <Panel>
          <AnimatedSection disabled={!animated} once={false}>
            <div className="max-w-xl">{body}</div>
          </AnimatedSection>
        </Panel>
      </div>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "variant", values: [...CARD_VARIANTS] },
            { prop: "tone", values: [...CARD_COLORS] },
            { prop: "size", values: [...CARD_SIZES] },
            { prop: "imagePos", values: ["top", "left"] },
            { prop: "CardMedia", values: ["slot immagine per horizontal"] },
            { prop: "button.variant", values: [...BTN_VARIANTS] },
            { prop: "button.tone", values: [...BTN_TONES] },
            { prop: "dataName", values: ["string"] },
            { prop: "className", values: ["string"] },
          ]}
        />
      </div>
    </Section>
  )
}

function HeroSection() {
  const [titleColor, setTitleColor] = useState<Tone>("current")
  const [subtitleColor, setSubtitleColor] = useState<Tone>("current")
  const [align, setAlign] = useState<HeroAlign>("center")
  const [heroSize, setHeroSize] = useState<"sm" | "md" | "lg">("md")
  const [titleSize, setTitleSize] = useState<keyof typeof HERO_SIZES>("medium")
  const [subtitleSize, setSubtitleSize] = useState<keyof typeof SUBTITLE_SIZES>("medium")

  return (
    <Section id="hero" title="Hero">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="size" value={heroSize} options={["sm", "md", "lg"]} onChange={(v) => setHeroSize(v as "sm" | "md" | "lg")} />
            <Ctl label="title color" value={titleColor} options={CARD_TONES} onChange={setTitleColor} />
            <Ctl label="subtitle color" value={subtitleColor} options={CARD_TONES} onChange={setSubtitleColor} />
            <Ctl label="align" value={align} options={HERO_ALIGNS} onChange={setAlign} />
            <Ctl label="title size" value={titleSize} options={Object.keys(HERO_SIZES) as Array<keyof typeof HERO_SIZES>} onChange={setTitleSize} />
            <Ctl label="subtitle size" value={subtitleSize} options={Object.keys(SUBTITLE_SIZES) as Array<keyof typeof SUBTITLE_SIZES>} onChange={setSubtitleSize} />
          </div>
        </Panel>
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <Hero
            useVideo={false}
            posterSrc="https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777467700/cagliar_dallalto_-_stefano_garau_-_shutterstock.com__1_mzsy2n.jpg"
            size={heroSize}
            titleColor={titleColor}
            subtitleColor={subtitleColor}
            contentAlign={align}
            titleClassName={HERO_SIZES[titleSize]}
            subtitleClassName={SUBTITLE_SIZES[subtitleSize]}
          />
        </div>
      </div>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "size", values: ["sm", "md", "lg"] },
            { prop: "titleColor", values: [...CARD_TONES] },
            { prop: "subtitleColor", values: [...CARD_TONES] },
            { prop: "contentAlign", values: [...HERO_ALIGNS] },
            { prop: "titleSize", values: Object.keys(HERO_SIZES) },
            { prop: "subtitleSize", values: Object.keys(SUBTITLE_SIZES) },
          ]}
        />
      </div>
    </Section>
  )
}

function makeItems(total: number): CardGridItem[] {
  const kind: Array<"running" | "trekking" | "trip"> = ["running", "trekking", "trip"]
  return Array.from({ length: total }).map((_, i) => {
    const day = ((i % 28) + 1)
    const dateObj = new Date(2026, 3, day)
    const dateStr = dateObj.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })
    return {
      id: `item-${i + 1}`,
      title: `Item ${i + 1}`,
      href: "#",
      type: kind[i % 3],
      date: dateStr,
      description: `Descrizione card ${i + 1}`,
      image:
        i % 3 === 0
          ? "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80"
          : i % 3 === 1
            ? "https://images.pexels.com/photos/355465/pexels-photo-355465.jpeg?auto=compress&cs=tinysrgb&w=800"
            : "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80",
    }
  })
}

function makeActivityItems(total: number): CardGridItem[] {
   return Array.from({ length: total }).map((_, i) => {
     const day = (i % 28) + 1
     const dateObj = new Date(2026, 3, day)
     const dateStr = dateObj.toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" })
     const km = (6 + i * 1.3).toFixed(2)
     // Nota: Non includiamo 'image' per le activity card poiché la foto viene mostrata solo nella modale
     // Usiamo 'hasPhoto' per mostrare il badge "Foto" sulla card
     const withPhoto = i % 3 !== 0
     return {
       id: `activity-${i + 1}`,
       title: `Running Activity ${i + 1}`,
       href: "#",
       type: i % 4 === 0 ? "track_running" : "running",
       date: dateStr,
       distance: `${km} km`,
       duration: `${42 + i}:${String((i * 7) % 60).padStart(2, "0")}`,
       pace: `5:${String((i * 5) % 60).padStart(2, "0")} min/km`,
       kcal: `${450 + i * 12}`,
       hasPhoto: withPhoto,
     }
   })
 }

function makeFlipCardItems(total: number): CardGridItem[] {
  const icons = [Activity, Code2, Lightbulb, Plane, Puzzle]
  return Array.from({ length: total }).map((_, i) => ({
    id: `flip-card-${i + 1}`,
    title: `Elemento ${i + 1}`,
    href: "#",
    description: `Descrizione del flip-card elemento ${i + 1}. Clicca per flipare e scoprire il contenuto.`,
    icon: icons[i % icons.length],
  }))
}

function CardGridSection() {
   const [total, setTotal] = useState("8")
   const [visible, setVisible] = useState("4")
   const [maxCards, setMaxCards] = useState("")
   const [tone, setTone] = useState<Tone>("current")
   const [variant, setVariant] = useState<"default" | "activity" | "flip-card">("default")
   const [flipCardOrientation, setFlipCardOrientation] = useState<"horizontal" | "vertical">("horizontal")
   const [flipCardWidth, setFlipCardWidth] = useState<"small" | "medium" | "large">("large")
    const [flipCardColumns, setFlipCardColumns] = useState<"1" | "2" | "3" | "4">("3")
    const [flipCardCenterIncompleteRow, setFlipCardCenterIncompleteRow] = useState(true)
   const [flipCardItemCount, setFlipCardItemCount] = useState<"1" | "2" | "3" | "4" | "5">("3")
   const [flipCardImageUrl, setFlipCardImageUrl] = useState("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80")
   const [badgePos, setBadgePos] = useState<"border" | "date-row">("border")
   const [badgeSize, setBadgeSize] = useState<"small" | "medium" | "large">("small")
   const [badgeRounded, setBadgeRounded] = useState(true)
   const [activityTextColor, setActivityTextColor] = useState<Tone>("current")
   const [showDate, setShowDate] = useState(true)
   const [showBadge, setShowBadge] = useState(true)
   const [showBadgeOnImage, setShowBadgeOnImage] = useState(false)
   const [showDesc, setShowDesc] = useState(false)
   const [cardHeight, setCardHeight] = useState<"small" | "medium" | "large">("medium")
    const items = useMemo(() => {
      if (variant === "activity") return makeActivityItems(Number(total))
      if (variant === "flip-card") return makeFlipCardItems(Number(flipCardItemCount))
      return makeItems(Number(total))
    }, [total, variant, flipCardItemCount])

  return (
    <Section id="cardgrid" title="CardGrid">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
           <div className="grid gap-2">
             <Ctl label="tone" value={tone} options={CARD_TONES} onChange={setTone} />
             <Ctl label="variant" value={variant} options={["default", "activity", "flip-card"]} onChange={setVariant} />
             {(variant === "default" || variant === "flip-card") && (
               <Ctl label="cardHeight" value={cardHeight} options={["small", "medium", "large"]} onChange={(v) => setCardHeight(v as "small" | "medium" | "large")} />
             )}
             {variant === "activity" && (
               <>
                 <Ctl label="photo badge pos" value={badgePos} options={["border", "date-row"]} onChange={(v) => setBadgePos(v as "border" | "date-row")} />
                 <Ctl label="photo badge size" value={badgeSize} options={["small", "medium", "large"]} onChange={(v) => setBadgeSize(v as "small" | "medium" | "large")} />
                 <Ctl label="activity text color" value={activityTextColor} options={CARD_TONES} onChange={(v) => setActivityTextColor(v as Tone)} />
                 <Toggle label="photo badge rounded" checked={badgeRounded} onChange={setBadgeRounded} />
               </>
             )}
              {variant === "flip-card" && (
                <>
                  <Ctl label="orientation" value={flipCardOrientation} options={["horizontal", "vertical"]} onChange={(v) => setFlipCardOrientation(v as "horizontal" | "vertical")} />
                   <Ctl label="flip card width" value={flipCardWidth} options={["small", "medium", "large"]} onChange={(v) => setFlipCardWidth(v as "small" | "medium" | "large")} />
                  <Ctl label="flip card columns" value={flipCardColumns} options={["1", "2", "3", "4"]} onChange={(v) => setFlipCardColumns(v as "1" | "2" | "3" | "4")} />
                  <Toggle label="center incomplete row" checked={flipCardCenterIncompleteRow} onChange={setFlipCardCenterIncompleteRow} />
                  <Ctl label="card count" value={flipCardItemCount} options={["1", "2", "3", "4", "5"]} onChange={setFlipCardItemCount} />
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="uppercase tracking-wider text-slate-400 font-semibold">image url</span>
                    <input value={flipCardImageUrl} onChange={(e) => setFlipCardImageUrl(e.target.value)} className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                  </label>
                </>
              )}
              <Ctl label="total cards" value={total} options={["3", "4", "6", "8", "10", "12"]} onChange={setTotal} />
              <Ctl label="visible cards" value={visible} options={["3", "4", "6", "8", "10", "12"]} onChange={setVisible} />
              {variant !== "flip-card" && (
                <Ctl label="maxCards" value={maxCards} options={["", "1", "2", "3", "4", "6", "8", "10", "12"]} onChange={setMaxCards} />
              )}
              <Toggle label="show date" checked={showDate} onChange={setShowDate} />
              <Toggle label="show badge" checked={showBadge} onChange={setShowBadge} />
              <Toggle label="badge on image" checked={showBadgeOnImage} onChange={setShowBadgeOnImage} />
              <Toggle label="show desc" checked={showDesc} onChange={setShowDesc} />
           </div>
        </Panel>
         <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
           <CardGrid
             title="CardGrid riusabile"
             subtitle={variant === "flip-card" ? `Flip Cards - ${flipCardItemCount} elementi` : `Totali ${total}${maxCards ? `, max ${maxCards}` : `, visibili ${visible}`}`}
             items={items}
             variant={variant}
             tone={tone}
             cardHeight={variant === "activity" ? undefined : cardHeight}
             visibleItems={variant !== "flip-card" && maxCards ? undefined : Number(visible)}
             showVisibilityToggle={variant !== "flip-card" && !maxCards}
             showMoreLabel="Mostra tutte"
             showLessLabel="Mostra meno"
             useMotion={false}
             showDate={showDate}
             showTypeBadge={variant === "default" ? showBadge : false}
             showBadgeOnImage={showBadgeOnImage}
             showDescription={variant === "default" ? showDesc : false}
             maxCards={variant !== "flip-card" && maxCards ? Number(maxCards) : undefined}
             activityPhotoBadgePosition={variant === "activity" ? badgePos : undefined}
             activityPhotoBadgeSize={variant === "activity" ? badgeSize : undefined}
             activityPhotoBadgeRounded={variant === "activity" ? badgeRounded : undefined}
             activityTextColor={variant === "activity" ? activityTextColor : undefined}
             flipCardOrientation={variant === "flip-card" ? flipCardOrientation : undefined}
             flipCardWidth={variant === "flip-card" ? flipCardWidth : undefined}
             flipCardColumns={variant === "flip-card" ? Number(flipCardColumns) as 1 | 2 | 3 | 4 : undefined}
             flipCardCenterIncompleteRow={variant === "flip-card" ? flipCardCenterIncompleteRow : undefined}
             flipCardImageSrc={variant === "flip-card" ? flipCardImageUrl : undefined}
             flipCardImageAlt={variant === "flip-card" ? "Demo flip-card" : undefined}
             sectionClassName="px-6 py-8 bg-white dark:bg-slate-900"
           />
         </div>
      </div>

       <Panel>
         <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
           <p className="font-semibold uppercase tracking-wider"> Data attività:</p>
           <p>Le card mostrano la data dell&apos;attività nel formato italiano (es: &quot;1 aprile 2026&quot;). Utilizza il toggle <span className="font-medium">&quot;show date&quot;</span> per mostrare o nascondere le date sulle card.</p>
           <p><span className="font-medium">&quot;badge on image&quot;</span> sposta il BadgeChip dalla riga titolo alla parte alta della foto (overlay).</p>
           <p><span className="font-medium">Variant &quot;activity&quot;</span>: card per attività running con foto opzionale, titolo, data, distanza e tempo.</p>
           <p className="mt-3 font-semibold uppercase tracking-wider"> maxCards:</p>
           <p>La prop <span className="font-medium">maxCards</span> limita il numero di card visualizzate in modo diretto (senza toggle &quot;Mostra tutte&quot;). Utile per mostrare un numero fisso di card, es: 4 card per riga. Lascia vuoto per usare il sistema di pagina con toggle.</p>
         </div>
       </Panel>

         <div className="mt-4">
           <PropsLegend
             items={[
               { prop: "tone", values: [...CARD_TONES] },
               { prop: "variant", values: ["default", "activity", "flip-card"] },
               ...(variant !== "activity" ? [{ prop: "cardHeight", values: ["small", "medium", "large"] }] : []),
               { prop: "total cards", values: ["3", "4", "6", "8", "10", "12"] },
               { prop: "visible cards", values: ["3", "4", "6", "8", "10", "12"] },
               ...(variant !== "flip-card" ? [{ prop: "maxCards", values: ["", "1", "2", "3", "4", "6", "8", "10", "12"] }] : []),
               ...(variant === "activity" ? [
                 { prop: "activityPhotoBadgePosition", values: ["border", "date-row"] },
                 { prop: "activityPhotoBadgeSize", values: ["small", "medium", "large"] },
                 { prop: "activityPhotoBadgeRounded", values: ["true", "false"] },
                 { prop: "activityTextColor", values: [...CARD_TONES] },
               ] : []),
               { prop: "showDate", values: ["true", "false"] },
               { prop: "showTypeBadge", values: ["true", "false"] },
               { prop: "showBadgeOnImage", values: ["true", "false"] },
               { prop: "showDescription", values: ["true", "false"] },
               ...(variant === "flip-card" ? [
                 { prop: "flipCardOrientation", values: ["horizontal", "vertical"], description: "Orientation per il flip-card (vertical = 1 colonna)" },
                  { prop: "flipCardWidth", values: ["small (50%)", "medium (75%)", "large (100%)"], description: "Larghezza card su desktop" },
                  { prop: "flipCardColumns", values: ["1", "2", "3", "4"], description: "Numero di card per riga su desktop" },
                  { prop: "flipCardCenterIncompleteRow", values: ["true", "false"], description: "Centra l'ultima riga se incompleta" },
                 { prop: "flipCardImageSrc", values: ["string (URL)"], description: "URL immagine da spezzare per il background delle card" },
                 { prop: "flipCardImageAlt", values: ["string"], description: "Testo alt per accessibilità" },
               ] : []),
             ]}
           />
         </div>
    </Section>
  )
}

function CarouselShowcaseSection() {
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal")
  const [gap, setGap] = useState<CarouselGap>("md")
  const [perView, setPerView] = useState<"1" | "2" | "3" | "4">("3")
  const [loop, setLoop] = useState(false)
  const [controls, setControls] = useState(true)
  const [dots, setDots] = useState(true)
  const [desktopArrows, setDesktopArrows] = useState<ArrowsPosition>("sides")
  const [mobileArrows, setMobileArrows] = useState<ArrowsPosition>("sides")
  const [mode, setMode] = useState<"items" | "children">("items")
  const [buttonVariant, setButtonVariant] = useState<ButtonVariant>("default")
  const [buttonTone, setButtonTone] = useState<ButtonTone>("white")
  const [buttonSize, setButtonSize] = useState<ButtonSize>("default")
  const [sectionTitle, setSectionTitle] = useState("Esploriamo assieme")
  const [sectionDescription, setSectionDescription] = useState("Demo del nuovo CarouselSection con card configurabile")
  const [cardImage, setCardImage] = useState("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1400&q=80")
  const [cardAccentLabel, setCardAccentLabel] = useState("Road to Marathon")
  const [cardAccentColor, setCardAccentColor] = useState<(typeof CAROUSEL_ACCENT_COLORS)[number]>("text-blue-300")
  const [cardTitle, setCardTitle] = useState("Titolo card fallback")
  const [cardDescription, setCardDescription] = useState("Descrizione fallback della card")
  const [cardButtonText, setCardButtonText] = useState("Vai alla sezione")
  const [cardButtonHref, setCardButtonHref] = useState("/exploration")
  const [cardImageHeight, setCardImageHeight] = useState<(typeof CAROUSEL_IMAGE_HEIGHTS)[number]>("h-[18rem]")
  const slides = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), [])
  const sectionSlides = useMemo(
    () => [
      { id: "running" },
      { id: "trekking" },
      { id: "trips" },
    ],
    []
  )

  return (
    <Section id="carousel" title="Carousel">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 mb-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="mode" value={mode} options={["items", "children"]} onChange={setMode} />
            <Ctl label="orientation" value={orientation} options={["horizontal", "vertical"]} onChange={setOrientation} />
            <Ctl label="gap" value={gap} options={["sm", "md", "lg"] as CarouselGap[]} onChange={setGap} />
            <Ctl label="cards/view" value={perView} options={["1", "2", "3", "4"]} onChange={setPerView} />
            <Toggle label="show controls" checked={controls} onChange={setControls} />
            <Toggle label="show dots" checked={dots} onChange={setDots} />
            <Toggle label="loop" checked={loop} onChange={setLoop} />
            <Ctl label="desktop arrows" value={desktopArrows} options={CAROUSEL_ARROW_POSITIONS} onChange={setDesktopArrows} />
            <Ctl label="mobile arrows" value={mobileArrows} options={CAROUSEL_ARROW_POSITIONS} onChange={setMobileArrows} />
          </div>
        </Panel>
        <Panel>
          <div className={cn("min-w-0", orientation === "vertical" ? "h-[320px]" : "") }>
            {mode === "items" ? (
              <CarouselCards
                items={slides}
                title="CarouselCards title"
                description="Descrizione configurabile del carousel"
                orientation={orientation}
                gap={gap}
                cardsPerView={Number(perView) as 1 | 2 | 3 | 4}
                showControls={controls}
                showDots={dots}
                arrowsPosition={desktopArrows}
                arrowsPositionMobile={mobileArrows}
                opts={{ align: "start", loop }}
                className={orientation === "vertical" ? "h-full" : ""}
                renderItem={(n) => (
                  <Card className="h-36">
                    <CardHeader>
                      <CardTitle>Slide {n}</CardTitle>
                      <CardDescription>Mode items</CardDescription>
                    </CardHeader>
                  </Card>
                )}
              />
            ) : (
              <CarouselCards
                title="CarouselCards title"
                description="Descrizione configurabile del carousel"
                orientation={orientation}
                gap={gap}
                cardsPerView={Number(perView) as 1 | 2 | 3 | 4}
                showControls={controls}
                showDots={dots}
                arrowsPosition={desktopArrows}
                arrowsPositionMobile={mobileArrows}
                opts={{ align: "start", loop }}
                className={orientation === "vertical" ? "h-full" : ""}
              >
                {slides.map((n) => (
                  <Card key={n} className="h-36">
                    <CardHeader>
                      <CardTitle>Slide {n}</CardTitle>
                      <CardDescription>Mode children</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </CarouselCards>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4 mb-4">
        <Panel>
          <div className="grid gap-2">
            <TxtCtl label="section title" value={sectionTitle} onChange={setSectionTitle} />
            <TxtCtl label="section description" value={sectionDescription} onChange={setSectionDescription} />
            <TxtCtl label="card image" value={cardImage} onChange={setCardImage} placeholder="https://..." />
            <TxtCtl label="card accent label" value={cardAccentLabel} onChange={setCardAccentLabel} />
            <Ctl label="card accent color" value={cardAccentColor} options={CAROUSEL_ACCENT_COLORS} onChange={setCardAccentColor} />
            <TxtCtl label="card title" value={cardTitle} onChange={setCardTitle} />
            <TxtCtl label="card description" value={cardDescription} onChange={setCardDescription} />
            <TxtCtl label="button text" value={cardButtonText} onChange={setCardButtonText} />
            <TxtCtl label="button href" value={cardButtonHref} onChange={setCardButtonHref} placeholder="/exploration" />
            <Ctl label="image height" value={cardImageHeight} options={CAROUSEL_IMAGE_HEIGHTS} onChange={setCardImageHeight} />
            <Ctl label="button variant" value={buttonVariant} options={BTN_VARIANTS} onChange={setButtonVariant} />
            <Ctl label="button tone" value={buttonTone} options={BTN_TONES} onChange={setButtonTone} />
            <Ctl label="button size" value={buttonSize} options={BTN_SIZES} onChange={setButtonSize} />
          </div>
        </Panel>
        <Panel>
          <UICarouselSection
            items={sectionSlides}
            title={sectionTitle}
            description={sectionDescription}
            showDots={dots}
            arrowsPosition={desktopArrows}
            arrowsPositionMobile={mobileArrows}
            cardImage={cardImage}
            cardAccentLabel={cardAccentLabel}
            cardAccentColor={cardAccentColor}
            cardTitle={cardTitle}
            cardDescription={cardDescription}
            cardButtonText={cardButtonText}
            cardButtonHref={cardButtonHref}
            cardButtonVariant={buttonVariant}
            cardButtonTone={buttonTone}
            cardButtonSize={buttonSize}
            cardImageHeight={cardImageHeight}
          />
        </Panel>
      </div>

      <Panel>
        <p className="text-sm mb-3">Core API variant (Carousel + CarouselContent + CarouselItem)</p>
        <Carousel opts={{ align: "start", loop: true }} className="px-10" gap="sm">
          <CarouselContent>
            {Array.from({ length: 6 }).map((_, i) => (
              <CarouselItem key={i} className="basis-1/2 md:basis-1/3">
                <div className="h-24 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  Core {i + 1}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious tone="blue" />
          <CarouselNext tone="blue" />
        </Carousel>
      </Panel>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "mode", values: ["items", "children"] },
            { prop: "orientation", values: ["horizontal", "vertical"] },
            { prop: "gap", values: ["sm", "md", "lg"] },
            { prop: "cardsPerView", values: ["1", "2", "3", "4"] },
            { prop: "loop", values: ["true", "false"] },
            { prop: "showControls", values: ["true", "false"] },
              { prop: "showDots", values: ["true", "false"] },
              { prop: "arrowsPosition", values: [...CAROUSEL_ARROW_POSITIONS] },
              { prop: "arrowsPositionMobile", values: [...CAROUSEL_ARROW_POSITIONS] },
              { prop: "title", values: ["string"] },
              { prop: "description", values: ["string"] },
              { prop: "cardImage", values: ["url"] },
              { prop: "cardAccentLabel", values: ["Road to Marathon", "string"] },
              { prop: "cardAccentColor", values: ["text-blue-300", "text-emerald-300", "text-violet-300"] },
              { prop: "cardTitle", values: ["string"] },
              { prop: "cardDescription", values: ["string"] },
              { prop: "cardButtonText", values: ["string"] },
              { prop: "cardButtonVariant", values: [...BTN_VARIANTS] },
              { prop: "cardButtonTone", values: [...BTN_TONES] },
              { prop: "cardButtonSize", values: [...BTN_SIZES] },
          ]}
        />
      </div>
    </Section>
  )
}

function DividerSection() {
  const [tone, setTone] = useState<Tone>("current")
  const [size, setSize] = useState<"sm" | "md" | "lg">("md")
  const [iconType, setIconType] = useState<typeof DIVIDER_ICON_TYPES[number]>("running")

  return (
    <Section id="divider" title="Divider">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="icon type" value={iconType} options={[...DIVIDER_ICON_TYPES]} onChange={setIconType} />
            <Ctl label="tone" value={tone} options={CARD_TONES} onChange={setTone} />
            <Ctl label="size" value={size} options={["sm", "md", "lg"]} onChange={setSize} />
          </div>
        </Panel>
        <Panel>
          <Divider
            iconType={iconType}
            tone={tone}
            size={size}
            backgroundClassName="bg-white dark:bg-slate-900"
          />
        </Panel>
      </div>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "tone", values: [...CARD_TONES] },
            { prop: "size", values: ["sm", "md", "lg"] },
            { prop: "iconType", values: [...DIVIDER_ICON_TYPES] },
          ]}
        />
      </div>
    </Section>
  )
}

function ButtonSection() {
  return (
    <Section id="button" title="Button">
      <Panel>
        <p className="text-xs text-slate-500 mb-3">Combinazioni variant x tone</p>
        <div className="space-y-2 mb-4">
          {BTN_VARIANTS.map((variant) => (
            <div key={variant} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {BTN_TONES.map((tone) => (
                <div key={`${variant}-${tone}`} className={tone === "white" || tone === "transparent-white" ? "bg-slate-900 p-2 rounded" : "p-2"}>
                  <Button variant={variant} tone={tone} size="sm" className="w-full">
                    {variant}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mb-2">Combinazioni size</p>
        <div className="flex flex-wrap items-end gap-2">
          {(["xs", "sm", "default", "lg", "xl", "icon"] as const).map((size) => (
            <Button key={size} size={size} tone="blue">
              {size === "icon" ? ">" : size}
            </Button>
          ))}
        </div>
      </Panel>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "variant", values: [...BTN_VARIANTS] },
            { prop: "tone", values: [...BTN_TONES] },
            { prop: "size", values: ["xs", "sm", "default", "lg", "xl", "icon"] },
          ]}
        />
      </div>
    </Section>
  )
}

function InputSelectSection() {
  const [selected, setSelected] = useState("")

  return (
    <Section id="input-select" title="Input + Select">
      <div className="grid md:grid-cols-2 gap-4">
        <Panel>
          <Label htmlFor="sb-input">Input</Label>
          <Input id="sb-input" placeholder="Testo" className="mt-2" />
        </Panel>
        <Panel>
          <Label>Select</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Scegli..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="run">Running</SelectItem>
              <SelectItem value="trk">Trekking</SelectItem>
              <SelectItem value="trip">Trip</SelectItem>
            </SelectContent>
          </Select>
        </Panel>
      </div>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "Input.type", values: ["text", "email", "password", "number", "search", "tel", "url"] },
            { prop: "Select.value", values: ["run", "trk", "trip"] },
          ]}
        />
      </div>
    </Section>
  )
}

function LoaderSection() {
  const [showLoader, setShowLoader] = useState(false)
  const [loaderTone, setLoaderTone] = useState<Tone>("purple")
  const [loaderSize, setLoaderSize] = useState<(typeof LOADER_SIZES)[number]>("md")

  return (
    <Section id="loader" title="Loader">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="tone" value={loaderTone} options={LOADER_TONES} onChange={setLoaderTone} />
            <Ctl label="size" value={loaderSize} options={LOADER_SIZES} onChange={setLoaderSize} />
            <Button
              tone="purple"
              onClick={() => {
                setShowLoader(true)
                setTimeout(() => setShowLoader(false), 1800)
              }}
            >
              Mostra loader fullscreen
            </Button>
          </div>
        </Panel>
        <Panel>
          <p className="text-xs text-slate-500 mb-3">Combinazioni tone x size</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LOADER_TONES.map((tone) =>
              LOADER_SIZES.map((size) => (
                <div key={`${tone}-${size}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-950">
                  <InlineLoader tone={tone} size={size} />
                  <p className="text-[11px] mt-2 text-center text-slate-500">
                    {tone} / {size}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
        {showLoader ? <Loader tone={loaderTone} size={loaderSize} /> : null}
      </div>
      <div className="mt-4">
        <PropsLegend items={[{ prop: "tone", values: [...LOADER_TONES] }, { prop: "size", values: [...LOADER_SIZES] }]} />
      </div>
    </Section>
  )
}
function InlineLoader({ tone, size }: { tone: Tone; size: (typeof LOADER_SIZES)[number] }) {
  const toneClass = {
    current: { primary: "border-t-blue-600 border-r-blue-600", secondary: "border-b-blue-400" },
    blue: { primary: "border-t-blue-600 border-r-blue-600", secondary: "border-b-blue-400" },
    purple: { primary: "border-t-violet-700 border-r-violet-700", secondary: "border-b-violet-400" },
    black: {
      primary: "border-t-slate-900 border-r-slate-900 dark:border-t-slate-100 dark:border-r-slate-100",
      secondary: "border-b-slate-500 dark:border-b-slate-300",
    },
  }[tone]

  const sizeClass = {
    sm: { wrapper: "w-10 h-10", inner: "inset-1.5" },
    md: { wrapper: "w-14 h-14", inner: "inset-2" },
    lg: { wrapper: "w-20 h-20", inner: "inset-3" },
  }[size]

  return (
    <div className={`relative mx-auto ${sizeClass.wrapper}`}>
      <div className={`absolute inset-0 border-4 border-transparent ${toneClass.primary} rounded-full animate-spin`} />
      <div
        className={`absolute ${sizeClass.inner} border-4 border-transparent ${toneClass.secondary} rounded-full animate-spin`}
        style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
      />
    </div>
  )
}

function HeaderFooterSection() {
  const [tone, setTone] = useState<Tone>("current")
  const [headerBg, setHeaderBg] = useState<BgKey>("navy")
  const [footerBg, setFooterBg] = useState<BgKey>("navy")

  const headerIsWhite = headerBg === "white"
  const computedHeaderTone: Tone = headerIsWhite ? "black" : tone

  return (
    <Section id="header-footer" title="Header + Footer">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="tone" value={tone} options={CARD_TONES} onChange={setTone} />
            <Ctl label="header bg" value={headerBg} options={Object.keys(BG_OPTIONS) as BgKey[]} onChange={setHeaderBg} />
            <Ctl label="footer bg" value={footerBg} options={Object.keys(BG_OPTIONS) as BgKey[]} onChange={setFooterBg} />
          </div>
        </Panel>
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <Header
              tone={computedHeaderTone}
              backgroundClassName={BG_OPTIONS[headerBg]}
              className={headerIsWhite ? "text-slate-900 border-b-2 border-slate-900" : ""}
            />
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <Footer
              tone={tone}
              backgroundClassName={BG_OPTIONS[footerBg]}
              className={footerBg === "white" ? "mt-0 text-slate-900" : "mt-0"}
            />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "tone", values: [...CARD_TONES] },
            { prop: "header.backgroundClassName", values: Object.keys(BG_OPTIONS) },
            { prop: "footer.backgroundClassName", values: Object.keys(BG_OPTIONS) },
            { prop: "header rule", values: ["if white bg -> navy border + navy text"] },
          ]}
        />
      </div>
    </Section>
  )
}

function ActivityComponentsSection() {
  const [tone, setTone] = useState<Tone>("current")
  const [columns, setColumns] = useState<"2" | "3" | "4">("3")

  return (
    <Section id="activity-components" title="Activity Components (Modal, Wrapper, Photos)">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="tone" value={tone} options={CARD_TONES} onChange={setTone} />
            <Ctl label="photo columns" value={columns} options={["2", "3", "4"]} onChange={setColumns} />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <p className="text-xs text-slate-500 mb-2">ActivityPhotos</p>
            <ActivityPhotos photos={[...MOCK_PHOTOS]} columns={Number(columns) as 2 | 3 | 4} tone={tone} />
          </Panel>

          <Panel>
            <p className="text-xs text-slate-500 mb-2">ActivityClickWrapper</p>
            <ActivityClickHandler activityId="storybook-demo-id" detailsPageUrl="/exploration/running" tone={tone}>
              <Card className="max-w-sm cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Apri dettaglio activity</CardTitle>
                  <CardDescription>Desktop apre modal, mobile naviga alla pagina dettaglio.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Click su questa card per testare il wrapper.</p>
                </CardContent>
              </Card>
            </ActivityClickHandler>
          </Panel>
        </div>
      </div>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "ActivityPhotos.columns", values: ["2", "3", "4"] },
            { prop: "ActivityPhotos.tone", values: [...CARD_TONES] },
            { prop: "ActivityClickHandler.activityId", values: ["string"] },
            { prop: "ActivityClickHandler.detailsPageUrl", values: ["string"] },
            { prop: "ActivityClickHandler.tone", values: [...CARD_TONES] },
          ]}
        />
      </div>
    </Section>
  )
}

function ModalSection() {
  const [isOpen, setIsOpen] = useState(false)
  const [tone, setTone] = useState<Tone>("current")
  const [activityId, setActivityId] = useState("")
  const [detailsUrl, setDetailsUrl] = useState("/exploration/running")
  const [className, setClassName] = useState("")
  const [contentClassName, setContentClassName] = useState("")
  const [withFallbackPhoto, setWithFallbackPhoto] = useState(false)
  const [availableIds, setAvailableIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const loadIds = async () => {
      try {
        const response = await fetch("/api/activities/all")
        if (!response.ok) return
        const payload = await response.json()
        const activities = Array.isArray(payload?.data?.activities) ? payload.data.activities : []
        const ids = activities
          .map((item: { _id?: string; id?: string | number }) => String(item?._id ?? item?.id ?? ""))
          .filter((id: string) => id.length > 0)
          .slice(0, 30)
        if (cancelled) return
        setAvailableIds(ids)
        if (!activityId && ids.length > 0) {
          setActivityId(ids[0])
        }
      } catch {
        if (!cancelled) setAvailableIds([])
      }
    }
    void loadIds()
    return () => {
      cancelled = true
    }
  }, [activityId])

  const fallbackPhoto: ApiPhoto | null = withFallbackPhoto
    ? {
        publicId: "storybook/modal-fallback",
        secureUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
      }
    : null

  return (
    <Section id="modal" title="Modal">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="tone" value={tone} options={CARD_TONES} onChange={setTone} />
            {availableIds.length > 0 ? <Ctl label="activityId preset" value={activityId} options={availableIds} onChange={setActivityId} /> : null}
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">activityId</span>
              <input value={activityId} onChange={(e) => setActivityId(e.target.value)} className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">detailsPageUrl</span>
              <input value={detailsUrl} onChange={(e) => setDetailsUrl(e.target.value)} className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">className</span>
              <input value={className} onChange={(e) => setClassName(e.target.value)} className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">contentClassName</span>
              <input value={contentClassName} onChange={(e) => setContentClassName(e.target.value)} className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </label>
            <Toggle label="fallback photo" checked={withFallbackPhoto} onChange={setWithFallbackPhoto} />
            <Toggle label="isOpen" checked={isOpen} onChange={setIsOpen} />
            <Button tone="blue" onClick={() => setIsOpen(true)}>
              Apri modal
            </Button>
            {availableIds.length === 0 ? <p className="text-[11px] text-amber-600">Nessun preset ID disponibile dall&apos;API. Inserisci activityId manualmente.</p> : null}
          </div>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-500">Modal con le stesse props di ActivityDetailModal, pronta per sostituzione diretta.</p>
        </Panel>
      </div>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "activityId", values: ["string"] },
            { prop: "isOpen", values: ["boolean"] },
            { prop: "onClose", values: ["function"] },
            { prop: "detailsPageUrl", values: ["string"] },
            { prop: "photo", values: ["ApiPhoto | null"] },
            { prop: "className", values: ["string"] },
            { prop: "contentClassName", values: ["string"] },
            { prop: "tone", values: [...CARD_TONES] },
          ]}
        />
      </div>

      <Modal
        activityId={activityId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        detailsPageUrl={detailsUrl}
        photo={fallbackPhoto}
        className={className}
        contentClassName={contentClassName}
        tone={tone}
      />
    </Section>
  )
}

function BadgeChipSection() {
  const [type, setType] = useState<BadgeChipType>("running")
  const [text, setText] = useState("Badge custom")
  const [size, setSize] = useState<"small" | "medium" | "large">("medium")
  const [rounded, setRounded] = useState(true)
  const [floating, setFloating] = useState(false)
  const [position, setPosition] = useState<"top-left" | "top-center" | "top-right">("top-right")

  return (
    <Section id="badge-chip" title="Badge / Chip">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="type" value={type} options={BADGE_TYPES} onChange={setType} />
            <Ctl label="size" value={size} options={["small", "medium", "large"]} onChange={setSize} />
            <Toggle label="rounded" checked={rounded} onChange={setRounded} />
            <Toggle label="floating" checked={floating} onChange={setFloating} />
            <Ctl label="position" value={position} options={["top-left", "top-center", "top-right"]} onChange={setPosition} />
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">text</span>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </label>
          </div>
        </Panel>
        <Panel>
          <div className="mb-4 relative h-16 border border-dashed border-slate-300 rounded-lg p-2">
            <BadgeChip type={type} text={text} size={size} rounded={rounded} floating={floating} position={position} />
          </div>
          <div className="flex flex-wrap gap-2">
            {BADGE_TYPES.map((badgeType) => (
              <BadgeChip key={badgeType} type={badgeType} size={size} rounded={rounded} />
            ))}
          </div>
        </Panel>
      </div>
      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "type", values: [...BADGE_TYPES] },
            { prop: "text", values: ["string"] },
            { prop: "size", values: ["small", "medium", "large"] },
            { prop: "rounded", values: ["true", "false"] },
            { prop: "floating", values: ["true", "false"] },
            { prop: "position", values: ["top-left", "top-center", "top-right"] },
          ]}
        />
      </div>
    </Section>
  )
}

function FilterSection() {
  const [selectedFilters, setSelectedFilters] = useState<FilterType[]>(["dateStart", "activityType"])
  const [tone, setTone] = useState<Tone>("current")
  const [demoState, setDemoState] = useState<{ [key: string]: string }>({})

  const availableFilters: Array<{ type: FilterType; label: string; placeholder?: string; options?: FilterOption[] }> = [
    {
      type: "dateStart",
      label: "Data inizio",
      placeholder: "Seleziona una data",
    },
    {
      type: "dateEnd",
      label: "Data fine",
      placeholder: "Seleziona una data",
    },
    {
      type: "activityType",
      label: "Tipo attività",
      options: [
        { value: "running", label: "Running", appliedLabel: "Attività running" },
        { value: "trekking", label: "Trekking", appliedLabel: "Attività trekking" },
        { value: "trip", label: "Trip", appliedLabel: "Attività trip" },
      ],
    },
    {
      type: "distanceMin",
      label: "Distanza minima (km)",
      placeholder: "Es. 5",
    },
    {
      type: "distanceMax",
      label: "Distanza massima (km)",
      placeholder: "Es. 20",
    },
    {
      type: "durationMin",
      label: "Durata minima (min)",
      placeholder: "Es. 30",
    },
    {
      type: "durationMax",
      label: "Durata massima (min)",
      placeholder: "Es. 120",
    },
    {
      type: "location",
      label: "Luogo",
      placeholder: "Es. Sardegna",
    },
    {
      type: "pace",
      label: "Pace (min/km)",
      placeholder: "Es. 5",
    },
  ]

  const selectedFilterConfigs = availableFilters.filter((f) => selectedFilters.includes(f.type))

  return (
    <Section id="filter" title="Filter">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 mb-4">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Filtri attivi</p>
          <div className="mb-3">
            <Ctl label="tone" value={tone} options={CARD_TONES} onChange={setTone} />
          </div>
          <div className="space-y-1.5">
            {FILTER_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFilters([...selectedFilters, type])
                    } else {
                      setSelectedFilters(selectedFilters.filter((t) => t !== type))
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">{availableFilters.find((f) => f.type === type)?.label}</span>
              </label>
            ))}
          </div>
        </Panel>
        <Panel>
          <p className="text-xs text-slate-500 mb-3">
            Componente Filter riusabile: configura quale filtri mostrare tramite prop &quot;filters&quot;.
          </p>
          <pre className="text-[10px] bg-slate-900 text-slate-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(demoState, null, 2)}
          </pre>
        </Panel>
      </div>

      {selectedFilterConfigs.length > 0 && (
        <Panel>
          <Filter
            filters={selectedFilterConfigs}
            tone={tone}
            onFilterChange={setDemoState}
            onReset={() => setDemoState({})}
            resetLabel="Ripristina"
            applyLabel="Applica filtri"
          />
        </Panel>
      )}

      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "filters", values: ["Array<FilterConfig>"] },
            { prop: "onFilterChange", values: ["(state: FilterState) => void"] },
            { prop: "onReset", values: ["() => void"] },
            { prop: "FilterType", values: [...FILTER_TYPES] },
            { prop: "FilterConfig.type", values: [...FILTER_TYPES] },
            { prop: "FilterConfig.options (optional)", values: ["Array<{value, label, appliedLabel?}>"] },
          ]}
        />
      </div>
    </Section>
  )
}

function StripeSection() {
  const [imageKind, setImageKind] = useState<"pic-portrait" | "landscape">("pic-portrait")
  const [imagePosition, setImagePosition] = useState<"left" | "right">("left")
  const [imageSize, setImageSize] = useState<"sm" | "md" | "lg">("md")
  const [background, setBackground] = useState<"white" | "navy">("white")
  const [twoButtons, setTwoButtons] = useState(false)
  const [animated, setAnimated] = useState(true)

  const buttons = twoButtons
    ? [
        { label: "Azione primaria", href: "#", tone: background === "white" ? "black" as const : "white" as const },
        { label: "Secondaria", href: "#", variant: "outline" as const, tone: background === "white" ? "black" as const : "white" as const },
      ]
    : { label: "Contattami", href: "#", tone: background === "white" ? "black" as const : "white" as const }

  return (
    <Section id="stripe" title="Stripe">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 mb-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="imageKind" value={imageKind} options={["pic-portrait", "landscape"]} onChange={(v) => setImageKind(v as "pic-portrait" | "landscape")} />
            <Ctl label="imagePosition" value={imagePosition} options={["left", "right"]} onChange={(v) => setImagePosition(v as "left" | "right")} />
            <Ctl label="imageSize" value={imageSize} options={["sm", "md", "lg"]} onChange={(v) => setImageSize(v as "sm" | "md" | "lg")} />
            <Ctl label="background" value={background} options={["white", "navy"]} onChange={(v) => setBackground(v as "white" | "navy")} />
            <Ctl label="bottoni" value={twoButtons ? "2" : "1"} options={["1", "2"]} onChange={(v) => setTwoButtons(v === "2")} />
            <Ctl label="animated" value={animated ? "true" : "false"} options={["true", "false"]} onChange={(v) => setAnimated(v === "true")} />
          </div>
        </Panel>
        <Panel className={background === "navy" ? "bg-slate-900 border-slate-700" : ""}>
          <Stripe
            imageSrc="https://res.cloudinary.com/derbnvxif/image/upload/v1778058830/MZ_profile_image_vf775z.png"
            imageAlt="Demo avatar"
            imageKind={imageKind}
            imagePosition={imagePosition}
            imageSize={imageSize}
            title="Titolo principale della Stripe"
            subtitle="Sottotitolo breve e chiaro"
            text="Testo facoltativo per una descrizione aggiuntiva. Puoi usarlo per aggiungere contesto."
            buttons={buttons}
            background={background}
            animated={animated}
          />
        </Panel>
      </div>

      <div className="mt-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Varianti rapide</p>
        <Stripe
          imageSrc="https://res.cloudinary.com/derbnvxif/image/upload/v1778058830/MZ_profile_image_vf775z.png"
          imageAlt="Demo"
          imageKind="pic-portrait"
          imagePosition="left"
          imageSize="sm"
          title="Stripe white — immagine sinistra, small"
          subtitle="Con un solo bottone"
          buttons={{ label: "Scopri", href: "#", tone: "black" }}
          background="white"
          animated={false}
        />
        <Stripe
          imageSrc="https://res.cloudinary.com/derbnvxif/image/upload/v1778058830/MZ_profile_image_vf775z.png"
          imageAlt="Demo"
          imageKind="landscape"
          imagePosition="right"
          imageSize="lg"
          title="Stripe navy — immagine destra, large"
          subtitle="Due bottoni, sfondo scuro"
          text="Il testo opzionale aggiunge profondità alla composizione."
          buttons={[
            { label: "Principale", href: "#", tone: "white" },
            { label: "Secondario", href: "#", variant: "outline", tone: "white" },
          ]}
          background="navy"
          animated={false}
        />
      </div>
    </Section>
  )
}

function TextSection() {
  const [variant, setVariant] = useState<typeof TEXT_VARIANTS[number]>("title")
  const [tag, setTag] = useState<typeof TEXT_TAGS[number]>("h2")
  const [tone, setTone] = useState<typeof TEXT_TONES[number]>("current")
  const [size, setSize] = useState<typeof TEXT_SIZES[number]>("xl")
  const [weight, setWeight] = useState<typeof TEXT_WEIGHTS[number]>("bold")
  const [align, setAlign] = useState<typeof TEXT_ALIGNS[number]>("left")
  const [position, setPosition] = useState<typeof TEXT_POSITIONS[number]>("left")

  return (
    <Section id="text" title="Text">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 mb-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="variant" value={variant} options={[...TEXT_VARIANTS]} onChange={setVariant} />
            <Ctl label="tag" value={tag} options={[...TEXT_TAGS]} onChange={setTag} />
            <Ctl label="tone" value={tone} options={[...TEXT_TONES]} onChange={setTone} />
            <Ctl label="size" value={size} options={[...TEXT_SIZES]} onChange={setSize} />
            <Ctl label="weight" value={weight} options={[...TEXT_WEIGHTS]} onChange={setWeight} />
            <Ctl label="align" value={align} options={[...TEXT_ALIGNS]} onChange={setAlign} />
            <Ctl label="position" value={position} options={[...TEXT_POSITIONS]} onChange={setPosition} />
          </div>
        </Panel>
        <Panel>
          <div className="min-h-[140px] flex w-full">
            <Text variant={variant} as={tag} tone={tone} size={size} weight={weight} align={align} position={position}>
              Testo demo: variant {variant}, tag {tag}
            </Text>
          </div>
          <div className="mt-4 space-y-2">
            {TEXT_VARIANTS.map((v) => (
              <Text key={v} variant={v} tone="current">
                Variante {v}
              </Text>
            ))}
          </div>
        </Panel>
      </div>
      <PropsLegend
        items={[
          { prop: "variant", values: [...TEXT_VARIANTS] },
          { prop: "as/tag", values: [...TEXT_TAGS] },
          { prop: "tone", values: [...TEXT_TONES] },
          { prop: "size", values: [...TEXT_SIZES] },
          { prop: "weight", values: [...TEXT_WEIGHTS] },
          { prop: "align", values: [...TEXT_ALIGNS] },
          { prop: "position", values: [...TEXT_POSITIONS] },
        ]}
      />
    </Section>
  )
}

function StatisticsSingleTestSection() {
  const [backgroundColor, setBackgroundColor] = useState<"white" | "blue" | "purple" | "navy" | "slate">("white")
  const [tone, setTone] = useState<"current" | "blue" | "purple" | "black">("blue")
  const [columns, setColumns] = useState<"2" | "3" | "4">("4")
  const [metrics, setMetrics] = useState<StatisticsMetricKey[]>([
    "pb_1000",
    "pb_5000",
    "total_runs",
    "longest_run",
    "total_distance_runs",
    "total_running_hours",
  ])

  const toggleMetric = (metric: StatisticsMetricKey, enabled: boolean) => {
    if (enabled) {
      setMetrics((prev) => (prev.includes(metric) ? prev : [...prev, metric]))
    } else {
      setMetrics((prev) => prev.filter((m) => m !== metric))
    }
  }

  return (
    <Section id="statistics-single" title="Statistics - Single Component Test">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 mb-4">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Display Options</p>
          <div className="grid gap-2 mb-4">
            <Ctl label="background color" value={backgroundColor} options={["white", "blue", "purple", "navy", "slate"]} onChange={(v) => setBackgroundColor(v as "white" | "blue" | "purple" | "navy" | "slate")} />
            <Ctl label="tone" value={tone} options={CARD_TONES} onChange={setTone} />
            <Ctl label="columns" value={columns} options={["2", "3", "4"]} onChange={(v) => setColumns(v as "2" | "3" | "4")} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 border-t border-slate-200 dark:border-slate-700 pt-3">Metrics</p>
          <div className="space-y-1.5 max-h-[220px] overflow-auto pr-1">
            {STAT_METRICS_ALL.map((metric) => (
              <label key={metric} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={metrics.includes(metric)}
                  onChange={(e) => toggleMetric(metric, e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{metric}</span>
              </label>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <p className="text-xs text-slate-500 mb-3">✨ <span className="font-semibold">NUOVO:</span> Prova il componente Statistics singolo</p>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Modifica background, tone e colonne a sinistra</li>
              <li>Aggiungi/rimuovi metriche tramite checkbox</li>
              <li>Clicca su un PB o &quot;Run Più Lunga&quot; per navigare all&apos;attività</li>
              <li>Vedi la data dell&apos;attività sopra la metrica</li>
            </ul>
          </Panel>

          <Panel>
            <Statistics
              metrics={metrics}
              tone={tone}
              backgroundColor={backgroundColor}
              columns={Number(columns) as 2 | 3 | 4}
              fetchIfMissing
              endpoint="/api/activities/all"
            />
          </Panel>
        </div>
      </div>

      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "metrics", values: ["StatisticsMetricKey[]"] },
            { prop: "backgroundColor", values: ["white", "blue", "purple", "navy", "slate"] },
            { prop: "tone", values: [...CARD_TONES] },
            { prop: "columns", values: ["2", "3", "4"] },
            { prop: "fetchIfMissing", values: ["true | false"] },
            { prop: "endpoint", values: ["string (URL API)"] },
          ]}
        />
      </div>
    </Section>
  )
}

function StatisticsSection() {
  const [channel] = useState("storybook-running")
  const [metrics, setMetrics] = useState<StatisticsMetricKey[]>([
    "total_runs",
    "longest_run",
    "total_distance_runs",
    "total_running_hours",
  ])
  const [backgroundColor, setBackgroundColor] = useState<"white" | "blue" | "purple" | "navy" | "slate">("white")
  const [tone, setTone] = useState<"current" | "blue" | "purple" | "black">("blue")
  const [columns, setColumns] = useState<"2" | "3" | "4">("4")

  const toggleMetric = (metric: StatisticsMetricKey, enabled: boolean) => {
    if (enabled) {
      setMetrics((prev) => (prev.includes(metric) ? prev : [...prev, metric]))
    } else {
      setMetrics((prev) => prev.filter((m) => m !== metric))
    }
  }

  const filterConfig: FilterConfig[] = [
    { type: "dateStart", label: "Data inizio" },
    { type: "dateEnd", label: "Data fine" },
    {
      type: "activityType",
      label: "Tipo attivita",
      options: [
        { value: "running", label: "Running" },
        { value: "track_running", label: "Track Running" },
        { value: "trekking", label: "Trekking" },
      ],
    },
    { type: "distanceMin", label: "Distanza min (km)", placeholder: "Distanza min (km)" },
    { type: "distanceMax", label: "Distanza max (km)", placeholder: "Distanza max (km)" },
  ]

  return (
    <Section id="statistics" title="Statistics">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 mb-4">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Controlli</p>
          <div className="grid gap-2 mb-4">
            <Ctl label="background color" value={backgroundColor} options={["white", "blue", "purple", "navy", "slate"]} onChange={(v) => setBackgroundColor(v as "white" | "blue" | "purple" | "navy" | "slate")} />
            <Ctl label="tone" value={tone} options={CARD_TONES} onChange={setTone} />
            <Ctl label="columns" value={columns} options={["2", "3", "4"]} onChange={(v) => setColumns(v as "2" | "3" | "4")} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 border-t border-slate-200 dark:border-slate-700 pt-3">Metriche visibili</p>
          <div className="space-y-1.5 max-h-[220px] overflow-auto pr-1">
            {STAT_METRICS_ALL.map((metric) => (
              <label key={metric} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={metrics.includes(metric)}
                  onChange={(e) => toggleMetric(metric, e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{metric}</span>
              </label>
            ))}
          </div>
        </Panel>
        <Panel>
          <p className="text-xs text-slate-500 mb-3">Modalita con comunicazione Filter {'->'} Statistics</p>
          <Filter
            filters={filterConfig}
            tone="blue"
            syncChannel={channel}
            onFilterChange={() => {}}
            resetLabel="Reset"
            applyLabel="Applica"
          />
        </Panel>
      </div>

      <Panel>
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-semibold uppercase tracking-wider mb-2">✨ Nuove Funzionalità:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li><span className="font-medium">Colore sfondo adaptivo:</span> Scegli lo sfondo e il testo si adatterà automaticamente</li>
            <li><span className="font-medium">Formato tempo intelligente:</span> Durate &lt;1h: mm:ss | Durate ≥1h: hh:mm:ss</li>
            <li><span className="font-medium">Click su PB/Run:</span> Clicca su un PB o sulla &quot;Run Piu Lunga&quot; per navigare all&apos;attività (solo su dati reali)</li>
            <li><span className="font-medium">Data attività:</span> Mostra la data di quando è stata registrata la metrica</li>
            <li><span className="font-medium">Sync Filter:</span> Il componente Statistical si aggiorna dinamicamente quando modifichi i filtri</li>
          </ul>
        </div>
      </Panel>

      <Panel>
        <Statistics
          metrics={metrics}
          syncChannel={channel}
          tone={tone}
          backgroundColor={backgroundColor}
          columns={Number(columns) as 2 | 3 | 4}
          fetchIfMissing
          endpoint="/api/activities/all"
        />
      </Panel>

      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "metrics", values: ["PBs + totals + distance + hours"] },
            { prop: "backgroundColor", values: ["white", "blue", "purple", "navy", "slate"] },
            { prop: "tone", values: [...CARD_TONES] },
            { prop: "columns", values: ["2", "3", "4"] },
            { prop: "activities", values: ["RawActivity[] (optional)"] },
            { prop: "filters", values: ["StatisticsFilters (optional)"] },
            { prop: "syncChannel", values: ["string (opzionale per sync con Filter)"] },
            { prop: "fetchIfMissing", values: ["true | false"] },
            { prop: "endpoint", values: ["/api/activities/all"] },
          ]}
        />
      </div>
    </Section>
  )
}

function AnimatedSectionDemo() {
  const [disabled, setDisabled] = useState(false)
  return (
    <Section id="animated" title="AnimatedSection">
      <Panel>
        <Toggle label="disabled" checked={disabled} onChange={setDisabled} />
        <div className="mt-3">
          <AnimatedSection disabled={disabled} once={false}>
            <Card className="max-w-sm">
              <CardHeader>
                <CardTitle>Animated wrapper</CardTitle>
              </CardHeader>
              <CardContent>Animazione riusabile.</CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </Panel>
    </Section>
  )
}

function IconsSection() {
  const [selectedSize, setSelectedSize] = useState<"xs" | "sm" | "md" | "lg" | "xl">("md")
  const [selectedScheme, setSelectedScheme] = useState<"inherit" | "light" | "dark">("inherit")
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(2)

  return (
    <Section id="icons" title="Icons">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 mb-4">
        <Panel>
          <div className="grid gap-2">
            <Ctl label="size" value={selectedSize} options={["xs", "sm", "md", "lg", "xl"]} onChange={(v) => setSelectedSize(v as "xs" | "sm" | "md" | "lg" | "xl")} />
            <Ctl label="scheme" value={selectedScheme} options={["inherit", "light", "dark"]} onChange={(v) => setSelectedScheme(v as "inherit" | "light" | "dark")} />
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">strokeWidth</span>
              <input
                type="number"
                step="0.5"
                min="1"
                max="3"
                value={selectedStrokeWidth}
                onChange={(e) => setSelectedStrokeWidth(Number(e.target.value))}
                className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </label>
          </div>
        </Panel>
        <Panel>
          <p className="text-xs text-slate-500 mb-3">Totali: {ICON_CATEGORIES.flatMap(c => c.icons).length} icone organizzate in {ICON_CATEGORIES.length} categorie</p>
        </Panel>
      </div>

      {ICON_CATEGORIES.map((category) => (
        <Panel key={category.label}>
          <h3 className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">{category.label}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {category.icons.map((iconName) => (
              <div key={iconName} className="flex flex-col items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Icon name={iconName} size={selectedSize} scheme={selectedScheme} strokeWidth={selectedStrokeWidth} />
                <p className="text-[10px] text-center text-slate-600 dark:text-slate-400 truncate w-full" title={iconName}>
                  {iconName}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ))}

      <Panel>
        <h3 className="text-sm font-semibold mb-3">Social Brand Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(SOCIAL_BRAND_COLORS).map(([key, color]) => (
            <div key={key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: color }} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{key}</span>
              </div>
              <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{color}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-4">
        <PropsLegend
          items={[
            { prop: "name", values: ["IconName (string union)"] },
            { prop: "size", values: ["xs", "sm", "md", "lg", "xl"] },
            { prop: "scheme", values: ["inherit", "light", "dark"] },
            { prop: "strokeWidth", values: ["number (default 2)"] },
            { prop: "className", values: ["string (optional)"] },
            { prop: "aria-label", values: ["string (optional)"] },
            { prop: "aria-hidden", values: ["boolean | 'true' | 'false' (default true)"] },
          ]}
        />
      </div>
    </Section>
  )
}


export default function StorybookPage() {
  return (
    <PageShell background="white" className="text-slate-900 dark:text-slate-100">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 lg:py-8 lg:flex lg:items-start lg:gap-6">
        <StorybookSidebar />
        <main className="flex-1 min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold">Storybook - Componenti</h1>
            <Button asChild variant="outline" tone="black" size="sm">
              <Link href="/">Torna al sito</Link>
            </Button>
          </div>
          <p className="text-slate-500 mb-8">Pagina unica con varianti e controlli per tutti i componenti principali.</p>
          <ColorPaletteSection />

          <div className="my-8 h-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
          <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Componenti (A-Z)</h2>

            <ActivityComponentsSection />
            <AnimatedSectionDemo />
            <BadgeChipSection />
            <ButtonSection />
            <CardSection />
            <CardGridSection />
            <CarouselShowcaseSection />
            <DividerSection />
            <FilterSection />
            <HeaderFooterSection />
            <HeroSection />
            <IconsSection />
            <InputSelectSection />
            <LoaderSection />
            <ModalSection />
            <StatisticsSingleTestSection />
            <StatisticsSection />
            <StripeSection />
            <TextSection />
        </main>
      </div>
    </PageShell>
  )
}


