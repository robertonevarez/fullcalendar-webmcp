import type { Metadata } from 'next';
import { Hero } from '@/components/hero';
import {
  BookingFunnelsSection,
  BusinessControlSection,
  ClosingCtaSection,
  LiveInteractionSection,
  MultiVerticalSection,
  TechnicalCredibilitySection,
} from '@/components/home-sections';

export const metadata: Metadata = {
  title: 'Protocol Tooling — Make your business bookable by AI agents',
  description:
    'Protocol Tooling lets people book your services through the AI they already use. Agent-native scheduling for service businesses, open source.',
  openGraph: {
    title: 'Protocol Tooling — Make your business bookable by AI agents',
    description:
      'Protocol Tooling lets people book your services through the AI they already use. Agent-native scheduling for service businesses, open source.',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <LiveInteractionSection />
      <BookingFunnelsSection />
      <BusinessControlSection />
      <MultiVerticalSection />
      <TechnicalCredibilitySection />
      <ClosingCtaSection />
    </main>
  );
}
