# Data Model

**Version:** 1.0  
**Last Updated:** May 2026  

This document describes the database schema for the Ecowater Inventory Manager. It covers every entity, its fields, its relationships, and the reasoning behind key design decisions. Keep this in sync with `server/prisma/schema.prisma`.

---

## Table of Contents

1. [Entity Overview](#1-entity-overview)
2. [Entity Reference](#2-entity-reference)
   - [User](#user)
   - [Location](#location)
   - [Supplier](#supplier)
   - [Shipper](#shipper)
   - [SupplierShipper](#suppliershipper)
   - [InventoryItem](#inventoryitem)
   - [Tag](#tag)
   - [ItemTag](#itemtag)
   - [StockCount](#stockcount)
   - [Shipment](#shipment)
   - [ShipmentLineItem](#shipmentlineitem)
   - [Reorder](#reorder)
   - [InstallerTeam](#installerteam)
   - [Technician](#technician)
   - [Vehicle](#vehicle)
   - [DispatchLog](#dispatchlog)
   - [DispatchLineItem](#dispatchlineitem)
   - [MonthlyReconciliation](#monthlyreconciliation)
   - [ReconciliationLineItem](#reconciliationlineitem)
   - [AuditLog](#auditlog)
3. [Relationships Map](#3-relationships-map)
4. [Enum Reference](#4-enum-reference)
5. [Key Design Patterns](#5-key-design-patterns)

---

## 1. Entity Overview

| Entity | Purpose |
|--------|---------|
| User | Authenticated system users (admin and staff) |
| Location | Hierarchical storage locations (warehouses, zones, shelves, vehicles) |
| Supplier | Companies the business orders inventory from |
| Shipper | Carriers that deliver orders |
| SupplierShipper | Join table — which shippers a supplier uses |
| InventoryItem | A distinct product type tracked in the system |
| Tag | Flexible label for inventory search and categorization |
| ItemTag | Join table — many-to-many between items and tags |
| StockCount | Current quantity of an item at a specific location |
| Shipment | An inbound order tracked from creation through receiving |
| ShipmentLineItem | Individual item lines on a shipment |
| Reorder | A decision to reorder an item, linked to a resulting shipment |
| InstallerTeam | One of three contracted installation teams |
| Technician | One of eleven employed service technicians |
| Vehicle | Company-owned van assigned to a technician |
| DispatchLog | A recorded outgoing of parts to a team or technician |
| DispatchLineItem | Individual item lines on a dispatch |
| MonthlyReconciliation | Month-end accountability record (business or technician) |
| ReconciliationLineItem | Line-by-line three-way variance check per item |
| AuditLog | Immutable record of every significant system action |

---

## 2. Entity Reference

---

### User

System accounts. Created by admin only — no self-registration.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Display name |
| email | String | Unique — used for login |
| passwordHash | String | bcrypt hashed — never plain text |
| role | Role | ADMIN or STAFF |
| notificationSettings | Json? | User preferences for alerts |
| active | Boolean | Soft disable without deletion |
| resetToken | String? | Time-limited token for password set/reset |
| resetTokenExpiry | DateTime? | Token expiry — checked on use |
| createdAt | DateTime | |

**Notes:**
- On account creation, `passwordHash` is empty and a `resetToken` is generated
- User sets their own password via the token link (first login flow)
- Same token mechanism handles forgot password
- `active: false` prevents login without deleting the record or its history

**Relations:** creates StockCounts, receives Shipments, creates Shipments, requests Reorders, logs Dispatches, reviews Reconciliations, generates AuditLogs

---

### Location

Hierarchical storage location. One table covers the full location tree via self-referencing parent.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | e.g. "Main Warehouse", "Large Shelf 1", "Tech Van — John" |
| locationType | LocationType | WAREHOUSE, ZONE, SHELF, STORAGE_UNIT, VEHICLE |
| parentLocationId | String? | FK to self — null for top-level locations |
| address | String? | Physical address for top-level locations |
| notes | String? | |

**Notes:**
- Top-level locations have `parentLocationId: null`
- Child locations reference their parent — a shelf references a warehouse
- Nesting depth is unlimited — warehouse → zone → shelf → sub-shelf all work
- Tech vans use `locationType: VEHICLE` and are virtual locations for reconciliation tracking only
- Deleting a location is blocked if it has children or active stock counts

**Example hierarchy:**
```
Main Warehouse (WAREHOUSE, no parent)
├── Main Area (ZONE, parent: Main Warehouse)
├── Large Shelf 1 (SHELF, parent: Main Warehouse)
├── Large Shelf 2 (SHELF, parent: Main Warehouse)
└── Closet (ZONE, parent: Main Warehouse)
    ├── Closet Shelf A (SHELF, parent: Closet)
    └── Closet Shelf B (SHELF, parent: Closet)

Grand Prairie Warehouse (WAREHOUSE, no parent)

Tech Van — John Smith (VEHICLE, no parent)
```

---

### Supplier

A company the business purchases inventory from.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | |
| phone | String? | |
| email | String? | |
| website | String? | |
| notes | String? | |

**Relations:** linked to InventoryItems (primary supplier), Shipments, and Shippers via SupplierShipper

---

### Shipper

A carrier that delivers orders from suppliers.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | e.g. "UPS", "FedEx", "Local Freight" |
| notes | String? | |

**Relations:** linked to Suppliers via SupplierShipper, referenced on Shipments

---

### SupplierShipper

Join table recording which shippers a supplier typically uses. Many-to-many.

| Field | Type | Notes |
|-------|------|-------|
| supplierId | FK → Supplier | Composite primary key |
| shipperId | FK → Shipper | Composite primary key |

---

### InventoryItem

A distinct product type. One record per item type — quantities live in StockCount.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | Display name — required |
| sku | String? | Supplier SKU if applicable |
| hasSerialNumbers | Boolean | Whether individual units of this item are serialized |
| tier | ItemTier | TIER_1 (revenue/sell items) or TIER_2 (consumables/supplies) |
| department | Department | INSTALL, SERVICE, MIXED, OTHER |
| reorderThreshold | Int | Low stock alert triggers when total count falls at or below this |
| stockBaseline | Int | Upper target — 1 to 3 months of stock |
| estimatedShippingDays | Int? | Helps time reorder placement |
| reorderLink | String? | Direct URL to supplier order page for this item |
| pricePerPkg | Decimal? | Cost per package |
| unitsPerPkg | Int? | Number of units per package |
| supplierId | FK → Supplier? | Primary supplier for this item |
| imageUrl | String? | Relative path to uploaded image e.g. `/uploads/item-123.jpg` |
| notes | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | Auto-updated on every change |

**Notes:**
- `tier` drives report inclusion — TIER_1 items appear on weekly reports
- `department` drives filtering — items can be MIXED if used by both Install and Service
- `reorderThreshold` applies to total stock across all locations combined
- `hasSerialNumbers` flags whether serial numbers should be collected on receiving/dispatch
- `imageUrl` stores a local file path in v1; will be a CDN URL in Phase 5

**Relations:** has many StockCounts (one per location), ShipmentLineItems, Reorders, DispatchLineItems, ReconciliationLineItems, Tags (via ItemTag)

---

### Tag

A flexible label that can be applied to inventory items for search and filtering.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | Unique — e.g. "RO", "filter", "softener", "install", "eFlow" |

**Notes:**
- Tags are created on first use via `connectOrCreate` — no separate tag management UI needed
- One item can have many tags; one tag can apply to many items
- Tags supplement (not replace) the `department` and `tier` fields
- Searchable — keyword search on inventory checks tag names

---

### ItemTag

Join table for the many-to-many relationship between InventoryItem and Tag.

| Field | Type | Notes |
|-------|------|-------|
| itemId | FK → InventoryItem | Composite primary key |
| tagId | FK → Tag | Composite primary key |

---

### StockCount

The live quantity of a specific item at a specific location. This is the authoritative count.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| itemId | FK → InventoryItem | |
| locationId | FK → Location | |
| quantity | Int | Current count — updated on every receive, dispatch, or adjustment |
| updatedAt | DateTime | Auto-updated |
| updatedById | FK → User? | Last person to change this count |

**Constraints:** `@@unique([itemId, locationId])` — exactly one row per item per location

**Notes:**
- Created via upsert — if no count exists for item+location, one is created
- Updated atomically within database transactions on receive and dispatch operations
- Low stock check compares sum of all StockCount.quantity for an item against its reorderThreshold
- Manual adjustments require a note (captured in AuditLog details)

---

### Shipment

An inbound order tracked through its full lifecycle from creation to receiving.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| supplierId | FK → Supplier | |
| shipperId | FK → Shipper? | May not be known at creation |
| status | ShipmentStatus | PENDING → ORDERED → IN_TRANSIT → RECEIVED (or ISSUE) |
| shipDate | DateTime? | When supplier shipped the order |
| estimatedArrival | DateTime? | Expected delivery date |
| receivedDate | DateTime? | Actual date received — set when status → RECEIVED |
| receivedById | FK → User? | Who received it — set when status → RECEIVED |
| destinationLocationId | FK → Location? | Where stock will be stored |
| notes | String? | Issues, partial shipments, etc. |
| createdAt | DateTime | |
| createdById | FK → User | Who created the shipment record |

**Notes:**
- A Reorder creates a Shipment in PENDING status when an order is placed
- Marking status as RECEIVED triggers StockCount updates for all line items
- ISSUE status flags a problem (short shipment, damage) for follow-up

---

### ShipmentLineItem

Individual item lines on a shipment. Tracks expected vs. actually received quantities.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| shipmentId | FK → Shipment | |
| inventoryItemId | FK → InventoryItem | |
| expectedQty | Int | Quantity on the purchase order |
| receivedQty | Int? | Actual quantity received — null until shipment is received |
| serialNumbers | Json? | Array of serial number strings for serialized items |

---

### Reorder

Records the decision to reorder an item before a shipment is created.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| inventoryItemId | FK → InventoryItem | |
| requestedById | FK → User | Who initiated the reorder |
| requestedAt | DateTime | |
| quantityRequested | Int | |
| status | ReorderStatus | PENDING → ORDERED → RECEIVED (or CANCELLED) |
| shipmentId | FK → Shipment? | Unique — linked once order is placed with supplier |
| notes | String? | |

**Notes:**
- Created automatically when a low stock alert is converted to a reorder
- `shipmentId` is null until the order is actually placed — at that point a Shipment is created and linked
- Status mirrors the linked Shipment status once connected

---

### InstallerTeam

One of three contracted installation teams. Not system users — only referenced in dispatch records.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | e.g. "Team A", "Lopez Crew" |
| contactName | String? | Primary contact person |
| contactPhone | String? | |
| notes | String? | |

---

### Technician

One of eleven employed service technicians. Subject to monthly van reconciliation.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| name | String | |
| employeeId | String? | Internal employee ID if applicable |
| assignedVehicleId | String? | FK → Vehicle — unique (one van per tech) |
| active | Boolean | Set false if tech leaves; preserves dispatch history |
| notes | String? | |

**Notes:**
- Each technician is assigned one company-owned vehicle
- `assignedVehicleId` is `@unique` — enforces one-to-one relationship with Vehicle
- Monthly reconciliation compares: dispatched to this tech vs. reported used (Skedulo) vs. physical van count

---

### Vehicle

A company-owned van assigned to a service technician.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| licensePlate | String | |
| make | String? | |
| model | String? | |
| year | Int? | |
| notes | String? | |

**Relations:** has one Technician (via Technician.assignedVehicleId)

---

### DispatchLog

A recorded outgoing of inventory to an installer team or technician. Immutable after creation.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| dispatchedById | FK → User | Who logged the dispatch |
| dispatchedAt | DateTime | |
| recipientType | RecipientType | INSTALLER_TEAM or TECHNICIAN |
| installerTeamId | FK → InstallerTeam? | Populated when recipientType is INSTALLER_TEAM |
| technicianId | FK → Technician? | Populated when recipientType is TECHNICIAN |
| notes | String? | |

**Notes:**
- Exactly one of `installerTeamId` or `technicianId` should be populated based on `recipientType`
- Records are immutable — no edit endpoint exists
- Corrections are new dispatch log entries with a note explaining the correction
- Creating a DispatchLog decrements StockCount for each line item automatically

---

### DispatchLineItem

Individual item lines within a dispatch.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| dispatchLogId | FK → DispatchLog | |
| inventoryItemId | FK → InventoryItem | |
| quantity | Int | |
| serialNumbers | Json? | Array of serial number strings for serialized items |
| sourceLocationId | FK → Location | Which warehouse/shelf this came from |

---

### MonthlyReconciliation

Month-end accountability record. One per technician per month for van reconciliation, one for business inventory reconciliation.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| type | ReconciliationType | BUSINESS or TECHNICIAN |
| technicianId | FK → Technician? | Null for BUSINESS type |
| month | String | Format: "YYYY-MM" e.g. "2026-04" |
| status | ReconciliationStatus | OPEN → SUBMITTED → REVIEWED (or FLAGGED) |
| createdAt | DateTime | |
| createdById | FK → User | |
| reviewedById | FK → User? | Admin who reviewed |
| notes | String? | |

**Notes:**
- BUSINESS reconciliation covers all warehouse locations
- TECHNICIAN reconciliation is per tech — one record per tech per month
- FLAGGED status means unexplained variance was found and requires follow-up
- Records are permanent — the accountability history must never be deleted

---

### ReconciliationLineItem

Line-by-line three-way variance check for each item in a reconciliation.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| reconciliationId | FK → MonthlyReconciliation | |
| inventoryItemId | FK → InventoryItem | |
| openingQty | Int | Count from prior month's snapshot |
| receivedQty | Int | Total received this month (from Shipment records) |
| dispatchedQty | Int | Total dispatched this month (from DispatchLog records) |
| reportedUsedQty | Int? | From Skedulo CSV import — tech reconciliation only |
| physicalCountQty | Int | Entered during physical count |
| expectedQty | Int | Computed: openingQty + receivedQty - dispatchedQty |
| variance | Int | Computed: expectedQty - physicalCountQty |
| flagged | Boolean | Auto-set true if variance exceeds acceptable threshold |
| notes | String? | Explanation of variance if investigated |

**Three-way check logic:**
```
Business:   opening + received - dispatched = expected  →  vs physical count = variance
Technician: dispatched - reportedUsed = expected on van  →  vs physical van count = variance
```

---

### AuditLog

Immutable record of every significant action in the system. Cannot be edited or deleted by anyone.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| userId | FK → User | Who performed the action |
| action | AuditAction | Enum — see Enum Reference |
| entityType | String | Name of the affected model e.g. "InventoryItem", "Shipment" |
| entityId | String | ID of the affected record |
| details | Json | Snapshot of relevant data at time of action |
| timestamp | DateTime | Auto-set to current time |

**Notes:**
- Written after every CREATE, UPDATE, DELETE, ADJUST, RECEIVE, DISPATCH, LOGIN, IMPORT, REPORT_GENERATED action
- `details` captures a before/after snapshot for updates, or relevant context for other action types
- Audit log write failures are caught and logged to console but never crash the main operation
- No delete or update endpoint exists or should ever be added

---

## 3. Relationships Map

```
User
 ├── creates ──────────────► InventoryItem
 ├── adjusts ──────────────► StockCount
 ├── creates/receives ─────► Shipment
 ├── requests ─────────────► Reorder
 ├── logs ─────────────────► DispatchLog
 ├── creates/reviews ──────► MonthlyReconciliation
 └── generates ────────────► AuditLog

InventoryItem
 ├── has counts at ────────► StockCount (per Location)
 ├── ordered via ──────────► ShipmentLineItem → Shipment
 ├── reordered via ────────► Reorder
 ├── dispatched via ───────► DispatchLineItem → DispatchLog
 ├── reconciled via ───────► ReconciliationLineItem
 ├── supplied by ──────────► Supplier
 └── tagged with ──────────► ItemTag → Tag

Location
 ├── parent of ────────────► Location (children)
 ├── holds ────────────────► StockCount
 ├── receives ─────────────► Shipment (destination)
 └── sourced for ──────────► DispatchLineItem

Supplier
 ├── ships via ────────────► SupplierShipper → Shipper
 ├── supplies ─────────────► InventoryItem
 └── ships on ─────────────► Shipment

Technician
 ├── assigned ─────────────► Vehicle (1:1)
 ├── receives ─────────────► DispatchLog
 └── subject to ───────────► MonthlyReconciliation

InstallerTeam
 └── receives ─────────────► DispatchLog

Shipment
 ├── contains ─────────────► ShipmentLineItem → InventoryItem
 └── fulfills ─────────────► Reorder

DispatchLog
 └── contains ─────────────► DispatchLineItem → InventoryItem

MonthlyReconciliation
 └── contains ─────────────► ReconciliationLineItem → InventoryItem
```

---

## 4. Enum Reference

### Role
| Value | Description |
|-------|-------------|
| ADMIN | Full access including user management, deletions, report generation |
| STAFF | Standard access — inventory, dispatch, shipment operations |

### ItemTier
| Value | Description |
|-------|-------------|
| TIER_1 | Revenue items — equipment, filters, RO systems, faucets. Appear on weekly reports. |
| TIER_2 | Consumable supplies — PEX, fittings, tape, tools. Monthly reports only. |

### Department
| Value | Description |
|-------|-------------|
| INSTALL | Used exclusively by installation teams |
| SERVICE | Used exclusively by service technicians |
| MIXED | Used by both departments |
| OTHER | Miscellaneous items not fitting other categories |

### LocationType
| Value | Description |
|-------|-------------|
| WAREHOUSE | Top-level warehouse building |
| ZONE | Named area within a warehouse |
| SHELF | Physical shelf within a zone or warehouse |
| STORAGE_UNIT | External storage unit |
| VEHICLE | Company vehicle (tech van) — virtual location |

### ShipmentStatus
| Value | Description |
|-------|-------------|
| PENDING | Reorder created, not yet placed with supplier |
| ORDERED | Order placed with supplier |
| IN_TRANSIT | Shipped, en route |
| RECEIVED | Received and stock counts updated |
| ISSUE | Problem with shipment — short, damaged, wrong items |

### ReorderStatus
| Value | Description |
|-------|-------------|
| PENDING | Flagged for reorder, not yet ordered |
| ORDERED | Order placed — linked Shipment exists |
| RECEIVED | Shipment received — stock updated |
| CANCELLED | Reorder cancelled before fulfillment |

### RecipientType
| Value | Description |
|-------|-------------|
| INSTALLER_TEAM | Dispatch to one of three contracted install teams |
| TECHNICIAN | Dispatch to one of eleven employed service techs |

### ReconciliationType
| Value | Description |
|-------|-------------|
| BUSINESS | Month-end warehouse inventory reconciliation |
| TECHNICIAN | Month-end per-technician van reconciliation |

### ReconciliationStatus
| Value | Description |
|-------|-------------|
| OPEN | In progress — physical counts not yet entered |
| SUBMITTED | Physical counts entered, ready for review |
| REVIEWED | Admin has reviewed — no significant issues |
| FLAGGED | Unexplained variance found — requires follow-up |

### AuditAction
| Value | Description |
|-------|-------------|
| CREATE | A new record was created |
| UPDATE | An existing record was modified |
| DELETE | A record was deleted |
| LOGIN | A user logged in |
| RECEIVE | A shipment was received and stock updated |
| DISPATCH | Parts were dispatched to a team or tech |
| ADJUST | A stock count was manually adjusted |
| IMPORT | Data was imported from an external source (CSV) |
| REPORT_GENERATED | A report snapshot was generated |

---

## 5. Key Design Patterns

### StockCount is always live
Stock counts are never cached or batched. Every receive, dispatch, and manual adjustment hits the `StockCount` table immediately within a database transaction. The number in the database is always the current number.

### Quantities belong to StockCount, not InventoryItem
`InventoryItem` holds no quantity fields. All quantities live in `StockCount` with a location reference. This is what makes multi-location tracking work cleanly — Grand Prairie, Main Warehouse, and Iowa are all just different `locationId` values pointing at the same item.

### Location hierarchy via self-reference
The `Location` table references itself via `parentLocationId`. This single pattern handles the entire location tree — top-level warehouses, zones within them, shelves within zones — without separate tables per level. Adding Iowa in a future phase is just a new row.

### Dispatch records are immutable
No update or delete route exists for `DispatchLog` or `DispatchLineItem`. This is intentional — the accountability requirement (especially given prior theft concerns) means the dispatch record must be a permanent, tamper-proof log. Corrections are new entries with notes.

### AuditLog never crashes the caller
The `writeAuditLog` helper wraps its database write in a try/catch. If the audit write fails, it logs the error but returns without throwing. The operation the user was performing succeeds regardless. Audit log integrity matters but never at the cost of the user's actual action.

### Tags use connectOrCreate
When creating or updating tags on an item, the system uses Prisma's `connectOrCreate` — if a tag with that name already exists, it connects to it; if not, it creates it. This means tags are self-managing and don't require a separate admin interface to maintain a tag list.

### Reconciliation values are computed, not stored live
`expectedQty` and `variance` on `ReconciliationLineItem` are computed at reconciliation time from the dispatch logs and shipment records for the month, then stored as snapshot values. They are not dynamically recalculated — the snapshot is the historical record.
