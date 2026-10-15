# Forma3D — AI Product Image-to-3D Visualization Platform

Forma3D is an AI-powered image-to-3D product visualization application. It allows designers and e-commerce merchants to upload single-view product photographs, reconstruct full 3D geometry and PBR materials using the Tripo AI v3 engine, interact with the resulting 3D models in a real-time WebGL studio, and export standard binary glTF (`.GLB`) files.

---

## Architecture Overview

```
forma3d/
├── apps/
│   ├── api/                    # Express + TypeScript backend
│   │   ├── prisma/             # Prisma schema & PostgreSQL definitions
│   │   ├── src/
│   │   │   ├── config/         # Environment & database client
│   │   │   ├── jobs/           # Recoverable background generation processor
│   │   │   ├── middleware/     # Multer, magic bytes, Zod validation, error handler
│   │   │   ├── providers/      # Tripo v3 API provider module
│   │   │   ├── routes/         # Versioned endpoints (/api/v1/...)
│   │   │   └── services/       # Local disk storage with path traversal protection
│   │   └── data/               # Local storage directory (uploads/ & models/)
│   └── web/                    # React 19 + Vite + TypeScript frontend
│       ├── public/models/      # Standalone valid GLB demo asset
│       └── src/
│           ├── components/     # Three.js ModelViewer, Navbar, Footer
│           ├── pages/          # Landing, Upload, Generation status, 3D Viewer, Library
│           └── lib/            # Typed API client
├── packages/
│   └── shared/                 # Shared types, Zod schemas, and constants
└── .env                        # Central environment configuration
```

---

## Features

- **Real Tripo API Integration**: Full lifecycle integration with Tripo v3 API (image upload via `/files`, task creation via `/task`, status polling via `/task/{id}`, and secure GLB model downloads).
- **Asynchronous Recoverable Background Processing**: Non-blocking generation pipeline with internal states (`QUEUED`, `PROCESSING`, `DOWNLOADING`, `SUCCEEDED`, `FAILED`) and restart reconciliation that resumes in-flight tasks upon server reboot.
- **Interactive 3D Studio**: Built with Three.js, React Three Fiber, and Drei. Supports OrbitControls, auto-centering and uniform normalization of models with arbitrary bounding boxes/origins, wireframe inspection, auto-rotation, camera reset, and studio lighting.
- **Local Storage with Traversal Protection**: Images and GLBs stored securely under `apps/api/data/` with UUID-based filenames and path traversal verification.
- **PostgreSQL Database**: Relational schema powered by Prisma ORM tracking products, generation jobs, retry counts, error codes, and model assets.
- **Design System**: Refined white (`#FFFFFF`), deep navy (`#17243A`), and royal cobalt (`#4568E8`) aesthetic with Inter typography, subtle borders, and micro-interactions.

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v24)
- **PostgreSQL**: v14+ running locally (e.g., port `5432`)

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```env
NODE_ENV=development
WEB_URL=http://localhost:5173
API_PORT=4000
API_URL=http://localhost:4000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/forma3d?schema=public"
TRIPO_API_KEY=your_tripo_api_key_here
DATA_DIR=./data
MAX_UPLOAD_SIZE_MB=10
GENERATION_POLL_INTERVAL_MS=5000
GENERATION_TIMEOUT_MS=600000
LOG_LEVEL=info
```
> **Note on Special Characters**: If your PostgreSQL password contains special characters (such as `$`), URL-encode them (e.g. `gagan$123` becomes `gagan%24123`).

### 3. Database Migration
Push the Prisma schema to create the `forma3d` database and tables:
```bash
npx prisma db push --schema=apps/api/prisma/schema.prisma
```

### 4. Install Dependencies & Build Packages
```bash
npm install
npm run build --workspace=packages/shared
```

### 5. Start Development Servers
Run both backend and frontend servers:

**Backend API (Port 4000):**
```bash
npm run dev --workspace=apps/api
```

**Frontend App (Port 5173):**
```bash
npm run dev --workspace=apps/web
```

Open `http://localhost:5173` in your browser.

---

## API Endpoints Reference

All endpoints are versioned under `/api/v1`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check and Tripo configuration status |
| `GET` | `/api/v1/products` | Paginated product list with search and status filtering |
| `POST` | `/api/v1/products` | Create a new product entry |
| `GET` | `/api/v1/products/:id` | Get product details including latest job and assets |
| `DELETE` | `/api/v1/products/:id` | Delete product and associated disk files (image & GLB) |
| `POST` | `/api/v1/products/:id/upload` | Upload source image (`multipart/form-data`, max 10MB) |
| `GET` | `/api/v1/products/:id/image` | Serve source image thumbnail |
| `POST` | `/api/v1/products/:id/generations` | Initiate 3D generation job |
| `GET` | `/api/v1/generations/:id` | Get generation job progress and status |
| `POST` | `/api/v1/generations/:id/retry` | Safe retry of a failed generation job |
| `GET` | `/api/v1/assets/:id/serve` | Stream GLB file inline for the 3D viewer |
| `GET` | `/api/v1/assets/:id/download` | Download GLB file with product filename |

---

## Automated & Live Testing

### 1. Automated Mocked Test Suite (33 tests)
Runs with mocked provider responses so no API credits are consumed:
```bash
npm run test --workspace=apps/api
```
Tests cover:
- Request validation & Zod schemas
- Product creation, pagination, and deletion cascading
- Magic bytes file signature verification (JPEG, PNG, WebP)
- Path traversal prevention in local storage
- Provider error normalization (401 invalid credentials, 429 rate limit, 402 insufficient credits, network timeout)
- Duplicate job submission prevention & retry guards

### 2. Optional Live Tripo Integration Test
Communicates with the real Tripo API using your configured `TRIPO_API_KEY`:
```bash
$env:LIVE_TEST="true"; npx vitest run src/__tests__/tripo.live.test.ts
```

---

## Known Limitations

- **Local Storage**: Uploaded reference images and generated GLB models are stored on the local disk (`apps/api/data/`). In a production cloud deployment, this can be swapped with S3 or GCS without changing database schemas.
- **Single Instance Job Processor**: The background queue operates in-process with persistent PostgreSQL records and interval polling. For distributed production clusters, a Redis-backed queue (such as BullMQ) can be introduced.
