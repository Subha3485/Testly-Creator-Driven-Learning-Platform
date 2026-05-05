# PrepNexus Test Platform

Community-driven smart exam prep platform (MVP) combining:
- PYQ practice
- Mock tests
- Basic adaptive AI flows
- Admin-led content operations

## Current MVP Scope

Implemented in this repository:
- Exam-targeted question and test system (SSC, UPSC, JEE, GATE)
- Student test attempts with scoring and negative marking
- Submission analytics and weak-topic detection
- Admin dashboard for test and question management
- JWT authentication with role-based admin route protection
- AI helper endpoints for question variation and adaptive mock creation

## Tech Stack

### Frontend
- React 18
- Vite 5
- Plain CSS (responsive layout)

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing

## Repository Structure

- package.json (legacy root package metadata)
- test-series/
  - backend/
    - middleware/
      - auth.js
    - models/
      - Question.js
      - Submission.js
      - Test.js
      - User.js
    - routes/
      - admin.routes.js
      - ai.routes.js
      - auth.routes.js
      - test.routes.js
    - scripts/
      - seed.ssc.js
    - server.js
    - package.json
  - frontend/
    - src/
      - admin/
        - AdminDashboard.jsx
      - lib/
        - api.js
      - pages/
        - SolutionPage.jsx
        - TestPage.jsx
      - App.jsx
      - main.jsx
      - styles.css
    - index.html
    - vite.config.js
    - package.json

## Prerequisites

- Node.js 18+
- MongoDB running locally or accessible via connection string

## Environment Variables

Backend reads environment from backend/.env (optional).

Supported values:
- MONGO_URI (default: mongodb://127.0.0.1:27017/testseries)
- PORT (default: 5000)
- JWT_SECRET (default: dev-secret-change-me)

Example backend/.env:

MONGO_URI=mongodb://127.0.0.1:27017/testseries
PORT=5000
JWT_SECRET=replace-with-strong-secret

## Setup and Run

### Run locally (single command)

From repository root (recommended):
- `npm run setup` — installs root, backend, and frontend dependencies
- `npm run start` — starts backend and frontend together

Backend base URL:
- http://localhost:5000

Frontend default URL:
- http://localhost:5173

Vite proxy is configured so frontend `/api` requests are forwarded to backend on port 5000.

## Seed Data

From test-series/backend:
- npm run seed:ssc

What seed script does:
- Creates a default admin account (if missing)
- Inserts SSC questions
- Creates one published SSC starter mock test

Seed admin credentials:
- Email: admin@prepnexus.dev
- Password: Admin@123

## Scripts

### Backend scripts (test-series/backend/package.json)
- npm start: run backend server
- npm run dev: run backend with nodemon
- npm run seed:ssc: seed SSC starter data
- npm run check: syntax-check core backend files

### Frontend scripts (test-series/frontend/package.json)
- npm run dev: run Vite dev server
- npm run build: build production assets
- npm run preview: preview production build

## API Summary

### Auth routes (/api/auth)
- POST /register
- POST /login
- GET /me (requires token)

### Student/Test routes (/api/test)
- GET /catalog/tests
- GET /catalog/questions/similar/:questionId
- GET /:id
- POST /submit
- GET /solution/:id
- GET /analytics/user/:userId
- GET /weak-topics/:userId

### Admin routes (/api/admin) (ADMIN token required)
- GET /dashboard/overview
- GET /tests
- POST /tests
- POST /questions
- POST /tests/:testId/questions
- PATCH /tests/:id/publish

Backward-compatible admin endpoints also exist:
- POST /create-test
- POST /add-question/:testId

### AI routes (/api/ai)
- POST /generate-question
- POST /adaptive-test

## Authentication Notes

- Token format: Bearer token in Authorization header
- Frontend stores token in localStorage key prep_token
- Admin dashboard requires ADMIN role

## Data Model Notes

### Question
- Supports source types: PYQ, AI, USER
- Supports difficulty, tags, explanation, verification flags

### Test
- Supports types: FULL, TOPIC, DAILY, ADAPTIVE
- Supports exam targeting and publication state

### Submission
- Stores score, total marks, accuracy, weak topics, and question-level breakdown

### User
- Stores role, exam preference, reputation score

## Troubleshooting

### MongoDB connection refused (ECONNREFUSED 127.0.0.1:27017)

Cause:
- MongoDB is not running or wrong MONGO_URI.

Fix:
- Start MongoDB locally, or set valid MONGO_URI in backend/.env.

### Duplicate schema index warning on email

Cause:
- Same index declared more than once.

Status:
- Fixed in User schema by keeping only one unique email index definition.

### Backend exits on npm start

Likely causes:
- MongoDB unavailable
- Invalid environment variable values

Check:
- Backend logs in terminal
- GET http://localhost:5000/health after startup

## Product Direction (Next Recommended Milestones)

- Student login/register screens and protected student analytics
- Creator profiles and community interactions (likes, comments, follow)
- Leaderboard and gamification (XP, streaks, badges)
- AI tutor and richer adaptive test generation logic
- Course and paid test-series monetization layer

## License

No license file is currently included in this repository. Add one before public distribution.
