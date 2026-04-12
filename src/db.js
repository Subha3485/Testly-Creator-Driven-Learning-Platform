import { MongoClient } from "mongodb";
import { config } from "./config.js";
import { getRuntimeMode, resolveDbNameForMode } from "./runtime_mode.js";

let clientPromise;
const queryCache = new Map();

function createClient() {
  if (!config.mongodbUri) {
    throw new Error("MONGODB_URI is required.");
  }

  return new MongoClient(config.mongodbUri, {
    serverSelectionTimeoutMS: 10000
  });
}

async function ensureClient() {
  if (!clientPromise) {
    const client = createClient();
    console.log("🔗 Attempting to connect to MongoDB...");

    try {
      clientPromise = client.connect();
      await clientPromise;
      console.log("✅ MongoDB connected successfully!");
      console.log(`📚 Live DB: ${config.mongodbDbNameLive}`);
      console.log(`📚 Mock DB: ${config.mongodbDbNameMock}`);
    } catch (error) {
      console.error("❌ MongoDB connection failed!");
      console.error(`📍 URI: ${config.mongodbUri}`);
      console.error(`Error: ${error.message}`);
      throw error;
    }
  }

  return clientPromise;
}

export async function getDb(mode = getRuntimeMode()) {
  const client = await ensureClient();
  return client.db(resolveDbNameForMode(mode));
}

export async function getCollections(mode = getRuntimeMode()) {
  const db = await getDb(mode);
  return {
    users: db.collection("users"),
    buses: db.collection("buses"),
    routes: db.collection("routes"),
    stops: db.collection("stops"),
    bookings: db.collection("bookings"),
    payments: db.collection("payments"),
    reviews: db.collection("reviews"),
    liveLocations: db.collection("live_locations"),
    warehouses: db.collection("warehouses"),
    subscriptions: db.collection("subscriptions"),
    otpSessions: db.collection("otp_sessions"),
    authSessions: db.collection("auth_sessions")
  };
}

export async function getDatabaseConnectionStatus() {
  try {
    const client = await ensureClient();
    const liveDbName = resolveDbNameForMode("live");
    const mockDbName = resolveDbNameForMode("mock");

    await Promise.all([
      client.db(liveDbName).command({ ping: 1 }),
      client.db(mockDbName).command({ ping: 1 })
    ]);

    return {
      connected: true,
      liveDb: liveDbName,
      mockDb: mockDbName,
      mode: getRuntimeMode(),
      error: null
    };
  } catch (error) {
    return {
      connected: false,
      liveDb: resolveDbNameForMode("live"),
      mockDb: resolveDbNameForMode("mock"),
      mode: getRuntimeMode(),
      error: error?.message ?? "Unknown MongoDB error"
    };
  }
}

export async function cachedRead(cacheKey, ttlMs, loader) {
  const namespacedKey = `${getRuntimeMode()}::${cacheKey}`;
  const now = Date.now();
  const cached = queryCache.get(namespacedKey);

  if (cached && cached.expiresAt > now) {
    return structuredClone(cached.value);
  }

  const value = await loader();
  queryCache.set(namespacedKey, {
    value: structuredClone(value),
    expiresAt: now + Math.max(0, Number(ttlMs) || 0)
  });

  return value;
}

export function invalidateCache(prefixes = []) {
  if (!Array.isArray(prefixes) || prefixes.length === 0) {
    queryCache.clear();
    return;
  }

  const normalizedPrefixes = prefixes.map((prefix) => String(prefix));
  for (const key of queryCache.keys()) {
    if (normalizedPrefixes.some((prefix) => key.includes(prefix))) {
      queryCache.delete(key);
    }
  }
}
