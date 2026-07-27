import type { Metadata } from 'next';
import type { CSSProperties } from 'react';

import { AnimatedSection, PageShell, CardGrid, Text } from '@/components/generic';
import { Stripe } from '@/components/Stripe';
import {
  ActivityIcon,
  GithubIcon,
  LinkedinIcon,
  MailIcon,
  SOCIAL_BRAND_COLORS,
  SOCIAL_LABELS,
  type SocialType,
} from '@/components/Icons';

import aboutJson from './data/about.json';
import type { AboutContentData } from './data/types';

const about = aboutJson as AboutContentData;

const SKILLS_CAROUSEL_IMAGE = 'https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1778504874/electrical-engineer-wp_mfqbwh.jpg';
const PASSIONS_CAROUSEL_IMAGE = 'https://res.cloudinary.com/derbnvxif/image/upload/q_auto/f_auto/v1778505543/running-wp_virem9.jpg';

// ── Social icons inline ───────────────────────────────────────────────
type ContactSocialType = SocialType;

const CONTACT_BRAND_COLORS = SOCIAL_BRAND_COLORS;
const CONTACT_LABELS = SOCIAL_LABELS;

function contactIconStyle(type: ContactSocialType): CSSProperties {
  return { backgroundColor: 'transparent', borderColor: CONTACT_BRAND_COLORS[type], color: CONTACT_BRAND_COLORS[type] };
}

function ContactIcon({ type, href }: { type: ContactSocialType; href: string }) {
  const isExternal = /^https?:\/\//.test(href);
  const iconEl = type === 'github' ? <GithubIcon className="h-6 w-6" />
    : type === 'linkedin' ? <LinkedinIcon className="h-6 w-6" />
    : type === 'email' ? <MailIcon className="h-6 w-6" aria-hidden="true" />
    : <ActivityIcon className="h-6 w-6" aria-hidden="true" />;

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      aria-label={CONTACT_LABELS[type]}
      className="inline-flex items-center justify-center rounded-full border transition-all duration-200 hover:scale-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 p-2.5"
      style={contactIconStyle(type)}
    >
      {iconEl}
    </a>
  );
}

function iconNameToSocialType(icon: string): ContactSocialType | null {
  if (icon === 'Github') return 'github';
  if (icon === 'Linkedin') return 'linkedin';
  if (icon === 'Mail') return 'email';
  if (icon === 'Activity') return 'strava';
  return null;
}
// ─────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Chi Sono | MZ Exploration',
  description:
    'Sviluppatore web/mobile orientato a prodotti digitali utili e accessibili: visione, competenze, passioni e contatti.',
  keywords: ['chi sono', 'sviluppatore web', 'sviluppatore mobile', 'next.js', 'portfolio'],
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'Chi Sono | MZ Exploration',
    description:
      'Visione personale, background tecnico e passioni che guidano il progetto MZ Exploration.',
    url: '/about',
    type: 'profile',
  },
};

