"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ButtonVariant, ButtonTone, ButtonSize } from "@/components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]
type CarouselGap = "sm" | "md" | "lg"
type CarouselCardsCount = 1 | 2 | 3 | 4 | 5 | 6
type ResponsiveCarouselCards =
  | CarouselCardsCount
  | Partial<Record<"base" | "sm" | "md" | "lg" | "xl", CarouselCardsCount>>

/** Position delle frecce di navigazione: top-right = header accanto al titolo, sides = ai lati del track */
type ArrowsPosition = "top-right" | "sides"

/** Dati per la card di default di CarouselSection */
export interface CarouselCardItemData {
  id?: string | number
  image?: string
  accentLabel?: string
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
}

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  horizontal?: boolean
  setApi?: (api: CarouselApi) => void
  gap?: CarouselGap
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  gap: CarouselGap
} & CarouselProps

type CarouselCardsProps<TItem> = {
  items?: TItem[]
  renderItem?: (item: TItem, index: number) => React.ReactNode
  getItemKey?: (item: TItem, index: number) => React.Key
  carouselCard?: ResponsiveCarouselCards
  cardsPerView?: ResponsiveCarouselCards
  focusCenterSlide?: boolean
  itemClassName?: string
  contentClassName?: string
  showControls?: boolean
  showDots?: boolean
  dotsClassName?: string
  dotClassName?: string
  activeDotClassName?: string
  previousButtonProps?: React.ComponentProps<typeof CarouselPrevious>
  nextButtonProps?: React.ComponentProps<typeof CarouselNext>
  children?: React.ReactNode
  /** Titolo della sezione sopra il carousel */
  title?: string
  titleClassName?: string
  /** Descrizione della sezione sopra il carousel */
  description?: string
  descriptionClassName?: string
  /** Posizione frecce su desktop (md+). Default: 'sides' */
  arrowsPosition?: ArrowsPosition
  /** Posizione frecce su mobile. Default: uguale a arrowsPosition */
  arrowsPositionMobile?: ArrowsPosition
} & Omit<React.ComponentProps<typeof Carousel>, "children">

// ─── Sezione separata per CarouselSection ────────────────────────��──────────
type CarouselSectionProps = {
  /** Elementi del carousel. Le proprietà sovrascrivono i default della card. */
  items: CarouselCardItemData[]
  // --- Sezione header ---
  title?: string
  titleClassName?: string
  description?: string
  descriptionClassName?: string
  // --- Carousel config ---
  gap?: CarouselGap
  cardsPerView?: ResponsiveCarouselCards
  showDots?: boolean
  dotsClassName?: string
  dotClassName?: string
  activeDotClassName?: string
  /** Posizione frecce su desktop (md+). Default: 'sides' */
  arrowsPosition?: ArrowsPosition
  /** Posizione frecce su mobile. Default: uguale a arrowsPosition */
  arrowsPositionMobile?: ArrowsPosition
  /** Evidenzia la card centrale e attenua quelle laterali */
  focusCenterSlide?: boolean
  // --- Default card config (sovrascrivibili per-item) ---
  /** Immagine di fallback per la card */
  cardImage?: string
  /** Label colorata (es. "Road to Marathon") */
  cardAccentLabel?: string
  /** Classe Tailwind per il colore dell'accent label. Default: 'text-blue-300' */
  cardAccentColor?: string
  /** Titolo di default della card */
  cardTitle?: string
  /** Descrizione di default della card */
  cardDescription?: string
  /** Testo del bottone */
  cardButtonText?: string
  /** Href del bottone (se presente, il bottone è un link) */
  cardButtonHref?: string
  /** Variante del bottone (default, outline, secondary, ghost, link, destructive) */
  cardButtonVariant?: ButtonVariant
  /** Tone del bottone */
  cardButtonTone?: ButtonTone
  /** Size del bottone */
  cardButtonSize?: ButtonSize
  /** Altezza card immagine (es. 'h-64', 'h-72'). Default: 'h-64' */
  cardImageHeight?: string
  /** ClassName aggiuntiva per ogni card */
  cardClassName?: string
  /** ClassName del wrapper esterno */
  className?: string
}

// ─── Mappe ──────────────────────────────────────────────────────────────────

const GAP_CLASS_MAP: Record<
  CarouselGap,
  {
    horizontalContent: string
    horizontalItem: string
    verticalContent: string
    verticalItem: string
  }
