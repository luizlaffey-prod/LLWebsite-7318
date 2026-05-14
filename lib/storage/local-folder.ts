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

export type DownloadOutcome =
  | { kind: 'folder'; path: string }
  | { kind: 'browser' }
  | { kind: 'cancelled' };

/**
 * Downloads `bytes` (or fetches `fromUrl`) as `filename`. If the user previously
 * picked a folder via the File System Access API, saves directly into it; otherwise
 * falls back to a regular browser download.
 */
export async function downloadBlob(opts: {
  filename: string;
  bytes?: Uint8Array | Blob;
  fromUrl?: string;
}): Promise<DownloadOutcome> {
  const blob = opts.bytes
    ? opts.bytes instanceof Blob
      ? opts.bytes
      : new Blob([opts.bytes as BlobPart], { type: 'audio/mpeg' })
    : await (await fetch(opts.fromUrl!)).blob();

  if (typeof window !== 'undefined' && window.showDirectoryPicker) {
    const handle = await readHandle();
    if (handle && (await ensurePermission(handle))) {
      const fileHandle = await handle.getFileHandle(opts.filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { kind: 'folder', path: opts.filename };
    }
  }

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
