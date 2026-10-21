# ☕ Brewhaus Café — Monorepo Architecture

A full-stack, multi-café SaaS web application with MongoDB Atlas, real-time Server-Sent Events (SSE), QR-based ordering, Razorpay payments, and 4 independently deployable frontend applications managed in an npm workspaces monorepo.

---

## 🏗 Apps & Workspace Structure

```
cafe-app/
├── apps/
│   ├── customer/       # Public Mobile-First QR Ordering & Live Tracking (Port 5173)
│   ├── pos/            # Cashier & Staff Touch Terminal with Offline Queue (Port 5174)
│   ├── kds/            # Kitchen Display System with Chimes & Timers (Port 5175)
│   └── admin/          # Owner & Manager Back-Office & Analytics (Port 5176)
├── packages/
│   └── shared/         # @cafe/shared: Types, formatters, tokens, SSE, UI components
└── server/             # Express.js + MongoDB Atlas Backend API (Port 5000)
```

---

## 📱 Target Applications Matrix

| App | Target Users / Role Gate | Dev Command | Port | Vercel Root Directory | Production Domain | Key Environment Variables |
|---|---|---|---|---|---|---|
| **apps/customer** | Public (no login)<br>Mobile-first QR table ordering | `npm run dev:customer` | `5173` | `apps/customer` | `https://cafestore-customer.vercel.app` | `VITE_API_URL`<br>`VITE_RAZORPAY_KEY_ID`<br>`VITE_ADMIN_URL` |
| **apps/pos** | Staff (`cashier`, `manager`, `owner`)<br>Touch register, offline queue, tabs | `npm run dev:pos` | `5174` | `apps/pos` | `https://cafestore-pos.vercel.app` | `VITE_API_URL`<br>`VITE_ADMIN_URL`<br>`VITE_KDS_URL` |
| **apps/kds** | Kitchen (`kitchen`, `manager`, `owner`)<br>Live ticket board, timers, chimes | `npm run dev:kds` | `5175` | `apps/kds` | `https://cafestore-kds.vercel.app` | `VITE_API_URL`<br>`VITE_ADMIN_URL`<br>`VITE_POS_URL` |
| **apps/admin** | Management (`owner`, `manager`)<br>Inventory, CRM, GST reports, Super Admin | `npm run dev:admin` | `5176` | `apps/admin` | `https://cafestore-admin.vercel.app` | `VITE_API_URL`<br>`VITE_CUSTOMER_URL`<br>`VITE_POS_URL`<br>`VITE_KDS_URL` |
| **server** | Backend API & SSE Engine | `npm run dev:server` | `5000` | Render | `https://cafestore-nmue.onrender.com` | `MONGO_URI`<br>`JWT_SECRET`<br>`CUSTOMER_APP_URL`<br>`POS_APP_URL`<br>`KDS_APP_URL`<br>`ADMIN_APP_URL` |

> [!IMPORTANT]
> **Vercel Root Directory Requirement**:
> Each Vercel project MUST have its **Root Directory** configured in Project Settings:
> - `cafestore-admin` ➔ `apps/admin`
> - `cafestore-pos` ➔ `apps/pos`
> - `cafestore-kds` ➔ `apps/kds`
> - `cafestore-customer` ➔ `apps/customer`

> [!NOTE]
> **Cross-App Navigation**: No internal routes or dead imports are shared across apps. The admin panel sidebar and headers link to customer storefront, POS terminal, and KDS via environment variables and production fallbacks (`VITE_CUSTOMER_URL`, `VITE_POS_URL`, `VITE_KDS_URL`). POS and KDS headers also link directly back to the Admin Back Office and each other.

---

## 📦 Packages

### `@cafe/shared` (`packages/shared`)
The single source of truth for code shared between the frontend applications:
- **`money.js`**: `formatINR`, `formatGSTRate`, currency rounding helpers.
- **`roles.js`**: Role definitions (`ROLES`), app access control check (`canAccessApp`), and role display labels.
- **`accessToken.js`**: Session storage token helpers with legacy fallback.
- **`liveStream.js`**: Resilient SSE connection factory with automatic backoff reconnection and tab visibility handling.
- **`phoneNormalizer.js`**: Indian 10-digit phone normalization and validation.
- **`download.js`**: Blob download helper for reports and receipts.
- **`UnauthorizedScreen.jsx`**: Reusable unauthorized error view for wrong-role attempts.
- **`ImageWithFallback.jsx`**: Resilient image loader with placeholder fallback.

Apps import **only** from `@cafe/shared`, never from each other.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB Atlas or local MongoDB instance
- Razorpay account (test mode credentials work)

### 2. Install Dependencies
```bash
git clone <your-repo>
cd cafe-app
npm install
```

### 3. Environment Setup

Copy example environments for each app and the server:
```bash
# Server
cp server/.env.example server/.env

# Apps
cp apps/customer/.env.example apps/customer/.env
cp apps/pos/.env.example apps/pos/.env
cp apps/kds/.env.example apps/kds/.env
cp apps/admin/.env.example apps/admin/.env
```

### 4. Seed Database
```bash
npm run seed
```

This creates default admin users, categories, sample menu items with INR pricing, and table QR codes.

