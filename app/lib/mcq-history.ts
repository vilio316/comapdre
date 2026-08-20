import redis from "./redis";
import { getMcqResult } from "./mcq-cache";

const HISTORY_ZSET = "mcq:history";
const HISTORY_INFO_PREFIX = "mcq:history:info:";
const HISTORY_INFO_TTL = 60 * 60 * 24 * 30;

export interface McqHistoryEntry {
  resultKey: string;
  keys: string[];
  count: number;
  createdAt: number;
}

export async function recordMcqHistory(entry: {
  resultKey: string;
  keys: string[];
  createdAt: number;
}): Promise<void> {
  const infoKey = `${HISTORY_INFO_PREFIX}${entry.resultKey}`;
  await redis
    .multi()
    .zadd(HISTORY_ZSET, entry.createdAt, entry.resultKey)
    .hset(infoKey, { keys: JSON.stringify(entry.keys) })
    .expire(infoKey, HISTORY_INFO_TTL)
    .exec();
}

export async function listMcqHistory(
  limit = 100,
  _orgId?: string,
): Promise<McqHistoryEntry[]> {
  const scored = await redis.zrevrange(
    HISTORY_ZSET,
    0,
    limit - 1,
    "WITHSCORES",
  );
  const entries: McqHistoryEntry[] = [];
  const toPrune: string[] = [];

  for (let i = 0; i < scored.length; i += 2) {
    const resultKey = scored[i];
    const createdAt = Number(scored[i + 1]);

    const cached = await getMcqResult(resultKey);
    if (!cached) {
      toPrune.push(resultKey);
      continue;
    }

    let count = 0;
    try {
      const parsed = JSON.parse(cached) as { questions?: unknown[] };
      count = Array.isArray(parsed.questions) ? parsed.questions.length : 0;
    } catch {
      toPrune.push(resultKey);
      continue;
    }

    const info = await redis.hgetall(`${HISTORY_INFO_PREFIX}${resultKey}`);
    let keys: string[] = [];
    if (info.keys) {
      try {
        keys = JSON.parse(info.keys) as string[];
      } catch {
        keys = [];
      }
    }

    entries.push({ resultKey, keys, count, createdAt });
  }

  if (toPrune.length > 0) {
    const pipeline = redis.multi().zrem(HISTORY_ZSET, ...toPrune);
    for (const resultKey of toPrune) {
      pipeline.del(`${HISTORY_INFO_PREFIX}${resultKey}`);
    }
    await pipeline.exec();
  }

  return entries;
}
