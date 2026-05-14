import { setRequestLocale } from 'next-intl/server';
import { Mic } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Locale } from '@/i18n';

export default async function VoicesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">My voices</h1>
        <p className="mt-2 text-text-secondary">
          Browse the AURA voice catalog, preview samples, and pick your station&apos;s
          default voice.
        </p>
        <Card className="mt-10 flex items-center justify-center p-16 text-text-muted">
          <Mic className="mr-3 h-5 w-5" /> Voice manager lands in the next release.
        </Card>
      </div>
    </div>
  );
}
