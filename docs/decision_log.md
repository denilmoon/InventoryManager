# Decision Log

| Date | Decision | Choice | Reason |
|------|----------|--------|--------|
| May 2026 | Item categorization | Tag system added alongside department enum | Department enum covers operational reporting needs; tags provide flexible search and categorization without schema changes |
| May 2026 | Item photos | imageUrl field added to InventoryItem | Helps users identify unfamiliar parts; local file storage via multer for v1, cloud storage (Cloudinary) planned for Phase 5 deployment |
| May 2026 | Prisma version | Stayed on Prisma 6, avoided v7 | npm audit --force upgraded to v7 which introduced breaking changes; downgraded to maintain stability |