# Bus Logistics Server

Node.js API for the Bus Logistics apps, backed by MongoDB.

## Product Docs

- [System Architecture](./docs/system-architecture.md)
- [Product Checklist](./docs/product-checklist.md)

## Setup

```bash
npm install
npm run dev
```

The server now uses a single runtime env file: `server/.env`.

Default local setup:

- `SERVER_MODE=test`
- `HOST=127.0.0.1`
- `PUBLIC_BASE_URL=http://localhost:4000`
- `ALLOWED_ORIGINS=*`

Default port: `4000`

`server/.env.example` includes a Mongo-backed template for local development. Copy the values you need into `server/.env`.

If you want MongoDB-backed local runs, update the same `.env` file and set:

- `PORT`
- `HOST`
- `PUBLIC_BASE_URL`
- `SERVER_MODE`
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `MONGODB_DB_NAME_LIVE`
- `MONGODB_DB_NAME_MOCK`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ISSUER`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL`
- `REFRESH_COOKIE_NAME`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `COOKIE_DOMAIN`
- `OTP_PROVIDER`
- `OTP_FROM`
- `OTP_FIXED_CODE`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `FAST2SMS_API_KEY`
- `FAST2SMS_ROUTE`
- `MSG91_AUTH_KEY`
- `MSG91_TEMPLATE_ID`
- `MSG91_SENDER_ID`
- `ALLOWED_ORIGINS`

Minimum Mongo-backed local setup:

```env
SERVER_MODE=live
HOST=127.0.0.1
PORT=4000
PUBLIC_BASE_URL=http://localhost:4000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=buslogistic
MONGODB_DB_NAME_LIVE=buslogistic_live
MONGODB_DB_NAME_MOCK=buslogistic_mock
ALLOWED_ORIGINS=http://localhost:4000
```

There is no separate `.env.test` or `.env.production` runtime path anymore.

## Current Data Model

Primary collections:

- `users`
- `buses`
- `routes`
- `stops`
- `bookings`
- `payments`
- `reviews`
- `live_locations`
- `warehouses`
- `subscriptions`

Auth/session collections:

- `otp_sessions`
- `auth_sessions`

Schema diagram: [docs/database-schema.md](./docs/database-schema.md)

## Main Endpoints

- `GET /health`
- `GET /admin`
- `GET /api/routes`
- `GET /api/routes/:routeId`
- `GET /api/routes/:routeId/slots`
- `POST /api/auth/send-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/me`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:sessionId`
- `POST /api/driver/auth/send-otp`
- `POST /api/driver/auth/resend-otp`
- `POST /api/driver/auth/verify-otp`
- `POST /api/driver/auth/refresh`
- `POST /api/driver/auth/logout`
- `POST /api/driver/auth/logout-all`
- `GET /api/driver/auth/me`
- `GET /api/driver/auth/sessions`
- `DELETE /api/driver/auth/sessions/:sessionId`
- `POST /api/admin/auth/send-otp`
- `POST /api/admin/auth/resend-otp`
- `POST /api/admin/auth/verify-otp`
- `POST /api/admin/auth/refresh`
- `POST /api/admin/auth/logout`
- `POST /api/admin/auth/logout-all`
- `GET /api/admin/auth/me`
- `GET /api/admin/auth/sessions`
- `DELETE /api/admin/auth/sessions/:sessionId`
- `GET /api/driver/:driverId/assignment`
- `GET /api/trips/:tripId`
- `POST /api/trips/:tripId/status`
- `POST /api/trips/:tripId/stops`
- `POST /api/trips/:tripId/location`
- `GET /api/admin/summary`
- `GET /api/users/:userId/profile`
- `GET /api/users/:userId/bookings`
- `GET /api/bookings/:bookingId`
- `GET /api/bookings/:bookingId/tracking`
- `GET /api/users/:userId/wallet`
- `POST /api/fare/quote`
- `POST /api/bookings`

## Example Requests

Send OTP:

```bash
curl -X POST http://localhost:4000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"9883773485\"}"
```

Verify customer OTP:

```bash
curl -X POST http://localhost:4000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"otp-session-id\",\"otp\":\"123456\"}"
```

Send driver OTP:

```bash
curl -X POST http://localhost:4000/api/driver/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"9123456789\"}"
```

Get fare quote:

```bash
curl -X POST http://localhost:4000/api/fare/quote \
  -H "Content-Type: application/json" \
  -d "{\"routeId\":\"route-kolkata-haldia\",\"pickupStopId\":\"kolaghat\",\"dropStopId\":\"haldia-depot\",\"weightKg\":18,\"quantity\":2,\"fragile\":true,\"express\":false}"
```

Create booking:

```bash
curl -X POST http://localhost:4000/api/bookings \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user-001\",\"routeId\":\"route-kolkata-haldia\",\"pickupStopId\":\"kolaghat\",\"dropStopId\":\"haldia-depot\",\"slotId\":\"slot-1200\",\"packageType\":\"Electronics\",\"weightKg\":18,\"quantity\":2,\"fragile\":true,\"express\":false,\"paymentMethod\":\"UPI\"}"
```

## Notes

- The runtime mode switch uses MongoDB-backed datasets: `live` mode reads `MONGODB_DB_NAME_LIVE`, `mock` mode reads `MONGODB_DB_NAME_MOCK`.
- Cache is used only as a read-through acceleration layer; MongoDB remains the source of truth.
- Admin APIs now require an admin JWT access token.
- Refresh tokens can be supplied by body or the HTTP-only refresh cookie.
- Session inventory and revocation endpoints are available for customer, driver, and admin auth flows.
- OTP delivery is provider-driven through `OTP_PROVIDER` with support for `mock`, `twilio`, `fast2sms`, and `msg91`.
- If `OTP_PROVIDER=mock`, the response may include `otpPreview` for local testing.
- Access tokens are now signed JWTs and refresh tokens are rotated against hashed MongoDB-backed auth sessions.
- Realtime updates are available through Socket.IO on the same server port.
- This is much closer to production than the previous demo flow, but production OTP templates, socket authorization, rate limiting, and audit logging are still pending.
