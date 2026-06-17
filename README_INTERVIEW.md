# PrepNexus Test Platform — Interview Explanation

## Overview
PrepNexus is a community-driven exam preparation system built as an MVP with a full-stack architecture.
It combines:
- Student quiz/test-taking
- Admin content management
- AI-powered question generation and variation
- PDF extraction pipeline for importing questions from exam materials

The project is organized into three main areas:
1. `test-series/backend` — Express + MongoDB backend
2. `test-series/frontend` — React + Vite frontend
3. `pipeline/` — Python extraction and export pipeline

## Key Features
- JWT-based authentication for students and admins
- Dynamic test catalog, question review, and solution analytics
- Admin-only routes for question/test creation and publication
- Pipeline converts raw exam PDFs into structured JSON
- Frontend uses Vite proxy to call backend APIs from the same development origin

## System Architecture

### Backend (`test-series/backend`)
- `server.js`: app entrypoint
- `routes/`: route definitions for auth, tests, admin, AI
- `models/`: Mongoose schemas for User, Question, Test, Submission
- `middleware/auth.js`: JWT verification and role protection
- `data/`: local question assets and structured JSON files

### Frontend (`test-series/frontend`)
- `src/App.jsx`: root application and route layout
- `src/pages/`: test pages, solution pages, admin pages
- `src/lib/api.js`: frontend API client
- `vite.config.js`: local development proxy to backend port 4000

### Pipeline (`pipeline/`)
- `pipeline.py`: extracts text, images, tables, and questions from PDFs
- `export_to_backend.py`: exports pipeline output into backend data
- `llm_prompt_template.txt`: prompt scaffolding for question cleaning / review

## Setup

### Prerequisites
- Node.js 18+
- MongoDB installed and running
- Python 3.11+ for pipeline scripts
- Tesseract OCR installed and available on `PATH` for pipeline extraction

### Start the app
1. In repository root:
   ```powershell
   npm install
   npm --prefix test-series/backend install
   npm --prefix test-series/frontend install
   ```
2. Start backend:
   ```powershell
   npm --prefix test-series/backend start
   ```
3. Start frontend:
   ```powershell
   npm --prefix test-series/frontend run dev
   ```
4. Default URLs:
   - Frontend: `http://localhost:5173`
   - Backend health: `http://localhost:4000/health`

### Environment Variables
Create `test-series/backend/.env` with:
```env
MONGO_URI=mongodb://127.0.0.1:27017/testseries
PORT=4000
JWT_SECRET=replace-with-strong-secret
BACKEND_DATA_DIR=./data
```

## Known Broken Area (Fixed)

### Syntax error in `test-series/backend/routes/test.routes.js`
- The `/banking/practice-sets` route definition was missing a closing parenthesis `))`
- This caused `npm --prefix test-series/backend run check` to fail with `SyntaxError: missing ) after argument list`
- The route is now corrected and backend syntax validation passes

## Important Notes for Interview Discussion

### What to emphasize
- Separation of concerns: backend API, frontend UI, and data extraction pipeline are distinct and modular
- Practical use of local file-based practice data in addition to MongoDB
- Real-world issue resolution: syntax check failed due to an unclosed route handler, a typical JS bug
- The importance of `vite.config.js` proxy when frontend and backend run on different ports during development

### How data is moved
- `pipeline/pipeline.py` extracts raw and structured question JSON from PDF inputs
- `pipeline/export_to_backend.py` writes final structured payloads into `test-series/backend/data`
- Backend serves question images and assets from `data/` via static routes

### What is missing / next improvements
- Add explicit `.env` sample file to repository root or backend folder
- Add license file for distribution
- Add more robust CI checks for backend routes and frontend build
- Add API documentation or Swagger for backend endpoints

## Interview-ready summary
- This is a full-stack test prep MVP with a question import pipeline
- The backend is Express/MongoDB with JWT role-based auth
- The frontend is React + Vite with proxy to backend 4000
- The pipeline is Python-based and exports structured question JSON
- The only confirmed broken area was a syntax bug in `test.routes.js`, now fixed

## Commands
- `npm --prefix test-series/backend run check` — backend syntax check
- `npm --prefix test-series/backend start` — run backend server
- `npm --prefix test-series/frontend run dev` — run frontend dev server
- `python pipeline/pipeline.py` — run PDF extraction pipeline
- `python pipeline/export_to_backend.py --pipeline-output output --backend-data-dir "..\test-series\backend\data"` — export pipeline output
