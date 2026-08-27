import type { Metadata } from 'next';
import { DemoExperience } from '@/components/demo/demo-experience';
import { DEFAULT_PRESET_ID, DEMO_PRESETS } from '@/demo/presets';

export const metadata: Metadata = {
  title: 'Product demo',
  description:
    'See what Protocol Tooling exposes to agents beside what a customer experiences through their AI agent.',
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedPreset = Array.isArray(params.preset) ? params.preset[0] : params.preset;
  const presetId = DEMO_PRESETS.find((preset) => preset.id === requestedPreset)?.id ?? DEFAULT_PRESET_ID;

  return (
    <main>
      <DemoExperience presetId={presetId} />
    </main>
  );
}
