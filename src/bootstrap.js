import { getCollections } from "./db.js";

const MODES = ["live", "mock"];

export async function initializeDatabase() {
  console.log("📦 Initializing database indices...");

  for (const mode of MODES) {
    const collections = await getCollections(mode);

    await Promise.all([
      collections.users.createIndex({ phone: 1 }, { unique: true }),
      collections.users.createIndex({ role: 1 }),
      collections.routes.createIndex({ routeName: 1 }),
      collections.stops.createIndex({ routeId: 1, order: 1 }),
      collections.buses.createIndex({ driverId: 1 }),
      collections.buses.createIndex({ routeId: 1 }),
      collections.bookings.createIndex({ userId: 1, createdAt: -1 }),
      collections.bookings.createIndex({ busId: 1, status: 1 }),
      collections.payments.createIndex({ bookingId: 1 }, { unique: true }),
      collections.reviews.createIndex({ bookingId: 1 }),
      collections.liveLocations.createIndex({ busId: 1 }, { unique: true }),
      collections.warehouses.createIndex({ stopId: 1 }, { unique: true }),
      collections.subscriptions.createIndex({ userId: 1, routeId: 1 }),
      collections.otpSessions.createIndex({ phone: 1, role: 1, createdAt: -1 }),
      collections.otpSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      collections.authSessions.createIndex({ userId: 1, revokedAt: 1 }),
      collections.authSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    ]);

    console.log(`✅ Indices ready for mode: ${mode}`);
  }

  console.log("✅ Database initialization completed successfully!");
}
