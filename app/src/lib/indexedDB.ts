/**
 * Pensaer BIM Platform - IndexedDB Persistence Layer
 *
 * Provides browser-native persistence for BIM model data.
 * Uses IndexedDB for efficient storage of large element collections.
 */

import type { Element } from "../types";

// ============================================
// CONFIGURATION
// ============================================

const DB_NAME = "pensaer-bim";
const DB_VERSION = 2; // Bumped to clear old cache and load new demo building
const STORE_NAME = "elements";
const PROJECT_STORE = "projects";

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;

/**
 * Opens or creates the IndexedDB database.
 */
export async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("✅ IndexedDB connected");
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      console.log(
        `🔄 Upgrading IndexedDB from v${oldVersion} to v${DB_VERSION}`,
      );

      // If upgrading from v1, delete old stores to get fresh demo data
      if (oldVersion > 0 && oldVersion < DB_VERSION) {
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
          console.log("🗑️ Cleared old elements store");
        }
        if (db.objectStoreNames.contains(PROJECT_STORE)) {
          db.deleteObjectStore(PROJECT_STORE);
          console.log("🗑️ Cleared old projects store");
        }
      }

      // Create elements store with ID as key
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const elementsStore = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
        elementsStore.createIndex("type", "type", { unique: false });
        elementsStore.createIndex("name", "name", { unique: false });
        console.log("📦 Created elements store");
      }

      // Create projects store for metadata
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
        console.log("📦 Created projects store");
      }
    };
  });
}

// ============================================
// ELEMENT OPERATIONS
// ============================================

/**
 * Save all elements to IndexedDB.
 */
export async function saveElements(elements: Element[]): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Clear existing elements and add new ones
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      elements.forEach((element) => {
        store.put(element);
      });
    };

    transaction.oncomplete = () => {
      console.log(`💾 Saved ${elements.length} elements to IndexedDB`);
      resolve();
    };

    transaction.onerror = () => {
      console.error("Failed to save elements:", transaction.error);
      reject(transaction.error);
    };
  });
}

/**
 * Load all elements from IndexedDB.
 */
export async function loadElements(): Promise<Element[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const elements = request.result as Element[];
      console.log(`📂 Loaded ${elements.length} elements from IndexedDB`);
      resolve(elements);
    };

    request.onerror = () => {
      console.error("Failed to load elements:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Save a single element (upsert).
 */
export async function saveElement(element: Element): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(element);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an element by ID.
 */
export async function deleteElementFromDB(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get element by ID.
 */
export async function getElementById(id: string): Promise<Element | undefined> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as Element | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get elements by type.
 */
export async function getElementsByType(type: string): Promise<Element[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("type");
    const request = index.getAll(type);

    request.onsuccess = () => resolve(request.result as Element[]);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// PROJECT METADATA
// ============================================

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  elementCount: number;
}

/**
 * Save project metadata.
 */
export async function saveProjectMetadata(
  metadata: ProjectMetadata,
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECT_STORE, "readwrite");
    const store = transaction.objectStore(PROJECT_STORE);
    const request = store.put(metadata);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load project metadata.
 */
export async function loadProjectMetadata(
  id: string,
): Promise<ProjectMetadata | undefined> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECT_STORE, "readonly");
    const store = transaction.objectStore(PROJECT_STORE);
    const request = store.get(id);

    request.onsuccess = () =>
      resolve(request.result as ProjectMetadata | undefined);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// UTILITIES
// ============================================

/**
 * Check if IndexedDB is available.
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Clear all data (for testing/reset).
 */
export async function clearAllData(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORE_NAME, PROJECT_STORE],
      "readwrite",
    );

    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(PROJECT_STORE).clear();

    transaction.oncomplete = () => {
      console.log("🗑️ Cleared all IndexedDB data");
      resolve();
    };

    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get database statistics.
 */
export async function getDatabaseStats(): Promise<{
  elementCount: number;
  projectCount: number;
}> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, PROJECT_STORE], "readonly");

    const elementsRequest = transaction.objectStore(STORE_NAME).count();
    const projectsRequest = transaction.objectStore(PROJECT_STORE).count();

    let elementCount = 0;
    let projectCount = 0;

    elementsRequest.onsuccess = () => {
      elementCount = elementsRequest.result;
    };

    projectsRequest.onsuccess = () => {
      projectCount = projectsRequest.result;
    };

    transaction.oncomplete = () => {
      resolve({ elementCount, projectCount });
    };

    transaction.onerror = () => reject(transaction.error);
  });
}
