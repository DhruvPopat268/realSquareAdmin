const { client } = require("./config");

const isRedisReady = () => client.isReady;

// Set a key with optional TTL in seconds
const setKey = async (key, value, ttlSeconds = null) => {
  if (!isRedisReady()) return;
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, serialized);
  } else {
    await client.set(key, serialized);
  }
};

// Get a key (returns parsed value or null)
const getKey = async (key) => {
  if (!isRedisReady()) return null;
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
};

// Delete a key
const deleteKey = async (key) => {
  if (!isRedisReady()) return;
  await client.del(key);
};

// Check if a key exists
const existsKey = async (key) => {
  if (!isRedisReady()) return false;
  const result = await client.exists(key);
  return result === 1;
};

// Set TTL on an existing key
const expireKey = async (key, ttlSeconds) => {
  if (!isRedisReady()) return;
  await client.expire(key, ttlSeconds);
};

// Flush all keys (use with caution)
const flushAll = async () => {
  if (!isRedisReady()) return;
  await client.flushAll();
};

module.exports = { setKey, getKey, deleteKey, existsKey, expireKey, flushAll };
