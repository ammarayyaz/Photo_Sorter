import { ProcessedItem, PipelineMetrics, PipelineConfig } from './types';

const DB_NAME = 'LuminaSortDB';
const DB_VERSION = 1;
const STORE_NAME = 'session_state';

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

    const sessionObj: SessionData = {
      id: 'current_session',
      items: data.items,
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
 * Clears persisted session state (Reset).
 */
export async function clearSessionState(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete('current_session');

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to clear session from IndexedDB:', err);
  }
}
