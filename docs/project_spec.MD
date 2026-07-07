# Ecowater Inventory Manager — Project Specification

**Version:** 1.3  
**Author:** Denilson Montalvo 
**Started:** September 2025  
**Last Updated:** June 2026  
**Repository:** https://github.com/denilmoon/InventoryManager  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Context](#2-business-context)
3. [Target Users](#3-target-users)
4. [Goals & Success Criteria](#4-goals--success-criteria)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [System Architecture](#7-system-architecture)
8. [Data Model](#8-data-model)
9. [Application Sitemap & Pages](#9-application-sitemap--pages)
10. [Operational Workflows](#10-operational-workflows)
11. [Reporting System](#11-reporting-system)
12. [User Roles & Permissions](#12-user-roles--permissions)
13. [Tech Stack](#13-tech-stack)
14. [Phase Roadmap](#14-phase-roadmap)
15. [Out of Scope (v1)](#15-out-of-scope-v1)
16. [Future Improvements](#16-future-improvements)
17. [Decisions Log Summary](#17-decisions-log-summary)

---

## 1. Project Overview

The **Ecowater Inventory Manager** is a mobile-responsive web application designed to digitize, centralize, and automate the inventory management, dispatch logging, shipment tracking, and reporting workflows of a water softening company. It replaces a fragmented paper-based and spreadsheet-based system with a single source of truth accessible by all authorized users from any device.

The system is designed to be the authoritative record for all inventory counts, movements, and reports. External platforms (Salesforce, Skedulo) are treated as secondary references or data import sources — not sources of truth.

---

## 2. Business Context

### The Problem

The company currently manages inventory through a combination of:
- Manual paper counts performed weekly and monthly
- A master Excel spreadsheet maintained by one person
- Inaccurate Salesforce inventory counts
- Phone calls to locate items in the warehouse
- Paper-based receiving logs from drivers and shipping notices
- No reliable mechanism to detect inventory shrinkage or theft

This creates several operational failures:
- Stockouts on critical revenue items
- Inability to reconcile what was dispatched vs. what was used vs. what is physically present
- Single point of failure (one person knows where everything is)
- No accountability trail when inventory discrepancies occur
- Time-consuming manual reporting that duplicates work

### The Solution

A purpose-built web application that:
- Maintains real-time inventory counts across all locations
- Tracks the full inbound pipeline (reorder → shipment → receiving)
- Tracks the full outbound pipeline (dispatch to installer teams and service technicians)
- Generates weekly and monthly reports automatically from live data
- Enables a three-way reconciliation at month-end to detect discrepancies
- Makes item locations findable by anyone without calling the warehouse manager
- Creates an immutable audit trail for every action

### Item Tiers

Inventory is classified into two tiers that drive reporting and alert priority:

**Tier 1 — Revenue Items (highest priority):**  
Equipment and accessories the company sells and installs. Includes water softeners, RO systems, faucets, filters, membranes, filter housings, and associated components. These items appear on weekly reports and have the tightest tracking requirements.

**Tier 2 — Consumable Supplies:**  
Installation materials such as PEX pipe, fittings, connectors, foam insulation, tools, and tape. Important for operations but not directly revenue-generating. Tracked for inventory purposes and appear on monthly reports. Low stock alerts apply to all items regardless of tier.

---

## 3. Target Users

| Name | Role | Involvement |
|------|------|-------------|
| Me | Admin | Designs, builds, and maintains the system |
| Anton | Department Head | Requirements input, system user |
| Kris | Department Head | Requirements input, system user |
| Liz | Department Head | Requirements input, system user |
| Myrian | Department Head | Requirements input; 3/6/2026 updated requirements meeting |
| Service Technicians (11) | Staff Users | Log dispatches, subject to monthly reconciliation |
| Installer Teams (3) | External (contracted) | Receive dispatched parts, not system users |

---

## 4. Goals & Success Criteria

| Goal | Success Criteria |
|------|-----------------|
| Replace paper inventory counts | No paper count sheets in use within 60 days of launch |
| Eliminate "where is X" calls | Any user can find any item's location in the app in under 3 clicks |
| Prevent stockouts on Tier 1 items | Zero unplanned stockouts on Tier 1 items within 90 days of launch |
| Automate weekly reporting | Weekly report generated in under 5 minutes vs. current manual process |
| Enable accountability reconciliation | Month-end variance per technician documented and reviewable |
| Replace paper receiving logs | All inbound shipments logged digitally within 30 days of launch |

---

## 5. Functional Requirements

### Authentication & Users
1. Admin creates user accounts with a temporary password
2. Users set their own password on first login via a time-limited link
3. Users can update their own password at any time from User Settings
4. Users can request a password reset via email if they forget it
5. The system enforces role-based access control (ADMIN | STAFF)
6. Certain actions (delete, user management, report generation) require ADMIN role

### Inventory
7. Users can create inventory items with all defined attributes
8. Users can edit inventory items and their attributes
9. Admin can delete inventory items
10. Users can search inventory by keyword
11. Users can sort and filter inventory by category, department, tier, location, and stock status
12. The system displays current stock counts per location for each item
13. The system flags items below their reorder threshold with a visible low stock alert
14. Low stock alerts apply to all items regardless of tier
15. Users can manually adjust stock counts (increase or decrease) with a required note
16. Every stock change is recorded in the audit log with user, timestamp, old value, and new value

### Shipment & Receiving
17. Users can create a reorder record for any item, which initiates a shipment in PENDING status
18. Shipments progress through statuses: PENDING → ORDERED → IN_TRANSIT → RECEIVED → ISSUE
19. Users can log receiving details: received date, received quantity, who received it, where stored, notes
20. When a shipment is marked RECEIVED, stock counts update automatically
21. Users can attach serial numbers to received items where applicable
22. Users can search, sort, and filter shipment logs by status, supplier, date, and item

### Dispatch
23. Users can log a dispatch to an installer team or service technician
24. Dispatch logs record: recipient, items, quantities, source location, serial numbers if applicable, who logged it, timestamp
25. When a dispatch is logged, stock counts decrement automatically from the source location
26. Dispatch logs are immutable after submission — corrections require a new log entry with a note
27. Users can search, sort, and filter dispatch logs by recipient, date, and item

### Reorder Management
28. The system surfaces reorder suggestions when any item falls below its reorder threshold
29. A reorder suggestion can be converted to an active reorder in one action
30. Active reorders are visible on the Reorder Log page with status tracking
31. Reorder records link to the resulting shipment once an order is placed

### Reporting
32. The system generates a weekly report for Tier 1 items showing current counts, thresholds, baselines, and reorder flags
33. The system generates a monthly business reconciliation report per location
34. The system generates a monthly technician reconciliation report per technician
35. All reports are saved as timestamped snapshots and browsable in report history
36. Users can search and filter past reports by type, date, and subject
37. Admin can manually trigger report generation at any time

### Audit & Accountability
38. Every create, update, delete, login, dispatch, and receiving action is recorded in the audit log
39. Audit log entries include: user, action type, entity type, entity ID, timestamp, and a snapshot of what changed
40. Audit log entries cannot be edited or deleted by any user including admin

---

## 6. Non-Functional Requirements

| # | Requirement |
|---|-------------|
| 1 | Search results return within 2 seconds |
| 2 | System supports up to 5 concurrent users (scalable to more) |
| 3 | UI is simple, compact, and practical — meaningful actions in under 3 clicks |
| 4 | Application is fully usable on mobile phone browsers |
| 5 | Passwords are hashed using bcrypt — never stored in plain text |
| 6 | All protected routes require valid JWT authentication |
| 7 | System prevents unauthorized access based on role |
| 8 | Data is preserved through application updates and restarts |
| 9 | System prevents data loss during crashes (database transactions used for multi-step operations) |
| 10 | Architecture is modular and scalable — new locations, users, and features can be added without schema rewrites |

---

## 7. System Architecture

### Architectural Pattern
Layered (3-tier) architecture:
- **Presentation Layer** — React frontend, mobile-responsive
- **Business Logic Layer** — Node.js + Express REST API
- **Data Layer** — PostgreSQL database via Prisma ORM

### Authentication
JWT (JSON Web Tokens) with Express middleware. Tokens issued on login, verified on every protected route. Passwords hashed with bcrypt before storage. Password reset implemented via time-limited signed tokens sent to email.

### Real-Time Counts
Stock counts are always current in the database — every receive and dispatch operation updates `StockCount` immediately within a database transaction. No batch sync required. The UI reads current counts on page load.

### Data Flow
```
User (browser/phone)
    ↕ HTTPS
React Frontend (client/)
    ↕ REST API calls with JWT
Express Backend (server/)
    ↕ Prisma ORM
PostgreSQL Database
```

### Source of Truth
This application is the authoritative source for all inventory data. Salesforce receives a weekly export from this system — it does not feed into it. Skedulo job data is imported monthly via CSV for technician reconciliation.

---

## 8. Data Model

### InventoryItem
Core product record. One per distinct item type.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Display name |
| sku | String? | Nullable — not all items have SKUs |
| hasSerialNumbers | Boolean | Whether this item type is serialized |
| tier | Enum | TIER_1 (revenue items) or TIER_2 (consumables) |
| department | Enum | INSTALL, SERVICE, MIXED, OTHER |
| reorderThreshold | Int | Triggers low stock alert when count falls below |
| stockBaseline | Int | Upper target — 1 to 3 months of stock |
| estimatedShippingDays | Int? | Helps time reorders |
| reorderLink | String? | URL to supplier order page |
| pricePerPkg | Decimal? | Cost per package |
| unitsPerPkg | Int? | Units per package |
| supplierId | FK | Primary supplier |
| imageUrl | String? | Path to uploaded image file (local storage v1, cloud in Phase 5) |
| notes | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| tags | ItemTag[] | Many-to-many relation to Tag model |

### Tag
Flexible labels for inventory items. Many items can share a tag; one item can have many tags.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | Unique tag name e.g. "RO", "filter", "install", "softener" |
| items | ItemTag[] | |

### ItemTag
Join table linking inventory items to tags.

| Field | Type |
|-------|------|
| itemId | FK → InventoryItem |
| tagId | FK → Tag |

### StockCount
Current quantity of an item at a specific location. One row per item + location combination.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| itemId | FK → InventoryItem | |
| locationId | FK → Location | |
| quantity | Int | Current count — always live |
| updatedAt | DateTime | |
| updatedBy | FK → User | Last person to change this count |

### Location
Hierarchical location model. Supports warehouses, zones, shelves, and virtual locations (tech vans).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | e.g. "Main Warehouse", "Closet Shelf 3", "Tech Van - [Name]" |
| locationType | Enum | WAREHOUSE, ZONE, SHELF, STORAGE_UNIT, VEHICLE |
| parentLocationId | FK → self? | Nullable — child locations reference parent |
| address | String? | For top-level locations |
| notes | String? | |

**Initial location hierarchy (to be configured during setup):**
```
Business Site
├── Main Warehouse
│   ├── Main Area (with subareas)
│   ├── Large Shelf 1
│   ├── Large Shelf 2
│   └── Closet
│       └── [Labeled shelves]
├── Sub-Warehouse
├── Storage Unit A (dedicated)
└── Storage Unit B (overflow)

Grand Prairie Warehouse

Iowa (future)

Tech Vans (11 — virtual, used for reconciliation)
```

### Supplier
| Field | Type |
|-------|------|
| id | UUID |
| name | String |
| phone | String? |
| email | String? |
| website | String? |
| notes | String? |

### Shipper
| Field | Type |
|-------|------|
| id | UUID |
| name | String |
| notes | String? |

### SupplierShipper
Join table linking which shippers a supplier uses.

| Field | Type |
|-------|------|
| supplierId | FK |
| shipperId | FK |

### Shipment
Tracks an inbound order from creation through receiving.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| supplierId | FK → Supplier | |
| shipperId | FK → Shipper? | |
| status | Enum | PENDING, ORDERED, IN_TRANSIT, RECEIVED, ISSUE |
| shipDate | DateTime? | |
| estimatedArrival | DateTime? | |
| receivedDate | DateTime? | |
| receivedBy | FK → User? | |
| destinationLocationId | FK → Location? | |
| notes | String? | |
| createdAt | DateTime | |
| createdBy | FK → User | |

### ShipmentLineItem
Individual items on a shipment.

| Field | Type |
|-------|------|
| id | UUID |
| shipmentId | FK → Shipment |
| inventoryItemId | FK → InventoryItem |
| expectedQty | Int |
| receivedQty | Int? |
| serialNumbers | JSON? |

### Reorder
Pre-shipment record capturing the decision to reorder.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| inventoryItemId | FK | |
| requestedBy | FK → User | |
| requestedAt | DateTime | |
| quantityRequested | Int | |
| status | Enum | PENDING, ORDERED, RECEIVED, CANCELLED |
| shipmentId | FK → Shipment? | Linked once order is placed |
| notes | String? | |

### InstallerTeam
Three contracted installation teams.

| Field | Type |
|-------|------|
| id | UUID |
| name | String |
| contactName | String? |
| contactPhone | String? |
| notes | String? |

### Technician
Eleven employed service technicians.

| Field | Type |
|-------|------|
| id | UUID |
| name | String |
| employeeId | String? |
| assignedVehicleId | FK → Vehicle? |
| active | Boolean |
| notes | String? |

### Vehicle
Company-owned vans assigned to technicians.

| Field | Type |
|-------|------|
| id | UUID |
| licensePlate | String |
| make | String? |
| model | String? |
| year | Int? |
| assignedTechId | FK → Technician? |
| notes | String? |

### DispatchLog
Records outgoing parts to an installer team or technician.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| dispatchedBy | FK → User | Who logged the dispatch |
| dispatchedAt | DateTime | |
| recipientType | Enum | INSTALLER_TEAM or TECHNICIAN |
| installerTeamId | FK? | Populated if team dispatch |
| technicianId | FK? | Populated if tech dispatch |
| notes | String? | |

### DispatchLineItem
Individual items in a dispatch.

| Field | Type |
|-------|------|
| id | UUID |
| dispatchLogId | FK → DispatchLog |
| inventoryItemId | FK → InventoryItem |
| quantity | Int |
| serialNumbers | JSON? |
| sourceLocationId | FK → Location |

### MonthlyReconciliation
Month-end accountability record. One per technician per month, and one for business inventory per month.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| type | Enum | BUSINESS or TECHNICIAN |
| technicianId | FK? | Null for business reconciliation |
| month | String | Format: "YYYY-MM" |
| status | Enum | OPEN, SUBMITTED, REVIEWED, FLAGGED |
| createdAt | DateTime | |
| reviewedBy | FK → User? | |
| notes | String? | |

### ReconciliationLineItem
Line-by-line breakdown of the three-way check.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| reconciliationId | FK | |
| inventoryItemId | FK | |
| openingQty | Int | Count at start of month |
| receivedQty | Int | From shipment logs |
| dispatchedQty | Int | From dispatch logs |
| reportedUsedQty | Int? | From Skedulo import (tech only) |
| physicalCountQty | Int | Entered during physical count |
| expectedQty | Int | Computed: opening + received - dispatched |
| variance | Int | Computed: expected - physicalCount |
| flagged | Boolean | Auto-set if variance exceeds threshold |
| notes | String? | |

### User
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | |
| email | String | Unique |
| passwordHash | String | bcrypt |
| role | Enum | ADMIN or STAFF |
| notificationSettings | JSON? | Low stock alerts, receiving alerts |
| active | Boolean | |
| createdAt | DateTime | |

### AuditLog
Immutable record of every significant action. Cannot be edited or deleted.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| userId | FK → User | Who performed the action |
| action | Enum | CREATE, UPDATE, DELETE, LOGIN, RECEIVE, DISPATCH, ADJUST, IMPORT, REPORT_GENERATED |
| entityType | String | "InventoryItem", "Shipment", "DispatchLog", etc. |
| entityId | String | ID of the affected record |
| details | JSON | Snapshot of what changed |
| timestamp | DateTime | |

---

## 9. Application Sitemap & Pages

```
Login / First-Time Password Setup
    └── Dashboard (Home)
            ├── Inventory List
            ├── Report Page
            ├── Shipment Log
            ├── Reorder Log
            ├── User Settings
            └── [AI Insights — future]
```

### Dashboard
- Low stock alerts for all flagged items (all tiers)
- Recent activity feed (last N audit log entries)
- Quick stats: total items, items below threshold, pending shipments, open reorders

### Inventory List
- Full searchable, sortable, filterable item list
- Columns: name, department, tier, location, current count, threshold, status
- Actions: Create item, Edit item, Delete item (admin only), Adjust stock count
- Filter by: department, tier, location, stock status (OK / LOW / OUT)
- Item detail view shows counts per location, supplier info, reorder link, audit history

### Shipment Log
- View all shipments with status indicators
- Create shipment log (from reorder or standalone)
- Update shipment through status pipeline to RECEIVED
- Receive a shipment: enter received quantities, serial numbers, storage location
- Search/sort/filter by: status, supplier, shipper, date, item

### Reorder Log
- View all active reorders with status
- Create a new reorder manually
- Convert a low-stock suggestion into a reorder
- Link reorder to a shipment when order is placed
- Search/sort/filter by: status, item, date, supplier

### Report Page
- View and generate weekly Tier 1 report
- View and generate monthly business reconciliation
- View and generate monthly technician reconciliation (with CSV import for Skedulo data)
- Browse past report snapshots with search and filter
- CRUD for manual report notes and annotations

### User Settings
- Update own password
- Configure notification preferences (low stock alerts, receiving confirmations)

---

## 10. Operational Workflows

### Inbound (Procurement Pipeline)
```
1. Item falls below reorder threshold → alert surfaces on dashboard
2. User creates a Reorder record (PENDING)
3. Order placed with supplier → Reorder status → ORDERED, Shipment created (IN_TRANSIT)
4. Shipping notice received → Shipment estimated arrival recorded
5. Shipment arrives → User logs receiving: actual quantities, serial numbers, storage location
6. Shipment status → RECEIVED → StockCount increments automatically
7. AuditLog entry created
```

### Outbound (Dispatch Pipeline)
```
1. User creates DispatchLog: recipient (team or tech), items, quantities, source location
2. StockCount decrements automatically per item per source location
3. Serial numbers recorded if applicable
4. AuditLog entry created
5. Dispatch log is immutable — corrections logged as new entries
```

### Monthly Reconciliation — Business Inventory
```
1. At month end, admin triggers business reconciliation
2. System pulls: opening count (last snapshot) + received this month - dispatched this month = expected
3. Admin enters physical counts per location per item
4. System computes variance per item
5. Items with variance outside acceptable margin are flagged
6. Reconciliation saved as snapshot with REVIEWED or FLAGGED status
7. Flagged items carry forward for investigation
```

### Monthly Reconciliation — Technician Vans
```
1. Admin imports monthly Skedulo CSV (what each tech reported using per job)
2. System pulls dispatch logs per tech for the month
3. Admin enters physical van counts per tech
4. System computes three-way variance: dispatched - reported used - physical count
5. Significant variance flagged per tech and per item
6. Reconciliation saved as permanent accountability record
```

---

## 11. Reporting System

### Weekly Report (Tier 1 Items)
Generated every week. Replaces Friday Salesforce submission.

**Contents:**
- Current count per location for all Tier 1 items
- Reorder threshold and stock baseline for each
- Status: OK / LOW / CRITICAL / OUT
- Items needing immediate reorder highlighted
- Comparison to previous week's snapshot

### Monthly Business Reconciliation Report
Generated at month end. Replaces paper warehouse count sheets.

**Contents (per item):**
- Opening count (prior month snapshot)
- Total received this month
- Total dispatched this month
- Expected count (computed)
- Physical count (entered)
- Variance (flagged if outside margin)

**Scope:** All warehouse and storage unit locations

### Monthly Technician Reconciliation Report
Generated at month end per technician. Accountability record.

**Contents (per tech, per item):**
- Total dispatched to this tech this month
- Total reported used this month (from Skedulo import)
- Physical van count (entered)
- Variance — three-way check
- Flagged if variance is unexplained

**Note:** Tech van counts are estimates based on dispatch and usage data. Physical counts are verified at month end. Persistent unexplained variance is a documented accountability record.

---

## 12. User Roles & Permissions

| Action | STAFF | ADMIN |
|--------|-------|-------|
| View inventory | ✅ | ✅ |
| Create/edit inventory items | ✅ | ✅ |
| Delete inventory items | ❌ | ✅ |
| Adjust stock counts | ✅ | ✅ |
| Create/update dispatch logs | ✅ | ✅ |
| Create/update shipment logs | ✅ | ✅ |
| Mark shipments received | ✅ | ✅ |
| View reports | ✅ | ✅ |
| Generate reports | ❌ | ✅ |
| Create/manage user accounts | ❌ | ✅ |
| View audit log | ❌ | ✅ |
| Delete any record | ❌ | ✅ |

---

## 13. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React | Mobile-responsive, no prior experience — ramp up during Phase 1 |
| Backend | Node.js + Express | Prior experience from school project |
| Database | PostgreSQL | Relational, well-suited for this data model |
| ORM | Prisma | Prior experience; handles migrations and type safety |
| Auth | JWT + bcrypt | JWT middleware on Express routes, bcrypt for password hashing |
| Deployment | TBD | Local development first; production server TBD in Phase 5 |
| CSV Import | TBD | Node.js CSV parsing library (e.g. `csv-parse`) for Skedulo imports |

---

## 14. Phase Roadmap

### Phase 1 — Foundation ✅ Complete
**Goal:** Working auth, project scaffold, database connected  
**Deliverables:**
- Monorepo setup: `client/` (React) and `server/` (Express) folders
- Full Prisma schema based on data model above
- PostgreSQL connected locally
- JWT login/logout endpoints
- Admin account creation endpoint
- First-login password set flow (time-limited token)
- Password reset via email flow
- Role-based route middleware
- Basic project README updated

**Done when:** You can log in, create user accounts, and users can set their own passwords.

---

### Phase 2 — Inventory Core ✅ Complete
**Goal:** Inventory list fully functional, locations configured, low stock alerts working  
**Deliverables:**
- Inventory item CRUD API + React UI
- Location setup (admin adds/edits locations)
- StockCount per location, live updates
- Stock adjust action (manual count correction with required note)
- Search, sort, filter on inventory list
- Low stock alert logic for all items
- Dashboard with alert summary and recent activity
- Audit log for all inventory actions
- Supplier routes
- Add/edit item dialog with tags, tier, department, supplier
- Stock adjust dialog with location selector, change indicator, required note
- Image upload field on inventory items

**Done when:** Any user can open the app on their phone, find an item, see where it is and how many are in stock, and get alerted when something is low.

---

### Phase 3 — Shipment & Dispatch ✅ Complete
**Goal:** Full inbound and outbound pipeline digital  
**Deliverables:**
- Supplier and Shipper CRUD
- Shipment log pipeline (PENDING → RECEIVED)
- Shipment line items with serial number support
- Receiving action (updates StockCount automatically via transaction)
- Reorder log: create, status tracking, low stock suggestions
- Reorder suggestion from low stock alert (one-click convert)
- Dispatch dialog — multi-step: recipient → items → confirm
- Dispatch decrements StockCount automatically via transaction
- Technician, InstallerTeam, Vehicle records
- Dispatch button in inventory page header
- Confirm dialogs on all irreversible status changes

**Done when:** Receiving a shipment and logging a dispatch both update inventory counts automatically. Reordering is prompted before stockouts occur.
**Goal:** Full inbound and outbound pipeline digital  
**Deliverables:**
- Supplier and Shipper CRUD
- Shipment log pipeline (PENDING → RECEIVED)
- Shipment line items with serial number support
- Receiving action (updates StockCount automatically)
- Reorder log: create, status tracking, link to shipment
- Reorder suggestion from low stock alert (one-click convert)
- Dispatch log CRUD for installer teams and technicians
- Dispatch decrements StockCount automatically
- Technician, InstallerTeam, Vehicle records

**Done when:** Receiving a shipment and logging a dispatch both update inventory counts automatically. Reordering is prompted before stockouts occur.

---

### Phase 4 — Reports & Reconciliation 🔄 Up Next
**Goal:** All paper reports replaced by digital snapshots  
**Deliverables:**
- Weekly Tier 1 report generation and snapshot save
- Monthly business reconciliation (physical count entry + variance computation)
- Monthly technician reconciliation (CSV import for Skedulo data + physical count entry + variance)
- Variance flagging with configurable threshold
- Report history browser (search, filter, view past snapshots)
- Report page UI

**Done when:** Month-end close is done entirely in the app. Every paper report has a digital equivalent. Technician variance is documented and permanent.

---

### Phase 5 — Polish & Deployment
**Goal:** Production-ready, mobile-polished, live for the team  
**Deliverables:**
- Full mobile-responsive CSS pass on all pages
- Email notifications: low stock alerts, receiving confirmations
- Input validation on all forms (frontend + backend)
- Error handling and empty state UI throughout
- Rate limiting on auth endpoints
- Environment variable security audit
- Performance check: search under 2 seconds
- Production deployment (server TBD)
- User onboarding: create accounts for all staff

**Done when:** The app is live, accessible to the full team, and in daily use replacing paper processes.

---

## 15. Out of Scope (v1)

- Iowa location (architecture supports it, configuration deferred)
- Barcode / QR scanning
- FIFO enforcement (architecture supports adding it later)
- Salesforce API integration (weekly export is manual for now)
- Skedulo API integration (monthly import is CSV for now)
- AI insights feature (menu placeholder only)
- Mobile native app (mobile-responsive web covers the need)
- Multi-company / multi-tenant support

---

## 16. Future Improvements

| Feature | Notes |
|---------|-------|
| Iowa expansion | Add as a location group with its own user accounts |
| Salesforce export | Automated weekly push replacing manual process |
| Skedulo API integration | Automatic job data pull for reconciliation |
| AI Insights | Natural language inventory queries, trend analysis, smart reorder suggestions |
| Barcode scanning | Phone camera for receiving and dispatch |
| FIFO enforcement | First-in first-out tracking for serialized items |
| Advanced analytics | Cost per month, technician usage trends, seasonal demand |
| Supplier portal | Send reorders directly from the app |

---

## 17. Decisions Log Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth method | JWT + Express middleware | Prior experience; standard pattern for REST APIs |
| Password hashing | bcrypt | Industry standard; never store plain passwords |
| User creation | Admin-created accounts only | Small internal team; no open registration needed |
| Password setup | User sets own password via first-login link | Security best practice; admin never knows passwords |
| ORM | Prisma | Prior experience; strong TypeScript support and migration tooling |
| Database | PostgreSQL | Relational data with complex relationships; well-supported with Prisma |
| Source of truth | This app | Salesforce counts are unreliable; app owns the authoritative numbers |
| Real-time counts | Database transactions on every receive/dispatch | Simple and accurate; no sync layer needed at this scale |
| Location model | Hierarchical self-referencing table | Supports arbitrary nesting; new locations are new rows not schema changes |
| Iowa | Out of scope v1 | Separate operation, unknown processes; architecture scales to include it |
| FIFO | Not enforced v1 | Manual entry makes it impractical without barcode scanning |
| Barcode scanning | Not in v1 | Adds hardware dependency; manual entry works for current team size |
| Skedulo data | Monthly CSV import | API integration is future work; CSV is immediately achievable |
| Tech vans | Virtual locations for reconciliation only | Not live-tracked; used as reference point for month-end variance |
| Dispatch records | Immutable after submission | Accountability requirement; corrections are new log entries |
| Audit log | Single table with entityType/entityId | Flexible, queryable, covers all entities without separate tables |
| Report storage | Saved snapshots | Historical record is the point; dynamic queries lose the past |
| Item tiers | Tier 1 (revenue) / Tier 2 (consumables) | Drives report inclusion and alert priority automatically |
| Item categorization | Tag system added alongside department enum | Department enum covers operational reporting needs; tags provide flexible search and finer categorization without schema changes |
| Item photos | imageUrl field on InventoryItem, multer for uploads | Helps users identify unfamiliar parts; local file storage for v1, Cloudinary planned for Phase 5 |
| Prisma version | Stayed on Prisma 6 | npm audit --force upgraded to v7 which introduced breaking datasource changes; downgraded to maintain stability |
