import cors from "cors";
import express from "express";
import { otpSessions, routes } from "./data/store.js";
import {
  calculateFare,
  createBadRequest,
  createBooking,
  getBookingById,
  getBookingsForUser,
  getRouteById,
  getUserById,
  sanitizeRoute
} from "./services/logistics.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "buslogistic-server", timestamp: new Date().toISOString() });
  });

  app.get("/api/routes", (_req, res) => {
    res.json({ data: routes.map(sanitizeRoute) });
  });

  app.get("/api/routes/:routeId", (req, res, next) => {
    try {
      const route = getRouteById(req.params.routeId);
      if (!route) {
        throw createBadRequest("Route not found.");
      }
      res.json({ data: sanitizeRoute(route) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/send-otp", (req, res, next) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        throw createBadRequest("phoneNumber is required.");
      }

      const otp = "123456";
      const sessionId = `otp-${Date.now()}`;
      otpSessions.set(sessionId, {
        phoneNumber,
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      res.json({
        message: "OTP generated successfully.",
        data: { sessionId, phoneNumber, otp }
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/verify-otp", (req, res, next) => {
    try {
      const { sessionId, otp } = req.body;
      const session = otpSessions.get(sessionId);

      if (!session) {
        throw createBadRequest("OTP session not found.");
      }

      if (session.expiresAt < Date.now()) {
        otpSessions.delete(sessionId);
        throw createBadRequest("OTP session expired.");
      }

      if (session.otp !== otp) {
        throw createBadRequest("Invalid OTP.");
      }

      const user =
        getUserById("user-001") && getUserById("user-001").phoneNumber === session.phoneNumber
          ? getUserById("user-001")
          : {
              id: "user-001",
              phoneNumber: session.phoneNumber,
              name: "New User",
              email: "",
              usage: "Personal",
              language: "English",
              walletBalance: 0,
              gstNumber: "",
              savedRouteIds: [],
              savedStopIds: []
            };

      res.json({
        message: "OTP verified successfully.",
        data: {
          token: `mock-token-${user.id}`,
          user
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:userId/profile", (req, res, next) => {
    try {
      const user = getUserById(req.params.userId);
      if (!user) {
        throw createBadRequest("User not found.");
      }
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/fare/quote", (req, res, next) => {
    try {
      const {
        routeId,
        pickupStopId,
        dropStopId,
        weightKg = 1,
        quantity = 1,
        fragile = false,
        express = false
      } = req.body;

      const route = getRouteById(routeId);
      if (!route) {
        throw createBadRequest("Route not found.");
      }

      const quote = calculateFare({
        route,
        pickupStopId,
        dropStopId,
        weightKg,
        quantity,
        fragile,
        express
      });

      res.json({ data: quote });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/routes/:routeId/slots", (req, res, next) => {
    try {
      const route = getRouteById(req.params.routeId);
      if (!route) {
        throw createBadRequest("Route not found.");
      }
      res.json({ data: route.slots });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/bookings", (req, res, next) => {
    try {
      const booking = createBooking(req.body);
      res.status(201).json({
        message: "Booking created successfully.",
        data: booking
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:userId/bookings", (req, res, next) => {
    try {
      res.json({ data: getBookingsForUser(req.params.userId) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/bookings/:bookingId", (req, res, next) => {
    try {
      const booking = getBookingById(req.params.bookingId);
      if (!booking) {
        throw createBadRequest("Booking not found.");
      }
      res.json({ data: booking });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/bookings/:bookingId/tracking", (req, res, next) => {
    try {
      const booking = getBookingById(req.params.bookingId);
      if (!booking) {
        throw createBadRequest("Booking not found.");
      }
      res.json({
        data: {
          bookingId: booking.id,
          currentStatus: booking.status,
          route: booking.route,
          busNumber: booking.slot?.busNumber ?? null,
          eta: booking.slot?.arrival ?? null,
          timeline: booking.tracking,
          liveLocation: {
            lat: 22.2531,
            lng: 88.1421,
            label: "Near Kolaghat bridge"
          }
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:userId/wallet", (req, res, next) => {
    try {
      const user = getUserById(req.params.userId);
      if (!user) {
        throw createBadRequest("User not found.");
      }
      res.json({
        data: {
          userId: user.id,
          balance: user.walletBalance,
          paymentOptions: ["UPI", "Wallet", "Cash at pickup"]
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode ?? 500;
    res.status(statusCode).json({
      error: {
        message: error.message ?? "Internal server error"
      }
    });
  });

  return app;
}
