import redis from "./redis";

const CACHE_PREFIX = "ocr:cache:";
const CACHE_TTL = 60 * 60 * 24 * 30;

export async function getCachedOcrResult(key: string): Promise<string | null> {
  return redis.get(`${CACHE_PREFIX}${key}`);
}

export async function setCachedOcrResult(key: string, result: string): Promise<void> {
  await redis.setex(`${CACHE_PREFIX}${key}`, CACHE_TTL, result);
}
