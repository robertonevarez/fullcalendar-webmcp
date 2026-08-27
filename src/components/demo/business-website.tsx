'use client';

import type { DemoBusinessNotice, DemoConfig, DemoPublicAppointment, DemoServiceInput } from '@/demo/types';
import { formatPriceCents } from '@/demo/format';
import { cn } from '@/lib/utils';
import {
  BookingNotice,
  BusinessHours,
  ServiceArea,
  ServiceMeta,
  StorefrontAction,
  StorefrontNav,
  TeamList,
} from '@/components/demo/storefront-primitives';

type Props = {
  config: DemoConfig;
  lastBooking: DemoPublicAppointment | null;
  businessNotice: DemoBusinessNotice | null;
  className?: string;
};

function displayPrice(service: DemoServiceInput): string {
  return formatPriceCents(Math.round(service.price_dollars * 100)).replace(/\.00$/, '');
}

function serviceDescription(service: DemoServiceInput, archetype: DemoConfig['archetype']): string {
  const name = service.name.toLowerCase();

  if (archetype === 'field_service') {
    if (name.includes('diagnostic')) return 'Cooling-system inspection and diagnosis.';
    if (name.includes('maintenance') || name.includes('tune')) return 'Seasonal HVAC tune-up and safety check.';
    return `${service.duration_minutes}-minute heating and cooling service.`;
  }

  if (archetype === 'salon') {
    if (name.includes('color')) return 'Color service planned around your next look.';
    if (name.includes('haircut') || name.includes('cut')) return 'A cut and finish with your stylist.';
    return `${service.duration_minutes}-minute salon appointment.`;
  }

  if (name.includes('oil')) return 'Oil and filter service for everyday driving.';
  if (name.includes('brake')) return 'A focused check of your braking system.';
  return `${service.duration_minutes}-minute service appointment.`;
}