### 5. Run Development Servers
To start all services concurrently (Server, Customer, POS, KDS, Admin):
```bash
npm run dev
```

Or run any service individually:
- Customer: `npm run dev:customer` (http://localhost:5173)
- POS Terminal: `npm run dev:pos` (http://localhost:5174)
- KDS Board: `npm run dev:kds` (http://localhost:5175)
- Admin Panel: `npm run dev:admin` (http://localhost:5176)
- API Server: `npm run dev:server` (http://localhost:5000)

### 6. Production Builds
Build all 4 apps from the monorepo root:
```bash
npm run build
```
Or build any individual app:
- `npm run build:customer`
- `npm run build:pos`
- `npm run build:kds`
- `npm run build:admin`

---

## 🌐 Deployment & Hosting

### 1. Backend Deployment (Render)
The backend is deployed as a Render Web Service (`brewhaus-cafe-api`).

- **Blueprint**: Use the root [render.yaml](file:///c:/cafe-app-main/render.yaml) blueprint to spin up the web service and Redis.
- **Health Check Path**: In Render Dashboard, navigate to **Settings > Health Check Path** and set it to `/health`.
- **Region**: Deploy in **Singapore** (`singapore`), which is the closest Render region to India and Southeast Asia. Keep your MongoDB Atlas cluster in the nearest region (e.g. AWS `ap-south-1` Mumbai or `ap-southeast-1` Singapore) for minimal network latency.
- **MongoDB Atlas Network Access**: Allow Render's outbound IP ranges, or allow access from anywhere (`0.0.0.0/0`) with a strong database user password.
- **Image Storage (Cloudinary)**: Product and menu images are uploaded directly to Cloudinary (`CLOUDINARY_URL`). Render uses an ephemeral filesystem, so local disk writes are never used for production image persistence.
- **Render Instance Types & Cold Starts**:
  - **Free Web Service**: Spins down after 15 minutes of inactivity and takes ~1 minute to wake on the next incoming request. Do NOT add in-app self-ping or node-cron keep-alives (a sleeping free instance cannot execute code to wake itself).
  - **Keep-Alive Monitor (UptimeRobot / cron-job.org)**:
    1. Sign up for a free monitor on [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org).
    2. Add a new **HTTP(s)** monitor pointing to `https://<your-backend-url>.onrender.com/health`.
    3. Set the monitoring interval to **every 5 minutes**.
    4. ⚠️ **Never monitor `/robots.txt`**: Render's edge CDN responds to `/robots.txt` directly without routing traffic to your container, meaning `/robots.txt` pings will NOT wake the service! Always monitor `/health`.
  - **Production Recommendation**: Upgrade the backend to Render's **Starter tier ($7/month)** before onboarding paying cafés. Starter instances run 24/7 without spin-downs, completely eliminating cold starts.

### 2. Frontend Applications (Vercel)

Each app is independently deployable to Vercel with its own `vercel.json` SPA rewrite rules.

1. Create a new Project in Vercel for each app.
2. In Project Settings, set the **Root Directory**:
   - Customer: `apps/customer`
   - POS: `apps/pos`
   - KDS: `apps/kds`
   - Admin: `apps/admin`
   - Super Admin: `apps/super-admin`
3. Vercel automatically detects Vite with output directory `dist`.
4. Configure the relevant environment variables in Vercel for each project:
   - `VITE_API_URL=https://cafestore-nmue.onrender.com/api`
   - `VITE_CUSTOMER_URL=https://cafestore-customer.vercel.app`
   - `VITE_POS_URL=https://cafestore-pos.vercel.app`
   - `VITE_KDS_URL=https://cafestore-kds.vercel.app`
   - `VITE_ADMIN_URL=https://cafestore-admin.vercel.app`
5. Deploy each app independently.

---

## 🔒 Security & Initial Platform Access

- **No Hardcoded Super Admin Credentials**: There are zero seeded default super admin accounts or passwords in code.
- **Environment Configuration**: Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in your server environment variables.
- **Production Validation**: In production (`NODE_ENV=production`), the server verifies that `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` are defined and sufficiently strong (minimum 8 characters, non-trivial). If missing or weak, the backend fails to start.
- **CORS Validation**: The backend server validates CORS against all configured app URLs:
  - `CUSTOMER_APP_URL` (`https://cafestore-customer.vercel.app`)
  - `POS_APP_URL` (`https://cafestore-pos.vercel.app`)
  - `KDS_APP_URL` (`https://cafestore-kds.vercel.app`)
  - `ADMIN_APP_URL` (`https://cafestore-admin.vercel.app`)
  - Local development origins (`http://localhost:5173`, `http://localhost:5174`, `http://localhost:5175`, `http://localhost:5176`, `http://localhost:5000`)
  - Vercel preview environments (`*.vercel.app`)
- `ADMIN_APP_URL` (`https://cafestore-admin.vercel.app`)
- Local development origins (`http://localhost:5173`, `http://localhost:5174`, `http://localhost:5175`, `http://localhost:5176`, `http://localhost:5000`)
- Vercel preview environments (`*.vercel.app`)

---

## 📄 License & Credits
Built with ☕ by Infinigrowsoftech