export default function AboutPage() {
  const aboutSocialEntries = about.contacts
    .map((contact) => {
      const socialType = iconNameToSocialType(contact.icon);
      if (!socialType) return null;
      return [socialType, contact.href] as const;
    })
    .filter((entry): entry is readonly [ContactSocialType, string] => entry !== null);

  const aboutSocialIcons = aboutSocialEntries.map(([type]) => type);
  const aboutSocialLinks = Object.fromEntries(aboutSocialEntries) as Partial<Record<ContactSocialType, string>>;

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Moreno Zuddas',
    jobTitle: 'Web/Mobile Developer',
    url: '/about',
    sameAs: about.contacts.filter((contact) => !contact.href.startsWith('mailto:')).map((contact) => contact.href),
  };

  return (
    <PageShell background="white" className="about-main-4" data-testid="about-main-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <Stripe
          imageSrc={about.hero.imageSrc}
          imageAlt={about.hero.imageAlt}
          imageQuote={about.hero.favoriteQuote}
          imagePosition="right"
          imageSize="md"
          imageKind="pic-portrait"
          title={about.hero.headline}
          subtitle={about.hero.tagline}
          buttons={{
            label: about.hero.ctaLabel,
            href: about.hero.ctaHref,
            tone: 'white',
          }}
          background="navy"
          size="sm"
          className="about-hero-stripe"
          data-testid="about-hero-section"
        />

        <AnimatedSection className="about-skills-4" delay={0.1}>
          <section data-testid="about-skills-section">
            <CardGrid
              variant="flip-card"
              title="Competenze e Background"
              subtitle=""
              titlePosition="center"
              items={about.skills.map((skill) => ({
                id: `${skill.category}-${skill.name}`,
                title: skill.name,
                href: '#',
                category: skill.category,
                description: skill.description,
                iconName: skill.icon,
                flipCardTone: skill.tone,
                image: skill.image,
              }))}
              flipCardOrientation="horizontal"
              flipCardColumns={3}
              flipCardCenterIncompleteRow
              flipCardImageSrc={SKILLS_CAROUSEL_IMAGE}
              flipCardImageAlt="Background competenze"
              tone="blue"
              headerColor="current"
              cardHeight="medium"
              useMotion={false}
            />
          </section>
        </AnimatedSection>

        <div className="my-8 h-px bg-slate-200 dark:bg-slate-800/90" aria-hidden="true" />

        <AnimatedSection className="about-mission-4" delay={0.05}>
                  <section data-testid="about-mission-section">
                    <Text as="h2" variant="subtitle" align="center" className="text-slate-900 dark:text-slate-100 sm:text-2xl">
                      {about.mission.title}
                    </Text>
                    <div className="mt-4 space-y-3 sm:space-y-4">
                      {about.mission.paragraphs.map((paragraph) => (
                        <Text key={paragraph} as="p" variant="body" className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:text-base">
                          {paragraph}
                        </Text>
                      ))}
                    </div>
                  </section>
                </AnimatedSection>

                <div className="my-8 h-px bg-slate-200 dark:bg-slate-800/90" aria-hidden="true" />

        <AnimatedSection className="about-passions-4" delay={0.15}>
          <section data-testid="about-passions-section">
            <CardGrid
              variant="flip-card"
              title="Passioni e Hobby"
              subtitle="La mia vita oltre la figura professionale"
              titlePosition="center"
              items={about.passions.map((passion) => ({
                id: passion.title,
                title: passion.title,
                href: '#',
                description: passion.description,
                iconName: passion.icon,
                flipCardTone: passion.tone,
                image: passion.image,
              }))}
              flipCardOrientation="horizontal"
              flipCardColumns={2}
              flipCardCenterIncompleteRow
              flipCardImageSrc={PASSIONS_CAROUSEL_IMAGE}
              flipCardImageAlt="Passioni e hobby"
              tone="purple"
              headerColor="current"
              cardHeight="medium"
              flipCardWidth="large"
              useMotion={false}
            />
          </section>
        </AnimatedSection>

        <div className="my-8 h-px bg-slate-200 dark:bg-slate-800/90" aria-hidden="true" />

        <AnimatedSection className="about-cta-4" delay={0.2}>
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 sm:p-8" data-testid="about-cta-section">
            <Text as="h2" variant="subtitle" className="text-slate-900 dark:text-slate-100 sm:text-2xl">
              Vuoi collaborare?
            </Text>
            <Text as="p" variant="body" className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Se vuoi confrontarti su una collaborazione, un prodotto o una nuova idea, puoi trovarmi qui.
            </Text>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {aboutSocialIcons.map((type) => (
                <ContactIcon key={type} type={type} href={aboutSocialLinks[type] ?? '#'} />
              ))}
            </div>

            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
              <Text as="p" variant="body" className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                Se vuoi supportare il mio lavoro, la mia passione o l&apos;acquisto di attrezzatura sportiva, puoi contribuire alla colletta.
              </Text>
              <div className="mt-4">
                <a
                  href="https://www.paypal.com/pool/9rgt9FR7Or?sr=wccr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: '#0070ba' }}
                  data-testid="about-paypal-donate-button"
                >
                  💙 Dona su PayPal
                </a>
              </div>
            </div>
          </section>
        </AnimatedSection>
      </div>
    </PageShell>
  );
}