function HvacWebsite({ config }: { config: DemoConfig }) {
  return (
    <div className="font-[Comic_Sans_MS,Comic_Sans,cursive] bg-[#fffef1] text-[#11116b]">
      <StorefrontNav
        businessName={config.businessName}
        descriptor="Heating + air"
        actionLabel="SCHEDULE SERVICE"
        actionHref="#contact"
        links={[
          { href: '#top', label: 'HOME' },
          { href: '#services', label: 'SERVICES' },
          { href: '#contact', label: 'CONTACT US' },
        ]}
        className="border-b-2 border-[#11116b] bg-[#dceeff] px-4 py-3 md:px-5"
        brandClassName="text-[#11116b]"
        linkClassName="text-[#0000b5] underline"
        actionClassName="rounded-none border-2 border-[#11116b] bg-[#fff26a] px-3 py-1.5 text-[#11116b] hover:bg-[#ffe83d]"
      />

      <main>
        <section id="visit" className="border-b-2 border-[#11116b] bg-[#fffef1] px-4 py-4 text-center md:py-5">
          <h1 className="text-xl font-bold uppercase leading-tight tracking-wide md:text-2xl">
            *** {config.locationLabel?.replace(/,.*$/, '') ?? 'Local'} Heating &amp; Cooling Service ***
          </h1>
          <p className="mt-2 text-lg font-bold uppercase text-[#b00020]">Need your AC fixed???</p>
          <p className="mx-auto mt-1 max-w-lg text-sm leading-snug text-[#25255f]">
            Heating and cooling help for homes in our service area.
          </p>
          <StorefrontAction
            href="#contact"
            className="mt-4 rounded-none border-2 border-[#11116b] bg-[#fff26a] text-[#11116b] hover:bg-[#ffe83d]"
          >
            SCHEDULE SERVICE
          </StorefrontAction>
        </section>

        <section id="services" className="bg-[#e8f4ff] px-4 py-5 md:px-5 md:py-6">
          <h2 className="border-b-2 border-[#11116b] pb-2 text-lg font-bold uppercase text-[#b00020]">
            Our Services
          </h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {config.services.map((service) => (
              <li key={service.id} className="border-2 border-[#11116b] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase leading-tight">{service.name}</h3>
                  <p className="shrink-0 text-sm font-bold text-[#b00020]">{displayPrice(service)}</p>
                </div>
                <p className="mt-2 text-xs leading-snug text-[#25255f]">
                  {serviceDescription(service, config.archetype)}
                </p>
                <p className="mt-2 text-xs font-bold tabular-nums">{service.duration_minutes} min appointment</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="contact" className="border-t-2 border-[#11116b] bg-[#fff26a] px-4 py-5 md:px-5">
          <div className="grid gap-4 md:grid-cols-2">
            <ServiceArea postalCodes={config.postalCodes} locationLabel={config.locationLabel} label="Serving" showIcon={false} />
            <BusinessHours availability={config.availability} label="Business hours" showIcon={false} />
          </div>
          <p className="mt-4 border-t border-[#11116b]/40 pt-3 text-sm font-bold">
            Questions about your system? Please use the schedule link above.
          </p>
        </section>
      </main>
    </div>
  );
}

function SalonWebsite({ config }: { config: DemoConfig }) {
  return (
    <div className="font-serif bg-[#fff8f5] text-[#613646]">
      <StorefrontNav
        businessName={config.businessName}
        descriptor="Hair salon"
        actionLabel="BOOK NOW"
        links={[
          { href: '#top', label: 'Home' },
          { href: '#services', label: 'Services' },
          { href: '#visit', label: 'Visit us' },
        ]}
        className="border-b-2 border-[#d79baa] bg-[#f6dfe5] px-4 py-3 md:px-5"
        brandClassName="text-[#613646]"
        linkClassName="text-[#82465a] underline"
        actionClassName="rounded-none border border-[#8e4e63] bg-[#f4cbd5] px-4 py-1.5 uppercase text-[#613646] hover:bg-[#edb8c7]"
      />

      <main>
        <section id="visit" className="border-b-2 border-[#d79baa] px-4 py-7 text-center md:py-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6575]">Welcome to {config.businessName}</p>
          <h1 className="mt-3 font-[cursive] text-3xl leading-tight text-[#71384e] md:text-4xl">
            Beautiful hair starts here
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#795462]">
            Haircuts and color appointments for your next visit.
          </p>
          <StorefrontAction href="#services" className="mt-5 rounded-none border border-[#8e4e63] bg-[#f4cbd5] uppercase text-[#613646] hover:bg-[#edb8c7]">
            Book an appointment
          </StorefrontAction>
        </section>

        <section id="services" className="bg-[#fff1ee] px-4 py-5 md:px-5 md:py-6">
          <h2 className="text-center font-[cursive] text-2xl text-[#71384e]">Our Services</h2>
          <p className="mt-1 text-center text-xs text-[#9a6575]">Please allow the listed time for your appointment.</p>
          <ul className="mx-auto mt-4 max-w-xl divide-y divide-[#d79baa] border-y border-[#d79baa]">
            {config.services.map((service) => (
              <li key={service.id} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-base font-bold">{service.name}</h3>
                  <p className="shrink-0 text-sm font-bold text-[#8e4e63]">{displayPrice(service)}</p>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs italic text-[#795462]">{serviceDescription(service, config.archetype)}</p>
                  <ServiceMeta service={service} className="text-[#9a6575] opacity-100" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 border-t-2 border-[#d79baa] bg-[#f6dfe5] px-4 py-5 md:grid-cols-2 md:px-5">
          <TeamList staff={config.staff} label="Our stylists" />
          <BusinessHours availability={config.availability} label="Opening hours" showIcon={false} />
        </section>
      </main>
    </div>
  );
}

function AutoWebsite({ config }: { config: DemoConfig }) {
  return (
    <div className="bg-[#171717] text-[#f7f7f7]">
      <StorefrontNav
        businessName={config.businessName}
        descriptor="Auto service"
        actionLabel="BOOK SERVICE"
        links={[
          { href: '#top', label: 'HOME' },
          { href: '#services', label: 'SERVICES' },
          { href: '#shop', label: 'OUR SHOP' },
        ]}
        className="border-b-4 border-[#e5b700] bg-[#242424] px-4 py-3 md:px-5"
        brandClassName="text-white"
        linkClassName="text-[#ffdb4d] underline"
        actionClassName="rounded-none border-2 border-[#e5b700] bg-[#e5b700] px-3 py-1.5 uppercase text-[#171717] hover:bg-[#ffd52a]"
      />

      <main className="font-sans">
        <section id="visit" className="border-b-2 border-[#d32632] bg-[#202020] px-4 py-5 md:px-5 md:py-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e5b700]">Maintenance + inspection</p>
          <h1 className="mt-3 max-w-xl text-2xl font-black uppercase leading-none tracking-tight text-white md:text-3xl">
            Straightforward service for your car.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-[#c7c7c7]">Clear appointments for the work your car needs next.</p>
          <StorefrontAction href="#services" className="mt-5 rounded-none border-2 border-[#e5b700] bg-[#e5b700] uppercase text-[#171717] hover:bg-[#ffd52a]">
            Schedule service
          </StorefrontAction>
        </section>

        <section id="services" className="bg-[#171717] px-4 py-5 md:px-5 md:py-6">
          <h2 className="border-b-2 border-[#e5b700] pb-2 text-lg font-black uppercase text-[#e5b700]">Our services</h2>
          <ul className="mt-3 border-2 border-[#5c5c5c]">
            {config.services.map((service, index) => (
              <li key={service.id} className="border-b border-[#5c5c5c] px-3 py-3 last:border-b-0">
                <div className="grid gap-2 md:grid-cols-[2rem_1fr_auto] md:items-start">
                  <span className="text-xs font-bold text-[#d32632]">0{index + 1}</span>
                  <div>
                    <h3 className="text-sm font-black uppercase">{service.name}</h3>
                    <p className="mt-1 text-xs text-[#bdbdbd]">{serviceDescription(service, config.archetype)}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm font-bold text-[#e5b700]">{displayPrice(service)}</p>
                    <ServiceMeta service={service} className="mt-1 text-[#bdbdbd] opacity-100" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="shop" className="grid gap-4 border-t-2 border-[#d32632] bg-[#242424] px-4 py-5 md:grid-cols-2 md:px-5">
          <TeamList staff={config.staff} label="Technicians" className="text-white" />
          <BusinessHours availability={config.availability} label="Shop hours" showIcon={false} />
        </section>
      </main>
    </div>
  );
}

/** The human-facing surface is composed by business type, not database shape. */
export function BusinessWebsite({ config, lastBooking, businessNotice, className }: Props) {
  const website =
    config.archetype === 'salon' ? <SalonWebsite config={config} /> : config.archetype === 'auto' ? <AutoWebsite config={config} /> : <HvacWebsite config={config} />;

  const noticeClassName =
    config.archetype === 'auto'
      ? 'border-[#e5b700] bg-[#202020] text-white'
      : config.archetype === 'salon'
        ? 'border-[#d79baa] bg-[#f6dfe5] text-[#613646]'
        : 'border-[#11116b] bg-[#fff26a] text-[#11116b]';

  return (
    <article
      id="top"
      data-demo-target="storefront"
      className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}
      aria-label={`${config.businessName} website`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">{website}</div>
      <BookingNotice config={config} lastBooking={lastBooking} businessNotice={businessNotice} className={noticeClassName} />
    </article>
  );
}
