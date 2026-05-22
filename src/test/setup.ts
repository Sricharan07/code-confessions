import { vi } from "vitest";
import crypto from "crypto";

// Mock localStorage and sessionStorage
class StorageMock {
  store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }
}

const mockLocalStorage = new StorageMock();
const mockSessionStorage = new StorageMock();

// Setup global objects for Node environment to simulate browser
globalThis.window = globalThis as any;
globalThis.localStorage = mockLocalStorage as any;
globalThis.sessionStorage = mockSessionStorage as any;

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: crypto,
    writable: true,
    configurable: true,
  });
}

// Mock window.location.reload
(globalThis as any).location = {
  reload: vi.fn(),
};

// Mock fetch
globalThis.fetch = vi.fn();

// Mock console.error to keep test output clean during expected errors
vi.spyOn(console, "error").mockImplementation(() => {});

// Mock import.meta.env
// In vitest/node, we can define VITE_API_URL on process.env or stub it.
// To mock VITE_API_URL we can define it on import.meta.env if possible,
// or stub it using vi.stubEnv
vi.stubEnv("VITE_API_URL", "https://api.test-vibefail.com");
