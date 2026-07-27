import Image from 'next/image';
import Link from 'next/link';
import {
  AnimatedSection,
  CardGrid,
  Divider,
  Hero,
  PageShell,
} from '@/components/generic';
import { Stripe } from '@/components/Stripe';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CarouselCards } from '@/components/ui/carousel';

interface HomeCarouselItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  imageSrc: string;
}

const homeCarouselItems: HomeCarouselItem[] = [
  {
    id: 'running',
    title: 'Running',
    subtitle: 'Road to Marathon',
    description: 'Corse su strada, pista e allenamenti per raccontare progressi, numeri ed emozioni.',
    href: '/exploration/running',
    imageSrc:
      'https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/running_Large_zorzw2.jpg',
  },
  {
    id: 'trekking',
    title: 'Trekking',
    subtitle: 'Natura e dislivello',
    description: 'Escursioni, panorami, salite e percorsi da ricordare con dati, foto e dettagli utili.',
    href: '/exploration/trekking',
    imageSrc:
      'https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/trekking_h2lev5.jpg',
  },
  {
    id: 'trips',
    title: 'Trips',
    subtitle: 'Esperienze e cultura',
    description: 'Una raccolta di viaggi, idee e luoghi che meritano una storia dedicata.',
    href: '/exploration/trips',
    imageSrc:
      'https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1777450410/trips_exvdmu.avif',
  },
];

