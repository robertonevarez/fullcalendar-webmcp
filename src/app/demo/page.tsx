import type { Metadata } from 'next';
import { DemoExperience } from '@/components/demo/demo-experience';

export const metadata: Metadata = {
  title: 'Product demo',
  description:
    'Describe a simple service business, make it agent-ready, and experience booking through a customer’s AI agent — powered by Protocol Tooling’s real scheduling rules.',
};

export default function DemoPage() {
  return (
    <main>
      <DemoExperience />
    </main>
  );
}
