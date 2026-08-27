import type { Metadata } from 'next';
import { DemoExperience } from '@/components/demo/demo-experience';

export const metadata: Metadata = {
  title: 'Product demo',
  description:
    "Watch a customer's personal AI agent book a real business using Protocol Tooling's scheduling rules — no dashboard required.",
};

export default function DemoPage() {
  return (
    <main>
      <DemoExperience />
    </main>
  );
}
