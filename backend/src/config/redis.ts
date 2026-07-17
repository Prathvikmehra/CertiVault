/**
 * Redis Client Configuration
 * Single ioredis instance shared across the application.
 * Handles connection retry with exponential backoff, structured logging,
 * and graceful shutdown on SIGTERM/SIGINT.
 */

import Redis from "ioredis";
import { getEnv } from "./env.js";
import { createModuleLogger } from "../common/utils/logger.js";

const log = createModuleLogger("redis");

// ─── Build connection options from env ───────────────────────────────────────

function buildRedisOptions(): Redis.RedisOptions {
  const env = getEnv();

  // Prefer a full REDIS_URL (e.g. redis://:password@host:6379)
  // Individual REDIS_HOST / REDIS_PORT are used as fallback.
  if (env.REDIS_URL) {
    return {
      // ioredis accepts a URL string directly in the constructor,
      // but we still want to merge our extra options, so we parse it here.
      lazyConnect: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy: retryStrategy,
      reconnectOnError: reconnectOnError,
    };
  }

  return {
    host: env.REDIS_HOST ?? "127.0.0.1",
    port: env.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : 6379,
    lazyConnect: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: retryStrategy,
    reconnectOnError: reconnectOnError,
  };
}

// ─── Retry strategy — exponential backoff, cap at 2 000 ms ──────────────────

function retryStrategy(times: number): number | null {
  if (times > 10) {
    log.error("Redis: max reconnection attempts (10) reached — giving up");
    return null; // stop retrying; ioredis will emit an error
  }
  const delay = Math.min(100 * 2 ** times, 2000);
  log.warn(`Redis: reconnecting in ${delay}ms (attempt ${times})`);
  return delay;
}

// Reconnect when READONLY errors happen (e.g. failover to replica)
function reconnectOnError(err: Error): boolean {
  return err.message.startsWith("READONLY");
}

// ─── Create the singleton client ─────────────────────────────────────────────

function createRedisClient(): Redis {
  const env = getEnv();

  const client = env.REDIS_URL
    ? new Redis(env.REDIS_URL, {
        lazyConnect: false,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        retryStrategy: retryStrategy,
        reconnectOnError: reconnectOnError,
      })
    : new Redis(buildRedisOptions());

  // ── Event handlers ──────────────────────────────────────────────────────

  client.on("connect", () => {
    log.info("Redis: TCP connection established");
  });

  client.on("ready", () => {
    log.info("Redis: client ready — commands can be sent");
  });

  client.on("error", (err: Error) => {
    log.error("Redis: client error", { error: err.message, stack: err.stack });
  });

  client.on("close", () => {
    log.warn("Redis: connection closed");
  });

  client.on("reconnecting", (delay: number) => {
    log.warn(`Redis: reconnecting in ${delay}ms`);
  });

  client.on("end", () => {
    log.warn("Redis: connection ended (no more retries)");
  });

  return client;
}

// Export the singleton instance
export const redis = createRedisClient();

// ─── Health check helper ──────────────────────────────────────────────────────

export async function checkRedisHealth(): Promise<"healthy" | "unhealthy"> {
  try {
    const reply = await redis.ping();
    return reply === "PONG" ? "healthy" : "unhealthy";
  } catch {
    return "unhealthy";
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    log.info("Redis: disconnected gracefully");
  } catch (err) {
    log.error("Redis: error during disconnect", {
      error: err instanceof Error ? err.message : String(err),
    });
    redis.disconnect();
  }
}
