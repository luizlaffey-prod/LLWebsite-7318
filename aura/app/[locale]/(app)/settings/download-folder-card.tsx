'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Folder, FolderCheck, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  chooseDownloadFolder,
  hasFolderConfigured,
  clearDownloadFolder,
} from '@/lib/storage/local-folder';

/**
 * Lets the user pick a default folder via the File System Access API and
 * remembers the handle in IndexedDB so the bulletin drawer + /audios sync
 * reuse it without re-prompting. Browsers without the API hide the card's
 * primary CTA and fall back to the regular download path.
 */
export function DownloadFolderCard() {
  const t = useTranslations('settingsPage');
  const [supported, setSupported] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' && !!window.showDirectoryPicker
    );
    hasFolderConfigured().then(setConfigured);
  }, []);

  const onChoose = async () => {
    setBusy(true);
    try {
      const ok = await chooseDownloadFolder();
      setConfigured(ok);
    } finally {
      setBusy(false);
    }
  };

  const onClear = async () => {
    setBusy(true);
    try {
      await clearDownloadFolder();
      setConfigured(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-text-muted">
            {t('downloadFolderSection')}
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {t('downloadFolderHint')}
          </p>
          {!supported && (
            <p className="mt-2 text-xs text-warning">
              {t('downloadFolderUnsupported')}
            </p>
          )}
          {supported && configured && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-success">
              <FolderCheck className="h-3.5 w-3.5" />
              {t('downloadFolderConfigured')}
            </p>
          )}
        </div>
        {supported && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              onClick={onChoose}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
              {configured ? t('downloadFolderChange') : t('downloadFolderChoose')}
            </Button>
            {configured && (
              <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>
                {t('downloadFolderClear')}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
