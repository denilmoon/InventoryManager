# Ecowater Inventory Manager

A mobile-responsive web application for real-time inventory tracking,
shipment logging, dispatch management, and reporting for a water
softening company. Replaces a paper-based and spreadsheet-based system
with a single source of truth accessible by all authorized users from any device.

Built with React, Node.js/Express, PostgreSQL, and Prisma.

---

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 — Foundation | ✅ Complete | Auth system, JWT middleware, Prisma schema, Express scaffold |
| Phase 2 — Inventory Core | ✅ Complete | Inventory CRUD, stock counts, dashboard, supplier routes, React UI |
| Phase 3 — Shipment & Dispatch | 🔄 Up Next | Inbound/outbound pipeline, reorder flow, dispatch dialog |
| Phase 4 — Reports & Reconciliation | ⏳ Upcoming | Weekly/monthly reports, tech reconciliation |
| Phase 5 — Polish & Deployment | ⏳ Upcoming | Mobile polish, notifications, production deployment |

---

## Documentation

| File | Description |
|------|-------------|
| [Project Specification](docs/01_project_spec.md) | Full requirements, data model, architecture, and phase roadmap |
| [Decision Log](docs/05_decision_log.md) | Running record of why things were built the way they were |

*Additional docs (data model, architecture, feature specs) to be added as phases complete.*

---

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL (local or hosted)
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/denilmoon/InventoryManager.git
cd InventoryManager

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Environment Setup

Create `server/.env`:

```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/ecowater_inventory"
JWT_SECRET="your-long-random-secret"
PORT=3000
```

### Database Setup

```bash
cd server
npx prisma migrate dev
```

### Running Locally

```bash
# Start the backend (from server/)
npm run dev

# Start the frontend (from client/)
npm run dev
```

Backend runs on `http://localhost:3000`  
Frontend runs on `http://localhost:5173`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Auth | JWT + bcrypt |
| File Uploads | multer (local, v1) |

---

## Project Structure

```
InventoryManager/
├── client/               # React frontend (Vite)
├── server/               # Express backend
│   ├── prisma/           # Schema and migrations
│   └── src/
│       ├── helpers/      # Shared utilities (audit log)
│       ├── middleware/   # JWT auth middleware
│       └── routes/       # API route handlers
├── docs/                 # Project documentation
│   ├── 01_project_spec.md
│   ├── 05_decision_log.md
│   └── source_materials/ # Original proposals and spreadsheets
└── README.md
```
