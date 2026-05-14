import { setRequestLocale } from 'next-intl/server';
import { Headphones } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Locale } from '@/i18n';

export default async function AudiosPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">My audios</h1>
        <p className="mt-2 text-text-secondary">
          Every bulletin you generate will appear here for replay, edit and download.
        </p>
        <Card className="mt-10 flex items-center justify-center p-16 text-text-muted">
          <Headphones className="mr-3 h-5 w-5" /> Audio library lands in the next release.
        </Card>
      </div>
    </div>
  );
}