> = {
  sm: {
    horizontalContent: "-ml-2",
    horizontalItem: "pl-2",
    verticalContent: "-mt-2",
    verticalItem: "pt-2",
  },
  md: {
    horizontalContent: "-ml-4",
    horizontalItem: "pl-4",
    verticalContent: "-mt-4",
    verticalItem: "pt-4",
  },
  lg: {
    horizontalContent: "-ml-6",
    horizontalItem: "pl-6",
    verticalContent: "-mt-6",
    verticalItem: "pt-6",
  },
}

const BASIS_CLASS_MAP = {
  base: { 1: "basis-full", 2: "basis-1/2", 3: "basis-1/3", 4: "basis-1/4", 5: "basis-1/5", 6: "basis-1/6" },
  sm:   { 1: "sm:basis-full", 2: "sm:basis-1/2", 3: "sm:basis-1/3", 4: "sm:basis-1/4", 5: "sm:basis-1/5", 6: "sm:basis-1/6" },
  md:   { 1: "md:basis-full", 2: "md:basis-1/2", 3: "md:basis-1/3", 4: "md:basis-1/4", 5: "md:basis-1/5", 6: "md:basis-1/6" },
  lg:   { 1: "lg:basis-full", 2: "lg:basis-1/2", 3: "lg:basis-1/3", 4: "lg:basis-1/4", 5: "lg:basis-1/5", 6: "lg:basis-1/6" },
  xl:   { 1: "xl:basis-full", 2: "xl:basis-1/2", 3: "xl:basis-1/3", 4: "xl:basis-1/4", 5: "xl:basis-1/5", 6: "xl:basis-1/6" },
} as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeOrientation(
  orientation: CarouselProps["orientation"],
  horizontal?: boolean
): "horizontal" | "vertical" {
  if (typeof horizontal === "boolean") return horizontal ? "horizontal" : "vertical"
  return orientation ?? "horizontal"
}

function resolveCardsPerViewClass(
  cardsPerView: ResponsiveCarouselCards | undefined,
  orientation: "horizontal" | "vertical"
): string {
  if (orientation === "vertical") return "basis-full"
  if (!cardsPerView) return "basis-full"
  if (typeof cardsPerView === "number") return BASIS_CLASS_MAP.base[cardsPerView]
  const classes = [
    cardsPerView.base ? BASIS_CLASS_MAP.base[cardsPerView.base] : "basis-full",
    cardsPerView.sm ? BASIS_CLASS_MAP.sm[cardsPerView.sm] : "",
    cardsPerView.md ? BASIS_CLASS_MAP.md[cardsPerView.md] : "",
    cardsPerView.lg ? BASIS_CLASS_MAP.lg[cardsPerView.lg] : "",
    cardsPerView.xl ? BASIS_CLASS_MAP.xl[cardsPerView.xl] : "",
  ]
  return classes.filter(Boolean).join(" ")
}

function resolveFocusSlideClass(index: number, selectedIndex: number, totalSlides: number, enabled?: boolean): string {
  if (!enabled || totalSlides < 3) return ""

  const centerIndex = selectedIndex
  const leftIndex = (centerIndex - 1 + totalSlides) % totalSlides
  const rightIndex = (centerIndex + 1) % totalSlides

  if (index === centerIndex) {
    return "lg:scale-[1.03] lg:opacity-100 lg:saturate-100 lg:shadow-2xl transition-all duration-300"
  }

  if (index === leftIndex || index === rightIndex) {
    return "lg:scale-[0.98] lg:opacity-70 lg:saturate-80 lg:shadow-lg transition-all duration-300"
  }

  return "lg:opacity-50 lg:scale-[0.96] transition-all duration-300"
}

/** Restituisce le classi Tailwind per mostrare/nascondere i bottoni freccia
 *  in base alla posizione desiderata su mobile (sm-) e desktop (md+). */
function arrowVisibilityClasses(
  targetPos: ArrowsPosition,
  mobilePos: ArrowsPosition,
  desktopPos: ArrowsPosition
): string {
  const onMobile = mobilePos === targetPos
  const onDesktop = desktopPos === targetPos
  if (onMobile && onDesktop) return ""          // sempre visibili
  if (onMobile && !onDesktop) return "md:hidden"
  if (!onMobile && onDesktop) return "hidden md:flex"
  return "hidden"
}

