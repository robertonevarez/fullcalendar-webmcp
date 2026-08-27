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
 * Utilitarian directory website mockup inspired by debloat.dev,
 * demonstrating that standard web surfaces can adopt WebMCP agent capabilities.
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
          isAgentAccess && 'opacity-25 blur-[0.5px] scale-[0.99]',
        )}
      >
        <div className="mx-auto max-w-4xl space-y-2.5">
          {/* Top Brand & Search Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-black tracking-tight text-[#d32f2f]">
                acme
              </span>
              <span className="text-[20px] font-bold tracking-tight text-[#111]">
                hvac
              </span>
              <span className="hidden text-[11px] text-[#666] sm:inline">
                replace the heat — certified technician dispatch &amp; flat-rate cooling services
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                readOnly
                tabIndex={-1}
                value="e.g. ac repair, 78701"
                className="w-36 rounded-none border border-[#999] px-1.5 py-0.5 text-[11px] text-[#555] outline-none"
              />
              <button
                type="button"
                tabIndex={-1}
                className="border border-[#777] bg-[#eee] px-2 py-0.5 text-[11px] font-bold text-[#222]"
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
                call (512) 555-0199 • Austin, Round Rock &amp; Cedar Park
              </div>
            </div>
            <div className="border-2 border-[#006611] bg-[#008822] p-2 text-center text-white shadow-xs">
              <div className="text-[12px] font-black tracking-wide">
                ★ $20 OFF FIRST DIAGNOSTIC ★
              </div>
              <div className="text-[10px] opacity-90">
                flat rates • certified pros • license #TACLA019284E
              </div>
            </div>
          </div>

          {/* Solid Blue Navbar */}
          <nav className="flex items-center justify-between bg-[#003399] px-3 py-1 text-[11px] font-bold text-white">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="cursor-pointer underline">home</span>
              <span className="cursor-pointer underline">services</span>
              <span className="cursor-pointer underline">pricing</span>
              <span className="cursor-pointer underline">service-area</span>
              <span className="cursor-pointer underline">technicians</span>
              <span className="cursor-pointer underline">schedule</span>
            </div>
            <span className="cursor-pointer underline">sign in</span>
          </nav>

          {/* Main 3-Column Layout */}
          <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-[8.5rem_1fr_9.5rem]">
            {/* Left Sidebar: Categories */}
            <aside className="space-y-3">
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Categories
                </div>
                <ul className="space-y-1 p-2 text-[11px] text-[#0033cc]">
                  <li className="underline">AC Diagnostics <span className="text-[#666]">(14)</span></li>
                  <li className="underline">Heating &amp; Furnaces <span className="text-[#666]">(8)</span></li>
                  <li className="underline">Tune-Ups <span className="text-[#666]">(6)</span></li>
                  <li className="underline">Duct Inspection <span className="text-[#666]">(5)</span></li>
                  <li className="underline">Emergency Dispatch <span className="text-[#666]">(12)</span></li>
                  <li className="underline">Commercial HVAC <span className="text-[#666]">(9)</span></li>
                  <li className="underline">Thermostats <span className="text-[#666]">(4)</span></li>
                  <li className="underline">Air Filters <span className="text-[#666]">(7)</span></li>
                </ul>
              </div>
            </aside>

            {/* Center Content: Description + Featured Box + Listings Table */}
            <main className="space-y-2.5">
              <p className="text-[11px] text-[#555]">
                open-access technicians for central texas. every service is flat-rate verified — anyone can book, no account needed.
              </p>

              {/* Featured Card */}
              <div className="border border-[#cca300] bg-[#fffdf0]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  ★ Featured
                </div>
                <div className="space-y-1 p-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-bold text-[#0033cc] underline">
                      {config.services[0]?.name || 'AC Diagnostic Visit'}
                    </span>
                    <span className="border border-[#b7e1cd] bg-[#e6f4ea] px-1 font-mono text-[9px] font-bold text-[#137333]">
                      FLAT-RATE
                    </span>
                    <span className="text-[10px] text-[#b8860b]">★★★★☆ (184)</span>
                  </div>
                  <div className="text-[11px] text-[#444]">
                    replaces Mystery repair fees / unverified contractor quotes
                  </div>
                  <p className="text-[11px] text-[#555]">
                    Full compressor audit, refrigerant levels check, coil inspection, and electrical test.
                  </p>
                  <div className="text-[10px] text-[#0033cc] underline">
                    0 post(s) »
                  </div>
                </div>
              </div>

              {/* Services Listings Table */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-[#111]">
                  Available Services
                </div>
                <table className="w-full border-collapse border border-[#ccc] text-[11px]">
                  <thead>
                    <tr className="bg-[#003399] text-left text-white">
                      <th className="p-1 font-bold">Service</th>
                      <th className="p-1 font-bold">Coverage</th>
                      <th className="p-1 font-bold">Rate</th>
                      <th className="p-1 font-bold">Rating</th>
                      <th className="p-1 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.services.map((svc) => (
                      <tr key={svc.id} className="border-b border-[#ddd] odd:bg-white even:bg-[#f9f9f9]">
                        <td className="p-1 font-bold text-[#0033cc] underline">
                          {svc.name}
                        </td>
                        <td className="p-1 text-[#555]">
                          Austin Metro
                        </td>
                        <td className="p-1 font-mono font-bold text-[#2e7d32]">
                          ${svc.price_dollars.toFixed(2)}
                        </td>
                        <td className="p-1 text-[#b8860b]">
                          ★★★★★
                        </td>
                        <td className="p-1 text-right text-[#0033cc] underline">
                          Open
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </main>

            {/* Right Sidebar: Wanted / Service Area / Stats */}
            <aside className="space-y-2.5">
              {/* Wanted block */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Wanted
                </div>
                <ul className="space-y-1 p-2 text-[10px] text-[#0033cc]">
                  <li className="underline">• Emergency tech 78701...</li>
                  <li className="underline">• Heat pump audit...</li>
                  <li className="underline">• Duct sealing review...</li>
                  <li className="underline">• 24h compressor swap...</li>
                </ul>
                <div className="border-t border-[#eee] px-2 py-1 text-[10px] text-[#0033cc] underline">
                  all requests »
                </div>
              </div>

              {/* Service Area block */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Service Area
                </div>
                <div className="space-y-1.5 p-2 text-[10px] text-[#444]">
                  <p>Travis County (78701, 78702, 78704, 78745, 78751, 78758)</p>
                  <input
                    readOnly
                    tabIndex={-1}
                    value="78701"
                    className="w-full border border-[#aaa] px-1 py-0.5 text-[10px]"
                  />
                </div>
              </div>

              {/* Stats block */}
              <div className="border border-[#ddd]">
                <div className="border-b border-[#cca300] bg-[#ffcc00] px-2 py-0.5 text-[11px] font-bold text-black">
                  Stats
                </div>
                <div className="space-y-1 p-2 text-[11px] text-[#333]">
                  <div><strong className="text-[13px] text-[#111]">3</strong> active techs</div>
                  <div><strong className="text-[13px] text-[#111]">184</strong> visits completed</div>
                </div>
              </div>

              {/* Publish / Sign in block */}
              <div className="border border-[#cca300] bg-[#fffdf0] p-2 text-[10px]">
                <div className="font-bold text-[#111]">WebMCP Enabled</div>
                <p className="mt-0.5 text-[#666]">Autonomous agent booking enabled via standard protocol.</p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Floating Agent Capability Overlay */}
      {overlay ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4"
          data-demo-target="overlay-container"
        >
          {overlay}
        </div>
      ) : null}
    </article>
  );
}

