import { ProcessedItem, PipelineMetrics, PipelineConfig } from './types';

const DB_NAME = 'LuminaSortDB';
const DB_VERSION = 2;
const STORE_NAME = 'session_state';
const BLOB_STORE_NAME = 'original_blobs';

// Fast in-memory cache for original full-resolution files
const blobCache = new Map<string, Blob>();

interface SessionData {
  id: string;
  items: ProcessedItem[];
  folders: any[];
  metrics: PipelineMetrics;
  activeTab: string;
  currentFolderName: string;
  config?: PipelineConfig;
  updatedAt: number;
}

/**
 * Opens or initializes the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
        db.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves full original file blob into memory cache and IndexedDB.
 */
export async function saveOriginalFileBlob(id: string, blob: Blob): Promise<void> {
  blobCache.set(id, blob);
  try {
    const db = await openDB();
    const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(BLOB_STORE_NAME);
    store.put({ id, blob, size: blob.size, type: blob.type });
  } catch (err) {
    console.warn('Failed to save original file blob to IndexedDB:', err);
  }
}

/**
 * Retrieves original full-resolution file blob.
 */
export async function getOriginalFileBlob(id: string): Promise<Blob | null> {
  if (blobCache.has(id)) {
    return blobCache.get(id) || null;
  }
  try {
    const db = await openDB();
    const tx = db.transaction(BLOB_STORE_NAME, 'readonly');
    const store = tx.objectStore(BLOB_STORE_NAME);
    const request = store.get(id);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result && request.result.blob) {
          blobCache.set(id, request.result.blob);
          resolve(request.result.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to get original file blob from IndexedDB:', err);
    return null;
  }
}

/**
 * Saves current session state (items, folders, metrics, active tab) to IndexedDB.
 */
export async function saveSessionState(data: {
  items: ProcessedItem[];
  folders: any[];
  metrics: PipelineMetrics;
  activeTab: string;
  currentFolderName: string;
  config?: PipelineConfig;
}): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Strip in-memory non-serializable File handles and ephemeral blob URLs before storing metadata
    const serializableItems = data.items.map((item) => ({
      ...item,
      originalFile: undefined,
      originalFileUrl: item.originalFileUrl && !item.originalFileUrl.startsWith('blob:') ? item.originalFileUrl : '',
    }));

    const sessionObj: SessionData = {
      id: 'current_session',
      items: serializableItems,
      folders: data.folders,
      metrics: data.metrics,
      activeTab: data.activeTab,
      currentFolderName: data.currentFolderName,
      config: data.config,
      updatedAt: Date.now(),
    };

    store.put(sessionObj);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to persist session to IndexedDB:', err);
  }
}

/**
 * Loads persisted session state from IndexedDB.
 */
export async function loadSessionState(): Promise<SessionData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('current_session');

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to load session from IndexedDB:', err);
    return null;
  }
}

/**
 * Clears persisted session state and original blobs (Reset).
 */
export async function clearSessionState(): Promise<void> {
  blobCache.clear();
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, BLOB_STORE_NAME], 'readwrite');
    tx.objectStore(STORE_NAME).delete('current_session');
    tx.objectStore(BLOB_STORE_NAME).clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to clear session from IndexedDB:', err);
  }
}
