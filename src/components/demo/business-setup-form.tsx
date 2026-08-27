'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cloneDemoConfig } from '@/demo/normalize';
import { DEFAULT_DEMO_CONFIG } from '@/demo/defaults';
import { formatDaysLabel, formatHoursLabel, formatPriceCents } from '@/demo/format';
import type { DemoConfig, DemoServiceInput } from '@/demo/types';
import { cn } from '@/lib/utils';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const;

const fieldClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tracking-tight outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
const labelClass = 'text-sm font-medium tracking-tight text-foreground';
const hintClass = 'text-sm text-muted-foreground tracking-tight';

type Props = {
  initialConfig?: DemoConfig;
  onSubmit: (config: DemoConfig) => void;
};

function newService(): DemoServiceInput {
  return {
    id: `demo_svc_${crypto.randomUUID().slice(0, 8)}`,
    name: '',
    duration_minutes: 60,
    price_dollars: 0,
  };
}

export function BusinessSetupForm({ initialConfig = DEFAULT_DEMO_CONFIG, onSubmit }: Props) {
  const formId = useId();
  const [config, setConfig] = useState(() => cloneDemoConfig(initialConfig));
  const [error, setError] = useState<string | null>(null);

  function updateService(index: number, patch: Partial<DemoServiceInput>) {
    setConfig((prev) => ({
      ...prev,
      services: prev.services.map((svc, i) => (i === index ? { ...svc, ...patch } : svc)),
    }));
  }

  function removeService(index: number) {
    setConfig((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  }

  function updateStaff(index: number, name: string) {
    setConfig((prev) => ({
      ...prev,
      staff: prev.staff.map((s, i) => (i === index ? name : s)),
    }));
  }

  function toggleDay(day: number) {
    setConfig((prev) => {
      const has = prev.availability.days.includes(day);
      const days = has
        ? prev.availability.days.filter((d) => d !== day)
        : [...prev.availability.days, day].sort((a, b) => a - b);
      return { ...prev, availability: { ...prev.availability, days } };
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const cleaned: DemoConfig = {
      ...config,
      businessName: config.businessName.trim(),
      services: config.services
        .map((s) => ({
          ...s,
          name: s.name.trim(),
          duration_minutes: Number(s.duration_minutes),
          price_dollars: Number(s.price_dollars),
        }))
        .filter((s) => s.name),
      staff: config.staff.map((s) => s.trim()).filter(Boolean),
      postalCodes: config.postalCodes
        .join(',')
        .split(/[\s,]+/)
        .map((c) => c.trim())
        .filter(Boolean),
      notificationEmail: config.notificationEmail.trim(),
    };

    if (!cleaned.businessName) {
      setError('Enter a business name.');
      return;
    }
    if (!cleaned.services.length) {
      setError('Add at least one service.');
      return;
    }
    if (!cleaned.staff.length) {
      setError('Add at least one staff member.');
      return;
    }
    if (!cleaned.availability.days.length) {
      setError('Choose at least one day you are usually available.');
      return;
    }
    if (!cleaned.notificationEmail.includes('@')) {
      setError('Enter a notification email.');
      return;
    }

    onSubmit(cleaned);
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-2xl flex-col gap-8"
      noValidate
    >
      <div className="space-y-2">
        <label className={labelClass} htmlFor={`${formId}-business`}>
          Business name
        </label>
        <input
          id={`${formId}-business`}
          className={fieldClass}
          value={config.businessName}
          onChange={(e) => setConfig((prev) => ({ ...prev, businessName: e.target.value }))}
          placeholder="Acme Heating & Air"
          autoComplete="organization"
          required
        />
      </div>

      <fieldset className="space-y-3">
        <legend className={labelClass}>Services</legend>
        <p className={hintClass}>Name, typical duration, and price.</p>
        <ul className="space-y-3">
          {config.services.map((service, index) => (
            <li
              key={service.id}
              className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_7rem_6rem_auto]"
            >
              <div className="space-y-1">
                <label className="sr-only" htmlFor={`${formId}-svc-name-${index}`}>
                  Service name
                </label>
                <input
                  id={`${formId}-svc-name-${index}`}
                  className={fieldClass}
                  value={service.name}
                  onChange={(e) => updateService(index, { name: e.target.value })}
                  placeholder="AC Diagnostic Visit"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className={hintClass} htmlFor={`${formId}-svc-dur-${index}`}>
                  Minutes
                </label>
                <input
                  id={`${formId}-svc-dur-${index}`}
                  className={fieldClass}
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={service.duration_minutes}
                  onChange={(e) => updateService(index, { duration_minutes: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className={hintClass} htmlFor={`${formId}-svc-price-${index}`}>
                  Price ($)
                </label>
                <input
                  id={`${formId}-svc-price-${index}`}
                  className={fieldClass}
                  type="number"
                  min={0}
                  step={1}
                  value={service.price_dollars}
                  onChange={(e) => updateService(index, { price_dollars: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={config.services.length <= 1}
                  onClick={() => removeService(index)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfig((p) => ({ ...p, services: [...p.services, newService()] }))}>
          + Add service
        </Button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={labelClass}>Who can perform these services?</legend>
        <ul className="space-y-2">
          {config.staff.map((name, index) => (
            <li key={index} className="flex gap-2">
              <label className="sr-only" htmlFor={`${formId}-staff-${index}`}>
                Staff member {index + 1}
              </label>
              <input
                id={`${formId}-staff-${index}`}
                className={fieldClass}
                value={name}
                onChange={(e) => updateStaff(index, e.target.value)}
                placeholder="Name"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={config.staff.length <= 1}
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    staff: prev.staff.filter((_, i) => i !== index),
                  }))
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfig((p) => ({ ...p, staff: [...p.staff, ''] }))}
        >
          + Add staff
        </Button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={labelClass}>When are you usually available?</legend>
        <p className={hintClass}>
          {formatDaysLabel(config.availability.days)} ·{' '}
          {formatHoursLabel(config.availability.open, config.availability.close)}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Available days">
          {DAY_OPTIONS.map((day) => {
            const selected = config.availability.days.includes(day.value);
            return (
              <Button
                key={day.value}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                aria-pressed={selected}
                onClick={() => toggleDay(day.value)}
              >
                {day.label}
              </Button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <div className="space-y-1">
            <label className={hintClass} htmlFor={`${formId}-open`}>
              Opens
            </label>
            <input
              id={`${formId}-open`}
              className={fieldClass}
              type="time"
              value={config.availability.open}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  availability: { ...prev.availability, open: e.target.value },
                }))
              }
              required
            />
          </div>
          <div className="space-y-1">
            <label className={hintClass} htmlFor={`${formId}-close`}>
              Closes
            </label>
            <input
              id={`${formId}-close`}
              className={fieldClass}
              type="time"
              value={config.availability.close}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  availability: { ...prev.availability, close: e.target.value },
                }))
              }
              required
            />
          </div>
        </div>
      </fieldset>

      <div className="space-y-2">
        <label className={labelClass} htmlFor={`${formId}-area`}>
          Where do you serve?
        </label>
        <p className={hintClass}>Postal codes, separated by commas. Leave blank if location does not matter.</p>
        <input
          id={`${formId}-area`}
          className={fieldClass}
          value={config.postalCodes.join(', ')}
          onChange={(e) =>
            setConfig((prev) => ({
              ...prev,
              postalCodes: e.target.value.split(/[\s,]+/).filter(Boolean),
            }))
          }
          placeholder="78701, 78702, 78703"
          inputMode="numeric"
        />
      </div>

      <div className="space-y-2">
        <label className={labelClass} htmlFor={`${formId}-email`}>
          Where should we send new bookings?
        </label>
        <input
          id={`${formId}-email`}
          className={fieldClass}
          type="email"
          value={config.notificationEmail}
          onChange={(e) => setConfig((prev) => ({ ...prev, notificationEmail: e.target.value }))}
          placeholder="hello@acme.example"
          autoComplete="email"
          required
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg">
          Make agent-ready
        </Button>
        <p className={cn(hintClass, 'max-w-sm')}>
          Example services currently total{' '}
          {config.services
            .map((s) => formatPriceCents(Math.round(Number(s.price_dollars) * 100)))
            .join(' · ') || '—'}
          .
        </p>
      </div>
    </form>
  );
}
