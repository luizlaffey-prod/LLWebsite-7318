import { setRequestLocale } from 'next-intl/server';
import { CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Locale } from '@/i18n';

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">Automations</h1>
        <p className="mt-2 text-text-secondary">
          Schedule recurring bulletins. Set times, categories, and AURA delivers
          on its own.
        </p>
        <Card className="mt-10 flex items-center justify-center p-16 text-text-muted">
          <CalendarClock className="mr-3 h-5 w-5" /> Automations land in Phase 6.
        </Card>
      </div>
    </div>
  );
}
