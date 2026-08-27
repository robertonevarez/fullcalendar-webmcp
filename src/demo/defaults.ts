import type { DemoConfig } from '@/demo/types';

/** Pre-populated Acme HVAC scenario for an immediate demo experience. */
export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  businessName: 'Acme Heating & Air',
  services: [
    {
      id: 'demo_svc_ac_diagnostic',
      name: 'AC Diagnostic Visit',
      duration_minutes: 90,
      price_dollars: 89,
    },
    {
      id: 'demo_svc_preventive',
      name: 'Preventive Maintenance',
      duration_minutes: 60,
      price_dollars: 79,
    },
  ],
  staff: ['James', 'Maria'],
  availability: {
    days: [1, 2, 3, 4, 5],
    open: '08:00',
    close: '18:00',
  },
  postalCodes: ['78701', '78702', '78703'],
  notificationEmail: 'hello@acme.example',
  timezone: 'America/Chicago',
};

export const DEFAULT_CUSTOMER_PROMPT =
  "My AC isn't cooling upstairs. I'm free tomorrow after 4. I'm in 78701.";

export const DEMO_BUSINESS_ID = 'demo_biz_ephemeral';
export const DEMO_BUSINESS_SLUG = 'demo-ephemeral';
export const DEMO_STAFF_CAPABILITY = 'demo_capable';
export const DEMO_STAFF_RESOURCE_TYPE = 'staff';
