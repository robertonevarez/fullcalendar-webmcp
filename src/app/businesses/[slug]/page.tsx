import { notFound } from 'next/navigation';
import { BusinessProductOverview } from '@/components/business-product-overview';
import { WebMCPBusinessProvider } from '@/components/webmcp-business-provider';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingRepository } from '@/db/repository';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureDatabaseSeeded();
  const { slug } = await params;
  const business = await bookingRepository.getBusinessBySlug(slug);
  if (!business) return { title: 'Business Not Found' };

  return {
    title: `${business.name} | Protocol Tooling`,
    description: business.description,
  };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureDatabaseSeeded();
  const { slug } = await params;
  const business = await bookingRepository.getBusinessBySlug(slug);
  if (!business) notFound();

  const services = await bookingRepository.listServices(business.id);

  return (
    <WebMCPBusinessProvider businessSlug={business.slug} businessName={business.name}>
      <main className="min-h-dvh lg:h-dvh lg:overflow-hidden">
        <BusinessProductOverview business={business} services={services} />
      </main>
    </WebMCPBusinessProvider>
  );
}

