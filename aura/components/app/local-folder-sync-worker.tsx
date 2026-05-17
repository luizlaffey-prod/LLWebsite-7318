'use client';

import { useEffect, useRef } from 'react';
import { writeToConfiguredFolder, hasFolderConfigured } from '@/lib/storage/local-folder';

const POLL_INTERVAL_MS = 30_000;

interface PendingRow {
  logId: string;
  audioId: string;
  audioUrl: string;
  title: string;
  filename: string;
}

/**
 * Background worker that runs while the AURA tab is open. Polls the
 * server for delivery_log rows the user's local_folder endpoint hasn't
 * dropped yet, fetches each audio, writes it via the File System Access
 * API to the folder the operator picked, and acks the server.
 *
 * Failure modes are explicit:
 *   - File System Access API unavailable (Firefox/Safari) → silent no-op
 *   - No folder configured → silent no-op
 *   - Permission revoked → marks rows as failed with a clear error
 *   - Network fetch failed → leaves row pending, retries next poll
 *
 * Renders nothing.
 */
export function LocalFolderSyncWorker() {
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      if (cancelled || inFlight.current) return;
      // Don't burn server quota while the tab is in the background.
      if (typeof document !== 'undefined' && document.hidden) return;
      // No folder = nothing to sync. Cheap check, no network.
      if (!(await hasFolderConfigured())) return;

      inFlight.current = true;
      try {
        const res = await fetch('/api/delivery/local/pending');
        if (!res.ok) return;
        const data = (await res.json()) as { pending: PendingRow[] };
        if (data.pending.length === 0) return;

        const succeeded: string[] = [];
        const failed: { logId: string; error: string }[] = [];

        for (const row of data.pending) {
          if (cancelled) break;
          try {
            const audioRes = await fetch(row.audioUrl);
            if (!audioRes.ok) {
              failed.push({
                logId: row.logId,
                error: `fetch_${audioRes.status}`,
              });
              continue;
            }
            const blob = await audioRes.blob();
            const safeName = row.filename.endsWith('.mp3')
              ? row.filename
              : `${row.filename}.mp3`;
            const written = await writeToConfiguredFolder(safeName, blob);
            if (written) {
              succeeded.push(row.logId);
            } else {
              failed.push({
                logId: row.logId,
                error: 'folder_permission_revoked',
              });
            }
          } catch (err) {
            failed.push({
              logId: row.logId,
              error:
                err instanceof Error
                  ? err.message.slice(0, 200)
                  : 'unknown_error',
            });
          }
        }

        if (succeeded.length > 0 || failed.length > 0) {
          await fetch('/api/delivery/local/ack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              logIds: succeeded,
              failed: failed.length > 0 ? failed : undefined,
            }),
          });
        }
      } finally {
        inFlight.current = false;
      }
    };

    // Run once immediately so a freshly-opened tab catches up the backlog,
    // then on an interval. visibilitychange also triggers so returning to
    // the tab after lunch syncs without waiting for the next tick.
    void tick();
    timer = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVis = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return null;
}
