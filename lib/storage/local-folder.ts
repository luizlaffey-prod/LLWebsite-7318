'use client';

/**
 * Stores a File System Access API directory handle in IndexedDB so subsequent
 * downloads from AURA go straight to the chosen folder without re-prompting.
 * Falls back to anchor-tag download on browsers that lack the API (Firefox, Safari).
 */

const DB_NAME = 'aura-storage';
const STORE = 'handles';
const KEY = 'download-dir';

interface FsDirHandle {
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FsFileHandle>;
  queryPermission(opts: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'prompt' | 'denied'>;
  requestPermission(opts: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'prompt' | 'denied'>;
}

interface FsFileHandle {
  createWritable(): Promise<FsWritable>;
}

interface FsWritable {
  write(data: Uint8Array | Blob): Promise<void>;
  close(): Promise<void>;
}

interface DirPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: 'downloads' | 'documents' | 'desktop' | 'music' | 'pictures' | 'videos';
}

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: DirPickerOptions) => Promise<FsDirHandle>;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readHandle(): Promise<FsDirHandle | null> {
  try {
    const db = await openDb();
    return await new Promise<FsDirHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as FsDirHandle | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function writeHandle(handle: FsDirHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function ensurePermission(handle: FsDirHandle): Promise<boolean> {
  const status = await handle.queryPermission({ mode: 'readwrite' });
  if (status === 'granted') return true;
  const requested = await handle.requestPermission({ mode: 'readwrite' });
  return requested === 'granted';
}

export async function chooseDownloadFolder(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.showDirectoryPicker) return false;
  try {
    const handle = await window.showDirectoryPicker({
      id: 'aura-downloads',
      mode: 'readwrite',
      startIn: 'downloads',
    });
    await writeHandle(handle);
    if (navigator.storage?.persist) await navigator.storage.persist();
    return true;
  } catch {
    return false;
  }
}

export async function hasFolderConfigured(): Promise<boolean> {
  const handle = await readHandle();
  return !!handle;
}

export async function clearDownloadFolder(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore — IndexedDB unavailable */
  }
}

/**
 * Writes `blob` to the configured folder without prompting if permission is
 * still granted. Returns false if no folder is configured, permission was
 * revoked, or the API isn't supported.
 */
export async function writeToConfiguredFolder(
  filename: string,
  blob: Blob | Uint8Array
): Promise<boolean> {
  if (typeof window === 'undefined' || !window.showDirectoryPicker) return false;
  const handle = await readHandle();
  if (!handle) return false;
  const ok = await ensurePermission(handle);
  if (!ok) return false;
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob instanceof Blob ? blob : new Blob([blob as BlobPart], { type: 'audio/mpeg' }));
  await writable.close();
  return true;
}

export type DownloadOutcome =
  | { kind: 'folder'; path: string }
  | { kind: 'browser' }
  | { kind: 'cancelled' };

/**
 * Downloads `bytes` (or fetches `fromUrl`) as `filename`. If the user previously
 * picked a folder via the File System Access API, saves directly into it.
 *
 * If no folder is configured AND a `proxyUrl` is provided, the browser is sent
 * to that URL — typically a server-side route that fetches the binary and
 * replies with `Content-Disposition: attachment`. This avoids cross-origin
 * fetch problems (CORS, opaque responses) that would otherwise break a plain
 * createObjectURL fallback when `fromUrl` lives on another host.
 *
 * When `bytes` are passed in directly (e.g. an in-memory mix Blob), the
 * createObjectURL anchor is used regardless.
 */
export async function downloadBlob(opts: {
  filename: string;
  bytes?: Uint8Array | Blob;
  fromUrl?: string;
  /** Server-side proxy that streams the file with attachment headers. */
  proxyUrl?: string;
}): Promise<DownloadOutcome> {
  // Folder path: requires us to have the bytes in hand. Only used when a
  // folder is configured; otherwise we skip the cross-origin fetch entirely.
  const tryFolder =
    typeof window !== 'undefined' && !!window.showDirectoryPicker;
  if (tryFolder) {
    const handle = await readHandle();
    if (handle && (await ensurePermission(handle))) {
      const blob = opts.bytes
        ? opts.bytes instanceof Blob
          ? opts.bytes
          : new Blob([opts.bytes as BlobPart], { type: 'audio/mpeg' })
        : await (await fetch(opts.fromUrl!)).blob();
      const fileHandle = await handle.getFileHandle(opts.filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { kind: 'folder', path: opts.filename };
    }
  }

  // No folder. Prefer the same-origin proxy route so the browser save dialog
  // fires reliably; only synthesise a Blob URL if the caller already has the
  // bytes (mixed audio, etc.) or there's no proxy.
  if (opts.proxyUrl) {
    const a = document.createElement('a');
    a.href = opts.proxyUrl;
    a.download = opts.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { kind: 'browser' };
  }

  const blob = opts.bytes
    ? opts.bytes instanceof Blob
      ? opts.bytes
      : new Blob([opts.bytes as BlobPart], { type: 'audio/mpeg' })
    : await (await fetch(opts.fromUrl!)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
  return { kind: 'browser' };
}

export function defaultFilename(input: {
  radioName?: string | null;
  topic: string;
}): string {
  const slug = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  const station = input.radioName ? slug(input.radioName) : 'aura';
  return `${station}_${date}_${slug(input.topic) || 'bulletin'}.mp3`;
}
