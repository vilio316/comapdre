import redis from "./redis";

const RESULT_PREFIX = "mcq:result:";
const RESULT_TTL = 60 * 60 * 24 * 30;

export async function getMcqResult(key: string): Promise<string | null> {
  return redis.get(`${RESULT_PREFIX}${key}`);
}

export async function setMcqResult(key: string, json: string): Promise<void> {
  await redis.setex(`${RESULT_PREFIX}${key}`, RESULT_TTL, json);
}
