'use strict';

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const REDIS_URL = process.env.REDIS_URL || '';
let redisClient = null;
let redisEnabled = false;
const memoryStore = new Map();
const memoryTimers = new Map();

function clearMemoryExpiry(key) {
  const timer = memoryTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    memoryTimers.delete(key);
  }
}

function setMemoryValue(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  clearMemoryExpiry(key);
  memoryStore.set(key, value);
  if (ttlSeconds > 0) {
    const ttlMs = ttlSeconds * 1000;
    const timer = setTimeout(() => {
      memoryStore.delete(key);
      memoryTimers.delete(key);
    }, ttlMs);
    memoryTimers.set(key, timer);
  }
}

async function initCacheEngine() {
  if (redisEnabled || redisClient || !REDIS_URL) return;
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 3000,
      lazyConnect: false
    });
    redisClient.on('error', (err) => {
      console.warn('[Cache] Redis connection error:', err.message);
    });
    await redisClient.ping();
    redisEnabled = true;
    console.log('[Cache] Redis cache enabled');
  } catch (err) {
    redisEnabled = false;
    redisClient = null;
    console.warn('[Cache] Redis unavailable, using in-memory cache fallback:', err.message);
  }
}

async function setJson(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const serialized = JSON.stringify(value);
  if (redisEnabled && redisClient) {
    if (ttlSeconds > 0) {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
      return;
    }
    await redisClient.set(key, serialized);
    return;
  }
  setMemoryValue(key, serialized, ttlSeconds);
}

async function getJson(key) {
  if (redisEnabled && redisClient) {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  }
  const raw = memoryStore.get(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

async function delKey(key) {
  if (redisEnabled && redisClient) {
    await redisClient.del(key);
    return;
  }
  clearMemoryExpiry(key);
  memoryStore.delete(key);
}

function isRedisEnabled() {
  return redisEnabled;
}

module.exports = {
  initCacheEngine,
  setJson,
  getJson,
  delKey,
  isRedisEnabled,
};
