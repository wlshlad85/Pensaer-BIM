/**
 * Vitest test setup file
 *
 * This file is executed before each test file.
 * It sets up global configuration needed for tests.
 */

import { enableMapSet } from "immer";

// Enable Immer MapSet plugin for Set/Map support in Zustand stores
enableMapSet();

if (typeof globalThis.localStorage === "undefined") {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      return this.store.get(key) ?? null;
    }

    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      this.store.set(key, value);
    }
  }

  globalThis.localStorage = new MemoryStorage();
}