export default function Home() {
  return (
    <PageShell background="white" className="homepage-main" data-testid="homepage-main">
      {/* Hero Video Section */}
      <Hero
        title="MZ Exploration"
        subtitle="Un mondo oltre la pista e il sentiero."
        size="md"
        titleClassName="text-4xl sm:text-5xl lg:text-6xl leading-tight"
        subtitleClassName="text-sm sm:text-base lg:text-lg"
        data-testid="hp-hero-1"
      />

      {/* Carousel Section (Running, Trekking, Trips) */}
      <div id="hp-categories-3" className="scroll-mt-20 hp-categories-3" data-testid="hp-categories-3">
        <AnimatedSection className="px-4 py-8 sm:px-6 lg:px-8 hp-carousel-section-4" data-testid="hp-carousel-section-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="sr-only hp-section-title-4" data-testid="hp-carousel-title-4">
              Esploriamo assieme
            </h2>
            <CarouselCards
              horizontal
              carouselCard={1}
              gap="md"
              title="Esploriamo assieme"
              titleClassName="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
              className="w-full max-w-5xl mx-auto hp-carousel-5"
              showDots
              arrowsPositionMobile="top-right"
              dotsClassName="mt-5"
              dotClassName="border-slate-500/70 bg-slate-200/80 hover:bg-slate-300 dark:border-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500"
              activeDotClassName="border-slate-900 bg-slate-900 dark:border-slate-100 dark:bg-slate-100"
              previousButtonProps={{
                className: 'left-2 sm:-left-10 size-9 border border-slate-900/20 bg-slate-900/90 text-white hover:bg-black',
                variant: 'default',
                tone: 'current',
              }}
              nextButtonProps={{
                className: 'right-2 sm:-right-10 size-9 border border-slate-900/20 bg-slate-900/90 text-white hover:bg-black',
                variant: 'default',
                tone: 'current',
              }}
              data-testid="hp-carousel-5"
            >
              {homeCarouselItems.map((slide) => (
                <Card key={slide.id} className="relative overflow-hidden border-slate-200 dark:border-slate-700 hp-carousel-item-6" data-testid={`hp-carousel-item-${slide.id}-6`}>
                  <div className="relative h-[18rem] sm:h-[21rem] w-full hp-carousel-image-wrapper-6">
                    <Image
                      src={slide.imageSrc}
                      alt={slide.title}
                      fill
                      className="object-cover hp-carousel-image-6"
                      sizes="(max-width: 768px) 100vw, 980px"
                      priority={slide.id === 'running'}
                      data-testid={`hp-carousel-image-${slide.id}-6`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/25 hp-carousel-overlay-6" />

                    <div className="absolute inset-0 flex items-end p-5 sm:p-6 hp-carousel-content-6">
                      <div className="max-w-xl text-white space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-blue-200 sm:text-sm hp-carousel-subtitle-6" data-testid={`hp-carousel-subtitle-${slide.id}-6`}>
                          {slide.subtitle}
                        </p>
                        <CardHeader className="p-0 pb-1">
                          <CardTitle className="text-2xl text-white sm:text-3xl hp-carousel-title-6" data-testid={`hp-carousel-title-${slide.id}-6`}>
                            {slide.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-0">
                          <p className="text-xs text-white/90 sm:text-sm hp-carousel-description-6" data-testid={`hp-carousel-description-${slide.id}-6`}>{slide.description}</p>
                          <Button asChild tone="white" size="default" radius="lg" className="hp-carousel-button-6">
                            <Link href={slide.href} data-testid={`hp-carousel-link-${slide.id}-6`}>Vai a {slide.title}</Link>
                          </Button>
                        </CardContent>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </CarouselCards>
          </div>
        </AnimatedSection>
      </div>

      <Divider color="current" size="sm" data-testid="hp-divider-7" />

      {/* Latest Adventures Section */}
      <CardGrid
        sectionClassName="px-4 py-8 sm:px-6 lg:px-8"
        titleColor="current"
        subtitleColor="current"
        data-testid="hp-latest-adventures-8"
      />

      <Divider color="current" size="sm" data-testid="hp-divider-9" />

      {/* Chi Sono Section */}
      <div className="px-4 py-10 sm:px-6 lg:px-8 hp-chi-sono-2" data-testid="hp-chi-sono-2">
        <div className="max-w-6xl mx-auto">
          <Stripe
            imageSrc="https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1778058830/MZ_profile_image_vf775z.png"
            imageAlt="Moreno Zuddas"
            imageKind="pic-portrait"
            imagePosition="right"
            imageSize="lg"
            title="About me"
            subtitle=""
            text="Sportivo, appassionato di tecnologia e data. Amo tracciare le mie avventure all'aria aperta, analizzare i dati e condividere le storie dietro ogni numero."
            buttons={{
              label: 'Scopri di più',
              href: '/about',
              variant: 'default',
              tone: 'white',
            }}
            background="navy"
            animated
            animationDelay={0.2}
            data-testid="hp-stripe-chi-sono-2"
          />
        </div>
      </div>


      <Divider color="current" size="sm" data-testid="hp-divider-9" />

      {/* Coming Soon Section */}
      <AnimatedSection className="px-4 py-10 sm:px-6 lg:px-8 hp-coming-soon-10" data-testid="hp-coming-soon-10">
        <div className="max-w-4xl mx-auto rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-6 text-center hp-coming-soon-box-10" data-testid="hp-coming-soon-box-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400 hp-coming-soon-label-10" data-testid="hp-coming-soon-label-10">
            Coming Soon
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white hp-coming-soon-title-10" data-testid="hp-coming-soon-title-10">
            Sezione Libri, Foto, Musica
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300 hp-coming-soon-description-10" data-testid="hp-coming-soon-description-10">
            Una raccolta che raconta mindset, performance e avventura attraverso diverse forme di media.
          </p>
        </div>
      </AnimatedSection>

      <Divider color="current" size="sm" data-testid="hp-divider-11" />

      {/* Support Section */}
      <AnimatedSection className="px-4 py-10 sm:px-6 lg:px-8 hp-support-11" data-testid="hp-support-11">
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 sm:p-8 text-center hp-support-box-11" data-testid="hp-support-box-11">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400 hp-support-label-11" data-testid="hp-support-label-11">
            Supporta il progetto
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white hp-support-title-11" data-testid="hp-support-title-11">
            Ti piace quello che faccio?
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300 hp-support-description-11" data-testid="hp-support-description-11">
            Se vuoi supportare il mio lavoro, la mia passione o l&apos;acquisto di attrezzatura sportiva, puoi contribuire alla colletta.
          </p>
          <div className="mt-6">
            <Button asChild size="default" radius="lg" className="bg-[#0070ba] hover:bg-[#005ea6] text-white hp-support-button-11" data-testid="hp-support-button-11">
              <Link href="https://www.paypal.com/pool/9rgt9FR7Or?sr=wccr" target="_blank" rel="noopener noreferrer">
                💙 Dona su PayPal
              </Link>
            </Button>
          </div>
        </div>
      </AnimatedSection>
    </PageShell>
  );
}