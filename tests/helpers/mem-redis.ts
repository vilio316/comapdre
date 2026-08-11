import { vi } from "vitest";

export interface MemRedis {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  setex: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  zadd: ReturnType<typeof vi.fn>;
  zrevrange: ReturnType<typeof vi.fn>;
  zrem: ReturnType<typeof vi.fn>;
  hset: ReturnType<typeof vi.fn>;
  hgetall: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  multi: ReturnType<typeof vi.fn>;
  __store: Map<string, unknown>;
  reset: () => void;
}

/**
 * Creates an in-memory fake Redis client with the subset of the ioredis API
 * used by the app (get/set/setex/multi/zadd/hset/etc). Wire it up by mocking
 * `ioredis` before importing any module that depends on `@/app/lib/redis`.
 */
export function createMemRedis(): MemRedis {
  const store = new Map<string, unknown>();

  const get = vi.fn(async (key: string) => {
    const v = store.get(key);
    return v === undefined ? null : (v as string);
  });
  const set = vi.fn(async (key: string, value: string) => {
    store.set(key, value);
    return "OK";
  });
  const setex = vi.fn(async (key: string, _seconds: number, value: string) => {
    store.set(key, value);
    return "OK";
  });
  const del = vi.fn(async (...keys: string[]) => {
    let count = 0;
    for (const k of keys) {
      if (store.delete(k)) count++;
    }
    return count;
  });
  const zadd = vi.fn(async (_key: string, _score: number, member: string) => {
    store.set(`zset:${_key}:${member}`, _score);
    return 1;
  });
  const zrevrange = vi.fn(async (key: string, start: number, stop: number) => {
    const members = [...store.keys()]
      .filter((k) => k.startsWith(`zset:${key}:`))
      .map((k) => k.replace(`zset:${key}:`, ""))
      .sort((a, b) =>
        (Number(store.get(`zset:${key}:${b}`)) || 0) -
        (Number(store.get(`zset:${key}:${a}`)) || 0),
      );
    const slice = members.slice(start, stop === -1 ? undefined : stop + 1);
    const withScores: string[] = [];
    for (const m of slice) {
      withScores.push(m, String(store.get(`zset:${key}:${m}`) ?? 0));
    }
    return withScores;
  });
  const zrem = vi.fn(async (_key: string, ...members: string[]) => {
    let count = 0;
    for (const m of members) {
      if (store.delete(`zset:${_key}:${m}`)) count++;
    }
    return count;
  });
  const hset = vi.fn(async (key: string, fields: Record<string, string>) => {
    store.set(`h:${key}`, fields);
    return 1;
  });
  const hgetall = vi.fn(async (key: string) => {
    return (store.get(`h:${key}`) as Record<string, string>) ?? {};
  });
  const expire = vi.fn(async () => 1);
  const multi = vi.fn(() => {
    const pipeline: { cmd: string; args: unknown[] }[] = [];
    const api = {
      zadd: (...args: unknown[]) => {
        pipeline.push({ cmd: "zadd", args });
        return api;
      },
      hset: (...args: unknown[]) => {
        pipeline.push({ cmd: "hset", args });
        return api;
      },
      expire: (...args: unknown[]) => {
        pipeline.push({ cmd: "expire", args });
        return api;
      },
      zrem: (...args: unknown[]) => {
        pipeline.push({ cmd: "zrem", args });
        return api;
      },
      del: (...args: unknown[]) => {
        pipeline.push({ cmd: "del", args });
        return api;
      },
      exec: async () => {
        for (const p of pipeline) {
          const fn = { zadd, hset, expire, zrem, del }[p.cmd];
          await (fn as (...a: unknown[]) => Promise<unknown>)(...p.args);
        }
        return [null];
      },
    };
    return api;
  });

  return {
    get,
    set,
    setex,
    del,
    zadd,
    zrevrange,
    zrem,
    hset,
    hgetall,
    expire,
    multi,
    __store: store,
    reset: () => {
      store.clear();
      for (const fn of [get, set, setex, del, zadd, zrevrange, zrem, hset, hgetall, expire, multi]) {
        fn.mockClear();
      }
    },
  };
}
