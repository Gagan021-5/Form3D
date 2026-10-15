# Forma3D — AI Product Image-to-3D & Shopify AR Visualization Platform

[![GitHub](https://img.shields.io/badge/GitHub-Form3D-181717?logo=github)](https://github.com/Gagan021-5/Form3D.git)
[![Tests](https://img.shields.io/badge/Tests-46%20Passed-emerald)](https://github.com/Gagan021-5/Form3D.git)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green?logo=node.js)](https://nodejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%20Studio-blue?logo=three.js)](https://threejs.org/)

**Forma3D** is a full-stack product visualization platform that transforms single-view 2D product photographs into production-ready 3D models (`.GLB`) and real-time augmented reality (AR) experiences.

It connects directly to **Shopify storefronts**, allowing e-commerce customers to click **“View in Your Room”** from product pages to inspect products in an interactive 3D studio and project them onto real floors or tabletops using mobile browser AR.

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
│   │   └── services/           # Storage, SSRF defense, URL validation
│   └── data/                   # Local storage directory (uploads/ & models/)
├── frontend/                   # React + Vite frontend (JavaScript)
│   ├── public/                 # Static assets, branding logo & sample models
│   └── src/
│       ├── components/         # Three.js ModelViewer, Navbar, Footer
│       ├── config/             # Centralized API registry (single VITE_API_URL for Render)
│       ├── pages/              # Landing, Upload, Shopify Preview, Generation status, Viewer, Library
│       └── lib/                # API client
├── shopify/                    # Minimal Shopify Theme Integration
│   ├── snippets/               # forma3d-view-in-room.liquid theme snippet
│   └── README.md               # Theme installation & merchant instructions
├── packages/
│   └── shared/                 # Shared TypeScript types, Zod schemas, and constants
├── start-servers.bat           # 1-Click Windows development launcher
└── .env.example                # Clean template for environment variables
```

---

## Core Capabilities

### 1. Shopify Store Integration (`/shopify/preview`)
- **Direct Store Entrypoint**: The route `/shopify/preview` accepts untrusted query parameters (`productId`, `title`, `image`, `returnUrl`) and renders a branded preview screen.
- **Zero-Duplicate AI Mapping**: Resolves against PostgreSQL using `shopifyProductId`. If a product or 3D model already exists, it is **instantly reused** without re-generating or consuming unnecessary AI credits.
- **SSRF Defense**: Validates image URLs, permitting only public `http:`/`https:` protocols while strictly prohibiting loopback/private RFC1918 ranges (`127.0.0.1`, `10.x`, `192.168.x`, `172.16.x`, `169.254.x`, `localhost`).
- **Open Redirect Protection**: Validates `returnUrl` against the shop origin or relative paths (`/products/...`) to prevent arbitrary phishing redirects.
- **Device Rate Limiting**: In-memory IP-based rate limiting (max 5 generations per 10 minutes) protects public generation endpoints against credit depletion.

### 2. Genuine Browser Augmented Reality (AR) Room Placement
- **Android (Chrome / ARCore)**: Clicking **“View in Room”** launches Google Scene Viewer via Android Intent:
  ```text
  intent://arvr.google.com/scene-viewer/1.0?file=<ENCODED_GLB_URL>&mode=ar_only&resizable=true...
  ```
  Activates the mobile camera, detects the physical floor/surface, and projects the product to scale with realistic shadows.
- **iOS (Safari / Quick Look)**: Full interactive 3D WebGL inspection on iPhone/iPad with transparent guidance regarding Apple USDZ requirements for native Quick Look AR.
- **Desktop Device Handoff**: Opens a modal displaying a high-contrast dynamic QR code for instant phone camera scanning.

### 3. Real Tripo AI v3 Provider Integration
- Uses official Tripo OpenAPI v3 endpoints:
  - File token upload: `POST https://openapi.tripo3d.ai/v3/files`
  - 3D task creation: `POST https://openapi.tripo3d.ai/v3/generation/image-to-model`
  - Plural status polling: `GET https://openapi.tripo3d.ai/v3/tasks/:id`
- Automatic reconciliation on server reboot restarts in-flight background jobs (`QUEUED`, `PROCESSING`, `DOWNLOADING`).
- Explicit error handling for Tripo credit status (Code `2010`: `INSUFFICIENT_CREDITS`) with actionable user alerts.

### 4. Interactive 3D WebGL Studio
- Auto-centering and uniform bounding box normalization fitting arbitrary 3D models into a standard viewport.
- OrbitControls (touch, drag rotation, zoom, camera reset, auto-rotate toggle).
- Secondary developer wireframe inspection toggle that does not clutter the customer journey.
- Studio lighting, ACESFilmic tone mapping, and soft contact ground shadows.

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health check & Tripo API key status |
| `GET` | `/api/v1/products` | Paginated product library with search & filter |
| `POST` | `/api/v1/products` | Create product record |
| `GET` | `/api/v1/products/:id` | Get product details, latest job, and 3D assets |
| `PATCH` | `/api/v1/products/:id` | Update product name or category |
| `DELETE` | `/api/v1/products/:id` | Delete product and associated disk assets |
| `POST` | `/api/v1/products/:id/upload` | Upload source image with magic-byte validation |
| `POST` | `/api/v1/products/:id/generations` | Trigger Tripo 3D AI generation |
| `GET` | `/api/v1/generations/:id` | Poll generation status & progress percentage |
| `POST` | `/api/v1/generations/:id/retry` | Retry failed generation job |
| `GET` | `/api/v1/assets/:id/serve` | Stream binary `.glb` for 3D canvas and AR |
| `GET` | `/api/v1/assets/:id/download` | Download binary `.glb` file |
| `POST` | `/api/v1/shopify/resolve` | Resolve Shopify product mapping without duplicate jobs |
| `POST` | `/api/v1/shopify/generate` | Secure, rate-limited generation from Shopify photo |

---

## Local Development Setup

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v24)
- **PostgreSQL**: v14+ (e.g. running on port `5432`)
- **Tripo API Key**: Obtain a free key from [platform.tripo3d.ai](https://platform.tripo3d.ai)

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in both the root directory and `backend/`:
```env
NODE_ENV=development
WEB_URL=http://localhost:5173
API_PORT=4000
API_URL=http://localhost:4000

# PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/forma3d?schema=public"

# Tripo 3D Engine Key
TRIPO_API_KEY=your_tripo_api_key_here

DATA_DIR=./data
MAX_UPLOAD_SIZE_MB=10
GENERATION_POLL_INTERVAL_MS=5000
GENERATION_TIMEOUT_MS=600000
LOG_LEVEL=info
```

### 3. Initialize Database
```bash
npm run db:push --workspace=backend
npm run db:generate --workspace=backend
```

### 4. Start the Application

#### Option A: 1-Click Windows Launcher
Double-click [`start-servers.bat`](./start-servers.bat). It opens two dedicated console windows running both servers simultaneously.

#### Option B: Terminal Commands
```bash
# Terminal 1: Express Backend
npm run dev:backend

# Terminal 2: React Frontend
npm run dev:frontend
```

- **Frontend Studio**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`
- **Shopify Preview Entrypoint**: `http://localhost:5173/shopify/preview`
- **Mobile Wi-Fi Testing**: Open `http://<YOUR_LOCAL_IP>:5173` on your smartphone (e.g. `http://192.168.1.36:5173`).

---

## Shopify Theme Installation

See [`shopify/README.md`](./shopify/README.md) for detailed instructions.

### 3-Step Quick Setup:
1. In Shopify Admin, open **Online Store** &rarr; **Themes** &rarr; **Edit code**.
2. Under **Snippets**, add [`forma3d-view-in-room.liquid`](./shopify/snippets/forma3d-view-in-room.liquid).
3. In your product template (e.g. `sections/main-product.liquid` or `snippets/buy-buttons.liquid`), render the snippet near Add to Cart:
```liquid
{% render 'forma3d-view-in-room',
  product: product,
  forma3d_url: 'https://your-forma3d-app.onrender.com'
%}
```

---

## Render Deployment Guide

The project is structured with a centralized REST configuration (`frontend/src/config/api.js`) for zero-friction deployment to **Render**:

### 1. Backend Web Service (Render)
- **Environment**: Node
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `DATABASE_URL`: Your managed PostgreSQL connection string
  - `TRIPO_API_KEY`: Your Tripo API key
  - `WEB_URL`: `https://your-frontend.onrender.com`

### 2. Frontend Static Site (Render)
- **Environment**: Static Site
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://your-backend-service.onrender.com`

*(All API calls automatically route to `VITE_API_URL` without changing any source code).*

---

## Automated Test Suite

Run the full automated test suite using Vitest:
```bash
npm test
```

### Verified Test Results (46 Passing Tests):
- **Shopify & Security Tests** (`src/__tests__/shopify.test.ts`):
  - SSRF URL validation, protocol verification, and private RFC1918 blocking.
  - Open redirect defense on return URLs.
  - Shopify resolve logic (`new` vs `existing`).
  - Zero-duplicate generation job guards.
- **API Routes Tests** (`src/__tests__/api.test.ts`):
  - Product creation, optional title fallback, category patching, and cascading deletion.
  - Image upload with magic-byte file signature validation.
  - Asynchronous generation queueing and duplicate submission rejection.
  - Safe retry logic for failed jobs.
- **Asset Routes Tests** (`src/__tests__/assets.test.ts`):
  - GLB file streaming and downloading.
  - Path traversal security (`../` protection).
- **Tripo Provider Unit Tests** (`src/__tests__/provider.test.ts`):
  - Error normalization: 401 Unauthorized, 402 Insufficient Credits, 429 Rate Limits, timeouts.
