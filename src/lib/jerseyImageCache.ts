const DB_NAME = "jerseyImageCache";
const STORE_NAME = "images";
const DB_VERSION = 1;
const CACHE_EXPIRY_DAYS = 7;

interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
  });

  return dbPromise;
};

export const getCachedImage = async (url: string): Promise<string | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const request = store.get(url);

      request.onsuccess = () => {
        const cached = request.result as CachedImage | undefined;
        if (cached) {
          const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          if (Date.now() - cached.timestamp < expiryTime) {
            resolve(URL.createObjectURL(cached.blob));
          } else {
            // Expired, clean up
            deleteCachedImage(url);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const cacheImage = async (url: string, blob: Blob): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const cachedImage: CachedImage = {
      url,
      blob,
      timestamp: Date.now(),
    };

    store.put(cachedImage);
  } catch (error) {
    // Caching is optional - log for debugging but don't block
    console.debug('[JerseyCache] Failed to cache image:', url, error);
  }
};

const deleteCachedImage = async (url: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(url);
  } catch (error) {
    // Deletion is non-critical - log for debugging
    console.debug('[JerseyCache] Failed to delete cached image:', url, error);
  }
};

export const fetchAndCacheImage = async (url: string): Promise<string> => {
  // Check cache first
  const cached = await getCachedImage(url);
  if (cached) return cached;

  // Fetch and cache
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch image");

  const blob = await response.blob();
  await cacheImage(url, blob);

  return URL.createObjectURL(blob);
};
