# Forma3D — AI Product Image-to-3D & Shopify AR Visualization Platform

Forma3D is an AI-powered product visualization platform that transforms 2D product photos into production-ready 3D models and augmented reality (AR) experiences. It connects seamlessly to Shopify stores, allowing customers to click **“View in Your Room”** directly from product pages to inspect products in full 3D and place them on real floors/surfaces using browser-based AR.

---

## Architecture Overview

```
forma3d/
├── backend/                    # Express + TypeScript API backend
│   ├── prisma/                 # Prisma schema & PostgreSQL definitions
│   ├── src/
│   │   ├── config/             # Environment & database client
│   │   ├── jobs/               # Recoverable background generation processor
│   │   ├── middleware/         # Multer, magic bytes, Zod validation, rate limiting
│   │   ├── providers/          # Real Tripo v3 API integration
│   │   ├── routes/             # REST endpoints (products, generations, assets, shopify)
│   │   └── services/           # Storage & SSRF defense
│   └── data/                   # Local storage directory (uploads/ & models/)
├── frontend/                   # React + Vite frontend
│   ├── public/                 # Static assets & test samples
│   └── src/
│       ├── components/         # Three.js ModelViewer, Navbar, Footer
│       ├── config/             # Centralized API registry (single VITE_API_URL for Render)
│       ├── pages/              # Landing, Upload, Shopify Preview, Generation status, Viewer, Library
│       └── lib/                # API client
├── shopify/                    # Shopify Store Integration
│   ├── snippets/               # forma3d-view-in-room.liquid theme snippet
│   └── README.md               # Theme installation & setup instructions
├── packages/
│   └── shared/                 # Shared types, Zod schemas, and constants
└── .env                        # Central environment configuration (gitignored)
```

---

## Core Capabilities

- **Shopify Store Integration (`/shopify/preview`)**:
  - Accepts untrusted parameters (`image`, `title`, `productId`, `returnUrl`).
  - **Zero Duplicate Pipeline**: Reuses existing product and 3D model records mapped to `shopifyProductId` without re-generating or consuming unnecessary AI credits.
  - **SSRF Defense**: Enforces strict URL protocol checks and blocks loopback/private RFC1918 IP addresses.
  - **Open Redirect Protection**: Sanitizes return URLs to prevent external phishing redirects.
  - **Device Rate Limiting**: In-memory rate limiting to protect public generation endpoints against abuse.
- **Genuine Augmented Reality (AR) Room Placement**:
  - **Android (Chrome)**: Launches native Google Scene Viewer via Android Intent for instant floor detection and scaling in real rooms.
  - **iOS (Safari)**: High-fidelity interactive WebGL 3D preview with clear Quick Look USDZ requirement guidance.
  - **Desktop**: Mobile handoff modal with dynamic QR code for instant phone camera scanning.
- **Real Tripo API v3 Integration**:
  - Live task creation via `/v3/generation/image-to-model`.
  - Polling and reconciliation via `/v3/tasks/:id`.
  - Binary glTF (`.GLB`) file serving and downloading.
- **Asynchronous Background Processing**:
  - Non-blocking job pipeline (`QUEUED`, `PROCESSING`, `DOWNLOADING`, `SUCCEEDED`, `FAILED`).
  - Automatic restart reconciliation resuming in-flight jobs upon server reboot.
- **Professional Three.js 3D Studio**:
  - OrbitControls (rotation, pan, zoom, auto-rotation toggle).
  - Auto-centering and uniform bounding box normalization.
  - Wireframe inspection developer toggle, camera reset, and studio lighting.

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v20+
- **PostgreSQL**: v14+ running locally (e.g., port `5432`)

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root and `backend/` directory:
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

### 3. Initialize Database & Run Migrations
```bash
npm run db:push --workspace=backend
npm run db:generate --workspace=backend
```

### 4. Start Development Servers
```bash
# In terminal 1 (or run start-servers.bat):
npm run dev:backend

# In terminal 2:
npm run dev:frontend
```
- **Web App**: `http://localhost:5173`
- **API Server**: `http://localhost:4000`
- **Shopify Preview Entrypoint**: `http://localhost:5173/shopify/preview`

---

## Shopify Theme Installation

See [`shopify/README.md`](./shopify/README.md) for full instructions.

In brief:
1. Copy [`shopify/snippets/forma3d-view-in-room.liquid`](./shopify/snippets/forma3d-view-in-room.liquid) to your theme's `snippets/` folder.
2. Render it inside `sections/main-product.liquid` or `snippets/buy-buttons.liquid`:
```liquid
{% render 'forma3d-view-in-room', product: product, forma3d_url: 'https://your-forma3d-app.onrender.com' %}
```

---

## Running Automated Tests

Run the complete Vitest test suite:
```bash
npm test
```
All 46 unit and integration tests verify:
- Product creation, updating, and deletion.
- Image uploads with magic-byte file signature validation.
- Background generation pipeline, duplicate-job guards, and recovery.
- SSRF prevention, IP filtering, and open redirect defense.
- Shopify parameter validation and zero-duplicate mapping.
- Asset streaming and path-traversal security.
