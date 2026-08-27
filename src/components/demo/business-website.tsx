'use client';

import type { ReactNode } from 'react';
import type { DemoBusinessNotice, DemoConfig, DemoPublicAppointment } from '@/demo/types';
import { cn } from '@/lib/utils';

type Props = {
  config: DemoConfig;
  lastBooking: DemoPublicAppointment | null;
  businessNotice: DemoBusinessNotice | null;
  isAgentAccess?: boolean;
  overlay?: ReactNode;
  className?: string;
};

/**
 * Rich, authentic early-web local business website mockup inspired by debloat.dev,
 * presenting a complete real-world HVAC service platform.
 */
export function BusinessWebsite({
  config,
  isAgentAccess = false,
  overlay,
  className,
}: Props) {
  return (
    <article
      id="top"
      data-demo-target="storefront"
      data-agent-access={isAgentAccess ? 'true' : 'false'}
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden bg-white font-sans text-[#222]',
        className,
      )}
      aria-label={`${config.businessName} website`}
    >
      {/* Scrollable debloat.dev style website content */}
      <div
        className={cn(
          'pointer-events-none min-h-0 flex-1 select-none overflow-y-auto p-3 text-[12px] leading-tight transition-[filter,opacity,transform] duration-300 ease-out',
          isAgentAccess && 'opacity-20 blur-[2px] scale-[0.99]',
        )}
      >
        <div className="mx-auto max-w-4xl space-y-3 pb-8">
          {/* Top Brand & Search Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ddd] pb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-black tracking-tight text-[#d32f2f]">
                acme
              </span>
              <span className="text-[22px] font-bold tracking-tight text-[#111]">
                hvac
              </span>
              <span className="hidden text-[11px] text-[#666] sm:inline">
                replace the heat — certified emergency heating &amp; air conditioning dispatch
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                readOnly
                tabIndex={-1}
                value="e.g. ac repair, 78701"
                className="w-40 rounded-none border border-[#999] px-2 py-0.5 text-[11px] text-[#555] outline-none"
              />
              <button
                type="button"
                tabIndex={-1}
                className="border border-[#777] bg-[#eee] px-2.5 py-0.5 text-[11px] font-bold text-[#222]"
              >
                Search
              </button>
            </div>
          </div>

          {/* Dual Big Banner Ads */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="border-2 border-[#0033aa] bg-[#0044cc] p-2 text-center text-white shadow-xs">
              <div className="text-[12px] font-black tracking-wide">
                ★ 24/7 EMERGENCY DISPATCH ★
              </div>
              <div className="text-[10px] opacity-90">
                call (512) 555-0199 • Austin, Round Rock, Cedar Park &amp; Travis County
              </div>
            </div>
            <div className="border-2 border-[#006611] bg-[#008822] p-2 text-center text-white shadow-xs">
              <div className="text-[12px] font-black tracking-wide">
                ★ $20 OFF FIRST DIAGNOSTIC VISIT ★
              </div>
              <div className="text-[10px] opacity-90">
                flat-rate pricing • certified technicians • Texas License #TACLA019284E
              </div>
            </div>
          </div>

          {/* Solid Blue Navbar */}
          <nav className="flex items-center justify-between bg-[#003399] px-3 py-1.5 text-[11px] font-bold text-white">
            <div className="flex flex-wrap gap-x-3.5 gap-y-1">
              <span className="cursor-pointer underline">home</span>
              <span className="cursor-pointer underline">services</span>
              <span className="cursor-pointer underline">pricing</span>
              <span className="cursor-pointer underline">service-area</span>
              <span className="cursor-pointer underline">technicians</span>
              <span className="cursor-pointer underline">rebates</span>
              <span className="cursor-pointer underline">reviews</span>
              <span className="cursor-pointer underline">contact</span>
            </div>
            <span className="cursor-pointer underline">technician login</span>
          </nav>

          {/* Main 3-Column Layout */}
          <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-[9rem_1fr_10rem]">
            {/* Left Sidebar: Categories & Badges */}
            <aside className="space-y-3">
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Categories
                </div>
                <ul className="space-y-1 p-2 text-[11px] text-[#0033cc]">
                  <li className="underline">AC Diagnostics <span className="text-[#666]">(14)</span></li>
                  <li className="underline">Heating &amp; Furnaces <span className="text-[#666]">(8)</span></li>
                  <li className="underline">Seasonal Tune-Ups <span className="text-[#666]">(6)</span></li>
                  <li className="underline">Compressor Rebuilds <span className="text-[#666]">(5)</span></li>
                  <li className="underline">Emergency Dispatch <span className="text-[#666]">(12)</span></li>
                  <li className="underline">Duct Cleaning &amp; Air <span className="text-[#666]">(9)</span></li>
                  <li className="underline">Thermostats &amp; Smart <span className="text-[#666]">(4)</span></li>
                  <li className="underline">Commercial HVAC <span className="text-[#666]">(7)</span></li>
                </ul>
              </div>

              {/* Service Certifications Box */}
              <div className="border border-[#ddd] bg-[#fbfbfb] p-2 text-[10px] space-y-1.5">
                <div className="font-bold text-[#111] border-b border-[#eee] pb-1">Certifications</div>
                <div className="flex items-center gap-1 text-[#333]">
                  <span className="font-mono font-bold text-[#0033aa]">[EPA-608]</span>
                  <span>Universal Refrigerant</span>
                </div>
                <div className="flex items-center gap-1 text-[#333]">
                  <span className="font-mono font-bold text-[#008822]">[NATE]</span>
                  <span>Certified HVAC Pro</span>
                </div>
                <div className="flex items-center gap-1 text-[#333]">
                  <span className="font-mono font-bold text-[#b8860b]">[TACLA]</span>
                  <span>#019284E Master</span>
                </div>
              </div>

              {/* Technician On Duty Photo Mock */}
              <div className="border border-[#ddd] p-2 bg-[#fdfdfd] space-y-1">
                <div className="font-bold text-[10px] text-[#222]">On-Call Master Tech</div>
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xs border border-[#999] bg-[#e4e7eb] font-mono text-[10px] font-bold text-[#335588]">
                    TECH
                  </div>
                  <div className="text-[10px] leading-tight">
                    <div className="font-bold text-[#111]">Dave H.</div>
                    <div className="text-[#666]">Travis County Unit #4</div>
                    <div className="text-[#2e7d32] font-semibold">● Active in 78701</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Center Content: Description + Featured Box + Listings Table + FAQs */}
            <main className="space-y-3">
              <p className="text-[11px] text-[#555]">
                family-owned independent hvac service company in austin since 1994. flat-rate verified pricing, certified diagnostics, and guaranteed same-day dispatch.
              </p>

              {/* Featured Card */}
              <div className="border border-[#cca300] bg-[#fffdf0]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  ★ Featured Service
                </div>
                <div className="space-y-1.5 p-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-bold text-[#0033cc] underline text-[13px]">
                      {config.services[0]?.name || 'AC Diagnostic Visit'}
                    </span>
                    <span className="border border-[#b7e1cd] bg-[#e6f4ea] px-1 font-mono text-[9px] font-bold text-[#137333]">
                      FLAT-RATE $89
                    </span>
                    <span className="text-[10px] text-[#b8860b]">★★★★★ (184 reviews)</span>
                  </div>
                  <div className="text-[11px] text-[#444]">
                    replaces Mystery repair fees &amp; unverified contractor hourly quotes
                  </div>
                  <p className="text-[11px] leading-snug text-[#555]">
                    Comprehensive on-site inspection covering compressor health, refrigerant pressure check, electrical capacitors, evaporator coils, and thermostat calibration.
                  </p>
                  <div className="flex items-center justify-between pt-0.5 text-[10px]">
                    <span className="text-[#0033cc] underline cursor-pointer">
                      view technician diagnostic checklist »
                    </span>
                    <span className="font-semibold text-[#2e7d32]">Same-day slots available</span>
                  </div>
                </div>
              </div>

              {/* Services Listings Table */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <div className="text-[11px] font-bold text-[#111]">
                    All Services &amp; Flat Rates
                  </div>
                  <span className="text-[10px] text-[#666]">Updated daily for Travis County</span>
                </div>
                <table className="w-full border-collapse border border-[#ccc] text-[11px]">
                  <thead>
                    <tr className="bg-[#003399] text-left text-white">
                      <th className="p-1.5 font-bold">Service</th>
                      <th className="p-1.5 font-bold">Duration</th>
                      <th className="p-1.5 font-bold">Standard Rate</th>
                      <th className="p-1.5 font-bold">Rating</th>
                      <th className="p-1.5 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.services.map((svc) => (
                      <tr key={svc.id} className="border-b border-[#ddd] odd:bg-white even:bg-[#f9f9f9]">
                        <td className="p-1.5 font-bold text-[#0033cc] underline">
                          {svc.name}
                        </td>
                        <td className="p-1.5 text-[#555]">
                          ~{svc.duration_minutes} mins
                        </td>
                        <td className="p-1.5 font-mono font-bold text-[#2e7d32]">
                          ${svc.price_dollars.toFixed(2)}
                        </td>
                        <td className="p-1.5 text-[#b8860b]">
                          ★★★★★
                        </td>
                        <td className="p-1.5 text-right text-[#0033cc] underline">
                          Bookable
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b border-[#ddd] bg-white">
                      <td className="p-1.5 font-bold text-[#0033cc] underline">
                        Emergency Coil &amp; Capacitor Repair
                      </td>
                      <td className="p-1.5 text-[#555]">~60 mins</td>
                      <td className="p-1.5 font-mono font-bold text-[#2e7d32]">$149.00</td>
                      <td className="p-1.5 text-[#b8860b]">★★★★☆</td>
                      <td className="p-1.5 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                    <tr className="border-b border-[#ddd] bg-[#f9f9f9]">
                      <td className="p-1.5 font-bold text-[#0033cc] underline">
                        Air Duct Flow &amp; Filter Audit
                      </td>
                      <td className="p-1.5 text-[#555]">~45 mins</td>
                      <td className="p-1.5 font-mono font-bold text-[#2e7d32]">$49.00</td>
                      <td className="p-1.5 text-[#b8860b]">★★★★★</td>
                      <td className="p-1.5 text-right text-[#0033cc] underline">Bookable</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Customer Testimonials Box */}
              <div className="border border-[#ddd] p-2.5 bg-[#fcfcfc] space-y-1.5">
                <div className="font-bold text-[11px] text-[#111]">Recent Customer Reviews</div>
                <div className="space-y-1 text-[10px] text-[#444]">
                  <p className="border-l-2 border-[#b8860b] pl-2 italic">
                    &ldquo;AC was blowing hot air on a 102-degree afternoon. Dave arrived within an hour and replaced the capacitor. Great flat-rate price.&rdquo;
                    <span className="block text-[#777] not-italic">— Sarah M., Austin 78704 (Aug 2026)</span>
                  </p>
                  <p className="border-l-2 border-[#b8860b] pl-2 italic">
                    &ldquo;Honest diagnostic. Did not try to sell me a whole new unit like the big franchise companies did.&rdquo;
                    <span className="block text-[#777] not-italic">— Marcus R., Austin 78701 (Jul 2026)</span>
                  </p>
                </div>
              </div>
            </main>

            {/* Right Sidebar: Wanted / Service Area / Stats / Guarantee */}
            <aside className="space-y-2.5">
              {/* Service Area block */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Service Area
                </div>
                <div className="space-y-1.5 p-2 text-[10px] text-[#444]">
                  <p>Travis County Metro</p>
                  <div className="text-[10px] text-[#555] leading-tight">
                    78701, 78702, 78703, 78704, 78745, 78751, 78758, 78759
                  </div>
                  <div className="flex gap-1 pt-0.5">
                    <input
                      readOnly
                      tabIndex={-1}
                      value="78701"
                      className="w-full border border-[#aaa] px-1 py-0.5 text-[10px]"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="border border-[#888] bg-[#eee] px-1.5 text-[10px] font-bold"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats block */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Live Dispatch
                </div>
                <div className="space-y-1 p-2 text-[11px] text-[#333]">
                  <div><strong className="text-[13px] text-[#111]">3</strong> active trucks</div>
                  <div><strong className="text-[13px] text-[#111]">184</strong> jobs this month</div>
                  <div className="text-[10px] text-[#2e7d32] font-semibold">● Open for bookings</div>
                </div>
              </div>

              {/* Wanted / Dispatch requests */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Wanted
                </div>
                <ul className="space-y-1 p-2 text-[10px] text-[#0033cc]">
                  <li className="underline">• Emergency tech 78701...</li>
                  <li className="underline">• Heat pump compressor...</li>
                  <li className="underline">• Duct sealing review...</li>
                  <li className="underline">• Capacitor replacement...</li>
                </ul>
                <div className="border-t border-[#eee] px-2 py-0.5 text-[10px] text-[#0033cc] underline">
                  all requests »
                </div>
              </div>

              {/* 100% Guarantee Badge */}
              <div className="border border-[#b8860b] bg-[#fffdf0] p-2 text-[10px] text-center space-y-0.5">
                <div className="font-bold text-[#8b0000]">100% Work Guarantee</div>
                <p className="text-[9px] text-[#666]">Parts &amp; labor warrantied for 1 full year.</p>
              </div>
            </aside>
          </div>

          {/* Full Web Footer */}
          <footer className="border-t border-[#ccc] pt-3 text-center text-[10px] text-[#666] space-y-1">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[#0033cc]">
              <span className="underline">About Acme</span>
              <span>•</span>
              <span className="underline">Warranty Policy</span>
              <span>•</span>
              <span className="underline">Emergency Guidelines</span>
              <span>•</span>
              <span className="underline">Technician Directory</span>
              <span>•</span>
              <span className="underline">Austin Dispatch Hub</span>
            </div>
            <p>© 1994–2026 {config.businessName} Company. 4802 S Congress Ave, Austin, TX 78745 • License #TACLA019284E</p>
          </footer>
        </div>
      </div>

      {/* Floating Agent Capability Overlay */}
      {overlay ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-[2px] bg-white/30 transition-all duration-300"
          data-demo-target="overlay-container"
        >
          {overlay}
        </div>
      ) : null}
    </article>
  );
}

