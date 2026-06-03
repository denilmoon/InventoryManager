# Decision Log

Running record of significant decisions made during design and development.  
Newest entries at the top.

---

| Date | Decision | Choice | Reason |
|------|----------|--------|--------|
| June 2026 | Region toggle (Texas/Iowa/Future) | Deferred to future phase | Architecture already supports regions via hierarchical locations. Iowa workflows are unknown — building the toggle before onboarding Iowa means building the wrong thing. Revisit when Iowa is ready to onboard. Noted in Future Improvements. |
| June 2026 | Dispatch button placement | Top of inventory page header alongside Add Item | Boss feedback confirmed dispatch is a primary daily action (morning for install teams, afternoon for techs). Multi-step dialog: step 1 picks recipient, step 2 builds item list. Builds in Phase 3 alongside shipment pipeline. |
| June 2026 | Component library | Shadcn/ui with Tailwind, minimal custom CSS | Mobile responsiveness, professional UI, and build speed all required simultaneously. Shadcn generates code into the project so components are fully customizable. Custom CSS deferred to Phase 5 for brand-specific theming (blue water theme). |
| June 2026 | Toast notifications | Sonner instead of toast | Nova preset for Shadcn does not include a toast component — uses Sonner instead, which is the modern replacement in the Shadcn ecosystem. |
| June 2026 | Development browser | Chrome for local development | Edge had inconsistent behavior with localhost during development. Chrome handles local development more reliably. Other browsers tested at deployment in Phase 5. |
| May 2026 | Prisma version | Stayed on Prisma 6 | `npm audit --force` upgraded to v7 which introduced breaking datasource changes (url field in schema.prisma no longer supported); downgraded to maintain stability. Revisit v7 migration in a future phase. |
| May 2026 | Item photos | `imageUrl` String? field on InventoryItem, multer handles uploads | Helps users identify unfamiliar parts without calling the warehouse manager. Local file storage for v1 keeps it simple. Cloudinary or S3 planned for Phase 5 deployment. |
| May 2026 | Item categorization | Tag system (Tag + ItemTag) added alongside existing department enum | Department enum (INSTALL, SERVICE, MIXED, OTHER) covers operational reporting needs. Tags provide flexible search and finer categorization — one item can have multiple tags — without schema changes every time a new category is needed. |
| May 2026 | Auth method | JWT + Express middleware | Prior experience from school project; standard pattern for REST APIs; stateless and scales well |
| May 2026 | Password hashing | bcrypt (cost factor 12) | Industry standard; never store plain passwords |
| May 2026 | User creation | Admin-created accounts only, no open registration | Small internal team of known users; open registration is a security risk for an internal operations tool |
| May 2026 | Password setup flow | User sets own password via time-limited token link | Security best practice; admin never knows any user's password |
| May 2026 | ORM | Prisma 6 | Prior experience; strong migration tooling; readable schema file |
| May 2026 | Database | PostgreSQL (local for dev, hosted for production) | Relational data with complex foreign key relationships; well-supported with Prisma |
| May 2026 | Source of truth | This app owns inventory counts | Salesforce counts are known to be inaccurate; Salesforce receives weekly export from this app, not the other way around |
| May 2026 | Real-time counts | Database transaction on every receive/dispatch | Simple and always accurate; no background sync or cache invalidation needed at this scale |
| May 2026 | Location model | Hierarchical self-referencing table (parentLocationId) | Supports arbitrary nesting (warehouse → zone → shelf); adding new locations is a new row, not a schema change; Iowa and future sites slot in automatically |
| May 2026 | Iowa | Out of scope v1 | Separate operation with unknown internal processes; architecture supports adding it as a location group later |
| May 2026 | FIFO | Not enforced v1 | Manual entry without barcode scanning makes FIFO impractical to track reliably; architecture supports adding it when scanning is introduced |
| May 2026 | Barcode scanning | Not in v1 | Adds hardware dependency; manual entry is sufficient for current team size and faster to implement |
| May 2026 | Skedulo integration | Monthly CSV import for v1 | API integration is future work; CSV is immediately achievable and sufficient for month-end reconciliation |
| May 2026 | Tech van tracking | Virtual locations for reconciliation only, not live-tracked | Van contents are not monitored daily; used as a reference point for month-end three-way variance check |
| May 2026 | Dispatch records | Immutable after submission | Accountability requirement given prior theft incident; corrections must be new log entries, not edits |
| May 2026 | Audit log | Single AuditLog table with entityType + entityId | Flexible and queryable; covers all entity types without maintaining separate log tables per model |
| May 2026 | Report storage | Saved timestamped snapshots | Historical record is the core purpose of reporting; dynamic-only queries lose the past and can't show trends |
| May 2026 | Item tiers | Tier 1 (revenue items) / Tier 2 (consumables) | Drives which items appear on weekly reports and sets alert priority automatically without manual configuration per item |
