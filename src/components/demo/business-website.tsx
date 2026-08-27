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
 * Outdated, HTML-driven website mockup demonstrating that legacy
 * and static web surfaces can adopt WebMCP agent capabilities.
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
        'relative flex h-full min-h-0 flex-col overflow-hidden bg-[#faf9f5] font-serif text-[#222]',
        className,
      )}
      aria-label={`${config.businessName} website`}
    >
      {/* Scrollable retro HTML website content */}
      <div
        className={cn(
          'pointer-events-none min-h-0 flex-1 select-none overflow-y-auto p-4 transition-[filter,opacity,transform] duration-300 ease-out',
          isAgentAccess && 'opacity-25 blur-[0.5px] scale-[0.99]',
        )}
      >
        <div className="mx-auto max-w-2xl space-y-4 border border-[#bbb] bg-white p-4 shadow-sm">
          {/* Header Banner */}
          <header className="border-b-2 border-[#8b0000] pb-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
              <h1 className="text-xl font-bold tracking-tight text-[#8b0000]">
                {config.businessName}
              </h1>
              <span className="text-[11px] text-[#666]">
                Est. 1994 • License #TACLA019284E
              </span>
            </div>
            <p className="text-[12px] italic text-[#444]">
              &ldquo;Fast, Honest, and Dependable Heating & Air Conditioning in Central Texas&rdquo;
            </p>
          </header>

          {/* Pipe Navigation */}
          <nav className="border-y border-[#ccc] bg-[#f0eee9] py-1 text-center font-sans text-[11px] font-medium text-[#003366]">
            <span>[ Home ]</span>
            <span className="mx-2 text-[#999]">|</span>
            <span>[ Our Services ]</span>
            <span className="mx-2 text-[#999]">|</span>
            <span>[ Service Area ]</span>
            <span className="mx-2 text-[#999]">|</span>
            <span>[ Schedule Service ]</span>
            <span className="mx-2 text-[#999]">|</span>
            <span>[ Contact ]</span>
          </nav>

          {/* Emergency Bulletin */}
          <div className="border border-dashed border-[#b8860b] bg-[#fffdf0] p-2 text-center text-[12px]">
            <strong className="text-[#8b0000]">*** 24/7 DISPATCH PHONE: (512) 555-0199 ***</strong>
            <p className="text-[11px] text-[#555]">
              Same-day technician visits available across Austin and surrounding counties.
            </p>
          </div>

          {/* Main Content: Services Table */}
          <section className="space-y-2">
            <h2 className="border-b border-[#ccc] text-[14px] font-bold text-[#333]">
              Standard HVAC Services &amp; Flat Rates
            </h2>
            <table className="w-full border-collapse border border-[#999] text-[12px]">
              <thead>
                <tr className="bg-[#e4e2dc] text-left font-sans text-[11px] text-[#222]">
                  <th className="border border-[#999] p-1.5 font-bold">Service</th>
                  <th className="border border-[#999] p-1.5 font-bold">Est. Duration</th>
                  <th className="border border-[#999] p-1.5 font-bold text-right">Standard Rate</th>
                </tr>
              </thead>
              <tbody>
                {config.services.map((svc) => (
                  <tr key={svc.id} className="odd:bg-white even:bg-[#f9f8f6]">
                    <td className="border border-[#999] p-1.5 font-medium">
                      {svc.name}
                    </td>
                    <td className="border border-[#999] p-1.5 font-sans text-[11px] text-[#555]">
                      ~{svc.duration_minutes} mins
                    </td>
                    <td className="border border-[#999] p-1.5 text-right font-mono text-[11px] font-semibold text-[#111]">
                      ${svc.price_dollars.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Two-column details: Service Area & Business Hours */}
          <div className="grid grid-cols-1 gap-3 pt-1 text-[12px] sm:grid-cols-2">
            <div className="border border-[#ddd] bg-[#fbfbf9] p-2.5">
              <h3 className="mb-1 font-bold text-[#333]">Service Coverage (ZIPs)</h3>
              <p className="text-[11px] leading-relaxed text-[#555]">
                Travis County: 78701, 78702, 78703, 78704, 78745, 78751, 78758, 78759. Call for extended territory.
              </p>
            </div>
            <div className="border border-[#ddd] bg-[#fbfbf9] p-2.5">
              <h3 className="mb-1 font-bold text-[#333]">Operating Hours</h3>
              <p className="text-[11px] leading-relaxed text-[#555]">
                Mon–Fri: 7:00 AM – 6:00 PM<br />
                Saturday: 8:00 AM – 3:00 PM<br />
                Sunday: On-Call Emergency Service
              </p>
            </div>
          </div>

          {/* Retro HTML Footer */}
          <footer className="border-t border-[#ccc] pt-3 text-center font-sans text-[10px] text-[#777]">
            <p>© 1994–2004 {config.businessName}. All rights reserved.</p>
            <p className="mt-0.5 text-[#999]">
              Best viewed in 1024×768 resolution • WebMCP Machine-Readable Interface Active
            </p>
          </footer>
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

