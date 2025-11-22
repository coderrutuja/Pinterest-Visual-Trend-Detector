# Pinterest Visual Trend Detector

AI-powered visual trend analysis tool for Pinterest content. It fetches pins via RapidAPI, extracts color palettes and style cues from images, and visualizes trends over time with an interactive React frontend and a Node.js + PostgreSQL backend.

---

## Tech Stack

- **Frontend**: React + Vite, Canvas rendering for charts
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (`users`, `trend_snapshots`)
- **Image/ML pipeline**:
  - RapidAPI Unofficial Pinterest API for pin discovery
  - ColorThief for color palette extraction
  - Heuristic style classification from color statistics
- **Auth**: Email + password with JWT

---

## Features Implemented

- **User authentication**
  - Register / login with email + password
  - Passwords hashed with bcrypt
  - JWT-based auth, stored in memory on the client
  - Dedicated auth screen; analyzer is only available after login

- **Pinterest integration**
  - Keyword-based pin search via RapidAPI
  - Configurable pin count

- **Visual trend analysis**
  - **Color trends**
    - Dominant color palette per run computed from sampled pins
    - Aggregated color frequencies shown as:
      - Canvas-based color strip timeline
      - Swatch list with hex codes
  - **Style distribution**
    - Heuristic style tags per image: `bright`, `dark`, `vibrant`, `muted`, `balanced`
    - Aggregated per run and displayed as a bar chart on Canvas
  - **Seasonal pattern detection**
    - Uses `created_at` timestamps from pins (when available)
    - Buckets pins by month (01–12)
    - Renders a line chart of pin volume over months
  - **Mood board**
    - Selects up to 24 representative image URLs from analyzed pins
    - Renders a scrollable mood-board grid of images

- **Persistence & analytics backend**
  - `trend_snapshots` table stores for each run:
    - `user_id`, `category`, `captured_at`
    - `metrics` JSONB with:
      - `totalPins`
      - `dominantColors`
      - `styleDistribution`
      - `seasonalPattern`
      - `sampleImages`
  - Snapshots can be queried later for historical analysis (basic support is in place via the table schema).

- **Categories / use cases**
  - Predefined Pinterest analysis categories:
    - Home Decor
    - Fashion
    - Graphic Design
    - Photography
    - Food & Drink
  - You can run analyses across these categories for different keywords to build trend comparisons.

---

## Project Structure

```text
root/
  client/           # React + Vite frontend
    src/
      App.jsx       # Auth screen + analyzer UI + Canvas visualizations
      App.css       # Dark theme styling and layouts
  server/           # Node.js backend
    src/
      index.js      # Server startup, DB init
      app.js        # Express app, CORS, route wiring
      config/db.js  # PostgreSQL pool + init
      controllers/
        authController.js
      middleware/
        authMiddleware.js
      routes/
        authRoutes.js
        pinterestRoutes.js
        trendRoutes.js
      services/
        pinterestService.js     # RapidAPI Pinterest client
        imageAnalysisService.js # ColorThief + style heuristics
        trendAnalysisService.js # Aggregation and DB persistence
```

---

## Setup & Run

### Prerequisites

- Node.js (LTS recommended)
- PostgreSQL running locally
- RapidAPI key for the Unofficial Pinterest API

### 1. Backend setup (server)

```bash
cd server
npm install
```

Create a PostgreSQL database, for example:

```sql
CREATE DATABASE pinterest_trends;
```

Create tables:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trend_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics JSONB NOT NULL
);
```

Configure `server/.env` (example):

```env
PORT=5000
DATABASE_URL=postgresql://postgres:root@localhost:5432/pinterest_trends
PGSSL=false
JWT_SECRET=your_jwt_secret_here
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=unofficial-pinterest-api.p.rapidapi.com
CLIENT_ORIGIN=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

You should see in the terminal:

- `PostgreSQL connection established.`
- `API server listening on port 5000`

### 2. Frontend setup (client)

```bash
cd client
npm install
```

Optionally configure `client/.env`:

```env
VITE_API_BASE=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the URL shown in the terminal (by default `http://localhost:5173`).

---

## Using the App

1. **Sign up / Sign in**
   - On load, you see a dedicated auth screen.
   - Choose **Login** or **Register**.
   - Enter email + password and submit.
   - On success, you are taken to the analyzer dashboard.

2. **Configure a trend analysis**
   - In the **Trend configuration** card:
     - Enter a Pinterest keyword (for example: `minimalist living room`, `streetwear`, `wedding invite`).
     - Select one of the categories (Home Decor, Fashion, etc.).
   - Click **Analyze trends**.

3. **Inspect the results**
   - **Color trend timeline**: top colors and their frequencies for the fetched pins.
   - **Style evolution**: distribution of heuristic style tags.
   - **Seasonal pattern**: how pin volume is distributed across months.
   - **Mood board**: representative pins shown as a grid of images.
   - **Trend report snapshot**: raw JSON of the metrics returned by the backend.

4. **Logout**
   - Click the **Logout** button in the top-right user pill to return to the auth screen.

---

## ML / Image Analysis Pipeline (Explanation)

This project focuses on lightweight visual analysis tuned for trend exploration rather than heavy deep-learning models. The pipeline is:

1. **Pin discovery (data collection)**
   - The frontend calls the backend endpoint:
     - `GET /api/pinterest/pins?keyword=...&num=...`.
   - The backend uses `pinterestService` with RapidAPI’s Unofficial Pinterest API to fetch pins related to the keyword.
   - The response is normalized into a list of objects with:
     - `id`
     - `imageUrl`
     - `createdAt` (when available)

2. **Image fetching & color palette extraction**
   - For each pin image URL, `imageAnalysisService.analyzeImageFromUrl`:
     - Downloads the image as an `arraybuffer` via `axios`.
     - Uses **ColorThief** to extract a palette of dominant colors (RGB triplets).
     - Converts those RGB values to hex strings.

3. **Statistical color summary**
   - From the palette, the service computes an **average color**:
     - Mean of R, G, B channels across all palette entries.
   - This gives a single representative color for each image.

4. **Heuristic style classification**
   - Using the average RGB, we compute:
     - **Brightness**: average of the three channels, normalized to `[0, 1]`.
     - **Saturation-like measure**: `(maxChannel - minChannel) / maxChannel`.
   - From these metrics we assign style tags:
     - `bright` / `dark` depending on brightness.
     - `vibrant` / `muted` depending on saturation.
     - If neither applies strongly, tag as `balanced`.
   - Each image ends up with a small set of style tags.

5. **Trend aggregation**
   - `trendAnalysisService.analyzePinsForTrends` runs over all analyzed pins and:
     - Builds a frequency map of color hex values (dominant colors across images).
     - Builds a frequency map of style tags.
     - Groups pins by month using `createdAt` to form a seasonal pattern.
     - Selects up to 24 image URLs as `sampleImages` for the mood board.
   - It then assembles a `metrics` object containing:
     - `totalPins`
     - `dominantColors` (hex + counts)
     - `styleDistribution` (tags + counts)
     - `seasonalPattern` (month + count)
     - `sampleImages` (image URLs)

6. **Persistence**
   - Each run’s `metrics` is stored in `trend_snapshots` as JSONB, keyed by user and category.
   - This enables future analytics such as history, comparisons, or simple forecasts.

---

## Notes and Possible Extensions

- Swap the heuristic style classifier for a real TensorFlow-based model (e.g., scene or aesthetic classifier) for richer style tags.
- Add a `/api/trends/history` endpoint and a History view to compare runs over time.
- Export reports as Markdown or PDF from the JSON snapshot for easier sharing.