// ─── Context ─────────────────────────────────────────────────────────────────

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) throw new Error("useCarousel must be used within a <Carousel />")
  return context
}

// ─── Carousel base ────────────────────────────────────────────────────────────

function Carousel({
  orientation = "horizontal",
  horizontal,
  opts,
  setApi,
  plugins,
  gap = "md",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const resolvedOrientation = normalizeOrientation(orientation, horizontal)
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: resolvedOrientation === "horizontal" ? "x" : "y" },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => { api?.scrollPrev() }, [api])
  const scrollNext = React.useCallback(() => { api?.scrollNext() }, [api])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); scrollPrev() }
    else if (event.key === "ArrowRight") { event.preventDefault(); scrollNext() }
  }, [scrollPrev, scrollNext])

  React.useEffect(() => { if (!api || !setApi) return; setApi(api) }, [api, setApi])
  React.useEffect(() => {
    if (!api) return
    const frame = requestAnimationFrame(() => onSelect(api))
    api.on("reInit", onSelect)
    api.on("select", onSelect)
    return () => { cancelAnimationFrame(frame); api.off("reInit", onSelect); api.off("select", onSelect) }
  }, [api, onSelect])

  return (
    <CarouselContext value={{ carouselRef, api, opts, orientation: resolvedOrientation, horizontal, scrollPrev, scrollNext, canScrollPrev, canScrollNext, gap }}>
      <div onKeyDownCapture={handleKeyDown} className={cn("relative", className)} role="region" aria-roledescription="carousel" data-slot="carousel" {...props}>
        {children}
      </div>
    </CarouselContext>
  )
}

// ─── CarouselContent / CarouselItem ──────────────────────────────────────────

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation, gap } = useCarousel()
  const gapClasses = GAP_CLASS_MAP[gap]
  return (
    <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-content">
      <div className={cn("flex", orientation === "horizontal" ? gapClasses.horizontalContent : cn(gapClasses.verticalContent, "flex-col"), className)} {...props} />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation, gap } = useCarousel()
  const gapClasses = GAP_CLASS_MAP[gap]
  return (
    <div role="group" aria-roledescription="slide" data-slot="carousel-item"
      className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? gapClasses.horizontalItem : gapClasses.verticalItem, className)}
      {...props} />
  )
}

// ─── CarouselPrevious / CarouselNext ─────────────────────────────────────────

function CarouselPrevious({ className, variant = "outline", size = "icon", ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()
  return (
    <Button data-slot="carousel-previous" variant={variant} size={size}
      className={cn("absolute size-8 rounded-full", orientation === "horizontal" ? "top-1/2 -left-12 -translate-y-1/2" : "-top-12 left-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!canScrollPrev} onClick={scrollPrev} {...props}>
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({ className, variant = "outline", size = "icon", ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()
  return (
    <Button data-slot="carousel-next" variant={variant} size={size}
      className={cn("absolute size-8 rounded-full", orientation === "horizontal" ? "top-1/2 -right-12 -translate-y-1/2" : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!canScrollNext} onClick={scrollNext} {...props}>
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

// ─── Navigazione esterna (per top-right / sides) ──────────────────────────────

type ExternalNavButtonsProps = {
  canScrollPrev: boolean
  canScrollNext: boolean
  onPrev: () => void
  onNext: () => void
  className?: string
  previousBtnClassName?: string
  nextBtnClassName?: string
}

type ExternalNavButtonProps = {
  direction: "prev" | "next"
  canScroll: boolean
  onClick: () => void
  className?: string
  btnClassName?: string
}

function ExternalNavButtons({ canScrollPrev, canScrollNext, onPrev, onNext, className, previousBtnClassName, nextBtnClassName }: ExternalNavButtonsProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button type="button" onClick={onPrev} disabled={!canScrollPrev} aria-label="Slide precedente"
        className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-comp-carousel-nav-border)] bg-[var(--color-comp-carousel-nav-bg)] text-[var(--color-comp-carousel-nav-text)] shadow-sm transition disabled:opacity-40 hover:bg-[var(--color-comp-carousel-nav-bg-hover)]", previousBtnClassName)}>
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onNext} disabled={!canScrollNext} aria-label="Slide successiva"
        className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-comp-carousel-nav-border)] bg-[var(--color-comp-carousel-nav-bg)] text-[var(--color-comp-carousel-nav-text)] shadow-sm transition disabled:opacity-40 hover:bg-[var(--color-comp-carousel-nav-bg-hover)]", nextBtnClassName)}>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function ExternalNavButton({ direction, canScroll, onClick, className, btnClassName }: ExternalNavButtonProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={!canScroll}
        aria-label={direction === "prev" ? "Slide precedente" : "Slide successiva"}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-comp-carousel-nav-border)] bg-[var(--color-comp-carousel-nav-bg)] text-[var(--color-comp-carousel-nav-text)] shadow-sm transition disabled:opacity-40 hover:bg-[var(--color-comp-carousel-nav-bg-hover)]",
          btnClassName
        )}
      >
        {direction === "prev" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  )
}

