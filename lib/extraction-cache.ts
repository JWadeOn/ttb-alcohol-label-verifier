import { createHash } from "node:crypto";
import type { ExtractionResult } from "@/lib/extraction/types";

type CachedExtraction = {
  extraction: ExtractionResult;
  createdAtMs: number;
};

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 200;

const cache = new Map<string, CachedExtraction>();

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function ttlMs(): number {
  return readPositiveIntEnv("VERIFY_EXTRACTION_CACHE_TTL_MS", DEFAULT_TTL_MS);
}

function maxEntries(): number {
  return readPositiveIntEnv("VERIFY_EXTRACTION_CACHE_MAX_ENTRIES", DEFAULT_MAX_ENTRIES);
}

function prune(nowMs: number): void {
  const ttl = ttlMs();
  for (const [key, value] of cache.entries()) {
    if (nowMs - value.createdAtMs > ttl) {
      cache.delete(key);
    }
  }

  const max = maxEntries();
  if (cache.size <= max) return;

  const overflow = cache.size - max;
  for (const key of cache.keys()) {
    cache.delete(key);
    if (cache.size <= max || cache.size <= overflow) break;
  }
}

export function cacheKeyFromImageBytes(imageBytes: Buffer): string {
  return createHash("sha256").update(imageBytes).digest("hex");
}

export function getCachedExtraction(cacheKey: string): ExtractionResult | null {
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (!hit) return null;
  if (now - hit.createdAtMs > ttlMs()) {
    cache.delete(cacheKey);
    return null;
  }
  return hit.extraction;
}

export function setCachedExtraction(cacheKey: string, extraction: ExtractionResult): void {
  const now = Date.now();
  cache.set(cacheKey, {
    extraction,
    createdAtMs: now,
  });
  prune(now);
}