// ─── CarouselCards ────────────────────────────────────────────────────────────

function CarouselCards<TItem>({
  items,
  renderItem,
  getItemKey,
  carouselCard,
  cardsPerView,
  focusCenterSlide = false,
  itemClassName,
  contentClassName,
  showControls = true,
  showDots = false,
  dotsClassName,
  dotClassName,
  activeDotClassName,
  previousButtonProps,
  nextButtonProps,
  children,
  orientation,
  horizontal,
  opts,
  // new props
  title,
  titleClassName,
  description,
  descriptionClassName,
  arrowsPosition = "sides",
  arrowsPositionMobile,
  ...props
}: CarouselCardsProps<TItem>) {
  const resolvedOrientation = normalizeOrientation(orientation, horizontal)
  const itemBasisClass = resolveCardsPerViewClass(cardsPerView ?? carouselCard, resolvedOrientation)
  const childCount = React.Children.count(children)
  const hasChildren = childCount > 0
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [snapCount, setSnapCount] = React.useState(0)
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)
  const totalSlides = hasChildren ? childCount : (items?.length ?? 0)

  const mobilePos = arrowsPositionMobile ?? arrowsPosition

  React.useEffect(() => {
    if (!carouselApi) return
    const onSelect = () => {
      setSelectedIndex(carouselApi.selectedScrollSnap())
      setSnapCount(carouselApi.scrollSnapList().length)
      setCanScrollPrev(carouselApi.canScrollPrev())
      setCanScrollNext(carouselApi.canScrollNext())
    }
    onSelect()
    carouselApi.on("select", onSelect)
    carouselApi.on("reInit", onSelect)
    return () => { carouselApi.off("select", onSelect); carouselApi.off("reInit", onSelect) }
  }, [carouselApi])

  if (!hasChildren && (!items || !renderItem)) return null

  const hasHeader = Boolean(title || description)
  const showExternalControls = showControls && totalSlides > 1
  const previousBtnClassName = previousButtonProps?.className
  const nextBtnClassName = nextButtonProps?.className

  // Visibilità gruppi frecce
  const topRightVisible = showExternalControls
    ? arrowVisibilityClasses("top-right", mobilePos, arrowsPosition)
    : "hidden"
  const sidesVisible = showExternalControls
    ? arrowVisibilityClasses("sides", mobilePos, arrowsPosition)
    : "hidden"

  const resolvedOpts: CarouselOptions = {
    ...opts,
    align: focusCenterSlide ? "center" : (opts?.align ?? "start"),
    ...(focusCenterSlide ? { loop: true } : {}),
  }

  const carouselNode = (
    <Carousel orientation={resolvedOrientation} opts={resolvedOpts} setApi={setCarouselApi} {...props}>
      <CarouselContent className={contentClassName}>
        {hasChildren
          ? React.Children.map(children, (child, index) => (
              <CarouselItem
                key={React.isValidElement(child) && child.key != null ? child.key : index}
                className={cn(itemBasisClass, itemClassName, "flex justify-center overflow-visible")}
              >
                <div
                  className={cn(
                    "w-full",
                    resolveFocusSlideClass(index, selectedIndex, totalSlides, focusCenterSlide),
                    focusCenterSlide && index !== selectedIndex && "lg:[&_a]:pointer-events-none lg:[&_button]:pointer-events-none"
                  )}
                  onClickCapture={(event) => {
                    if (!focusCenterSlide || index === selectedIndex) return
                    event.preventDefault()
                    event.stopPropagation()
                    carouselApi?.scrollTo(index)
                  }}
                >
                  {child}
                </div>
              </CarouselItem>
            ))
          : items?.map((item, index) => (
              <CarouselItem
                key={getItemKey ? getItemKey(item, index) : index}
                className={cn(itemBasisClass, itemClassName, "flex justify-center overflow-visible")}
              >
                <div
                  className={cn(
                    "w-full",
                    resolveFocusSlideClass(index, selectedIndex, totalSlides, focusCenterSlide),
                    focusCenterSlide && index !== selectedIndex && "lg:[&_a]:pointer-events-none lg:[&_button]:pointer-events-none"
                  )}
                  onClickCapture={(event) => {
                    if (!focusCenterSlide || index === selectedIndex) return
                    event.preventDefault()
                    event.stopPropagation()
                    carouselApi?.scrollTo(index)
                  }}
                >
                  {renderItem?.(item, index) ?? null}
                </div>
              </CarouselItem>
            ))}
      </CarouselContent>

    </Carousel>
  )

  return (
    <div className="w-full">
      {/* Header: titolo + frecce top-right */}
      {(hasHeader || topRightVisible !== "hidden") && (
        <div className={cn("mb-4", topRightVisible !== "hidden" && totalSlides > 1 ? "relative" : "") }>
          {(title || topRightVisible !== "hidden") && (
            <div className={cn("flex items-start justify-between gap-4", !title && topRightVisible !== "hidden" && "justify-end")}>
              {title ? <h2 className={cn("text-xl font-bold text-[var(--color-tone-current-title)]", titleClassName)}>{title}</h2> : null}
              {topRightVisible !== "hidden" && totalSlides > 1 ? (
                <ExternalNavButtons
                  canScrollPrev={canScrollPrev}
                  canScrollNext={canScrollNext}
                  onPrev={() => carouselApi?.scrollPrev()}
                  onNext={() => carouselApi?.scrollNext()}
                  className={cn("self-start", topRightVisible)}
                  previousBtnClassName={previousBtnClassName}
                  nextBtnClassName={nextBtnClassName}
                />
              ) : null}
            </div>
          )}

          {description ? (
            <p
              className={cn(
                "mt-1 text-sm text-[var(--color-tone-current-subtitle)]",
                topRightVisible !== "hidden" && totalSlides > 1 ? "pr-20 md:pr-0" : "",
                descriptionClassName
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      )}

      {/* Carousel con eventuali frecce SIDES */}
      {sidesVisible !== "hidden" ? (
        <div className={cn("flex items-center gap-3")}>
          <ExternalNavButton
            direction="prev"
            canScroll={canScrollPrev}
            onClick={() => carouselApi?.scrollPrev()}
            className={cn("flex-col", sidesVisible)}
            btnClassName={previousBtnClassName}
          />
          <div className="flex-1 min-w-0">{carouselNode}</div>
          <ExternalNavButton
            direction="next"
            canScroll={canScrollNext}
            onClick={() => carouselApi?.scrollNext()}
            className={cn("flex-col", sidesVisible)}
            btnClassName={nextBtnClassName}
          />
        </div>
      ) : carouselNode}

      {/* Dots */}
      {showDots && totalSlides > 1 ? (
        <div className={cn("mt-4 flex items-center justify-center gap-2", dotsClassName)} data-slot="carousel-dots">
          {Array.from({ length: snapCount || totalSlides }).map((_, index) => {
            const isActive = index === selectedIndex
            return (
              <button key={index} type="button" onClick={() => carouselApi?.scrollTo(index)}
                className={cn("h-2.5 w-2.5 rounded-full border border-[var(--color-comp-carousel-dot-border)] bg-transparent transition-all",
                  isActive
                    ? cn("w-6 border-[var(--color-comp-carousel-dot-active-border)] bg-[var(--color-comp-carousel-dot-active-bg)]", activeDotClassName)
                    : cn("bg-[var(--color-comp-carousel-dot-bg)] hover:bg-[var(--color-comp-carousel-dot-bg-hover)]", dotClassName))}
                aria-label={`Go to slide ${index + 1}`} aria-current={isActive ? "true" : undefined} />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

// ─── Default card per CarouselSection ────────────────────────────────────────

type DefaultCarouselCardProps = {
  image?: string
  imageHeight?: string
  accentLabel?: string
  accentColor?: string
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
  buttonVariant?: ButtonVariant
  buttonTone?: ButtonTone
  buttonSize?: ButtonSize
  className?: string
}

function DefaultCarouselCard({
  image,
  imageHeight = "h-64",
  accentLabel,
  accentColor = "text-[var(--color-tone-blue-title)]",
  title,
  description,
  buttonText,
  buttonHref,
  buttonVariant = "default",
  buttonTone = "white",
  buttonSize = "default",
  className,
}: DefaultCarouselCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-[var(--color-comp-carousel-card1-border)] bg-[var(--color-comp-carousel-card1-bg)]", className)}>
      <div className={cn("relative w-full overflow-hidden", imageHeight)}>
        {image ? (
          <Image src={image} alt={title ?? ""} fill className="object-cover" sizes="(max-width: 768px) 100vw, 900px" />
        ) : (
          <div className="h-full w-full bg-[var(--color-comp-carousel-card1-empty-bg)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-comp-carousel-card1-overlay)] via-black/30 to-black/10" />
      </div>
      <div className="absolute inset-0 flex items-end p-5 sm:p-6">
        <div className="max-w-xl text-[var(--color-ref-white)] space-y-2">
          {accentLabel && (
            <p className={cn("text-xs uppercase tracking-[0.2em] sm:text-sm", accentColor)}>{accentLabel}</p>
          )}
          {title && <h3 className="text-2xl font-bold sm:text-3xl">{title}</h3>}
          {description && <p className="text-xs text-[var(--color-comp-carousel-card1-subtitle-text)]/90 sm:text-sm">{description}</p>}
          {buttonText && (
            buttonHref ? (
              <Button variant={buttonVariant} tone={buttonTone} size={buttonSize} radius="lg" asChild>
                <Link href={buttonHref}>{buttonText}</Link>
              </Button>
            ) : (
              <Button variant={buttonVariant} tone={buttonTone} size={buttonSize} radius="lg">{buttonText}</Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CarouselSection ─────────────────────────────────────────────────────────

function CarouselSection({
  items,
  title,
  titleClassName,
  description,
  descriptionClassName,
  gap = "md",
  cardsPerView = 1,
  focusCenterSlide = false,
  showDots = true,
  dotsClassName,
  dotClassName,
  activeDotClassName,
  arrowsPosition = "sides",
  arrowsPositionMobile,
  cardImage,
  cardAccentLabel,
  cardAccentColor,
  cardTitle,
  cardDescription,
  cardButtonText,
  cardButtonHref,
  cardButtonVariant = "default",
  cardButtonTone = "white",
  cardButtonSize = "default",
  cardImageHeight = "h-64",
  cardClassName,
  className,
}: CarouselSectionProps) {
  return (
    <div className={cn("w-full", className)}>
      <CarouselCards
        items={items}
        renderItem={(item) => (
          <DefaultCarouselCard
            image={item.image ?? cardImage}
            imageHeight={cardImageHeight}
            accentLabel={item.accentLabel ?? cardAccentLabel}
            accentColor={cardAccentColor}
            title={item.title ?? cardTitle}
            description={item.description ?? cardDescription}
            buttonText={item.buttonText ?? cardButtonText}
            buttonHref={item.buttonHref ?? cardButtonHref}
            buttonVariant={cardButtonVariant}
            buttonTone={cardButtonTone}
            buttonSize={cardButtonSize}
            className={cardClassName}
          />
        )}
        getItemKey={(item, index) => item.id ?? index}
        gap={gap}
        cardsPerView={cardsPerView}
        focusCenterSlide={focusCenterSlide}
        showDots={showDots}
        dotsClassName={dotsClassName}
        dotClassName={dotClassName}
        activeDotClassName={activeDotClassName}
        title={title}
        titleClassName={titleClassName}
        description={description}
        descriptionClassName={descriptionClassName}
        arrowsPosition={arrowsPosition}
        arrowsPositionMobile={arrowsPositionMobile}
        showControls
      />
    </div>
  )
}

export {
  type CarouselApi,
  type CarouselGap,
  type CarouselCardsCount,
  type ResponsiveCarouselCards,
  type ArrowsPosition,
  Carousel,
  CarouselCards,
  CarouselSection,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
}

