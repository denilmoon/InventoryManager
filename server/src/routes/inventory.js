const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const writeAuditLog = require('../helpers/auditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────
// MULTER SETUP FOR IMAGE UPLOADS
// ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `item-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ─────────────────────────────────────────
// HELPER — check low stock
// ─────────────────────────────────────────
const checkLowStock = async (itemId) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: { stockCounts: true },
  });

  if (!item) return null;

  const totalStock = item.stockCounts.reduce((sum, sc) => sum + sc.quantity, 0);
  const isLow = totalStock <= item.reorderThreshold;

  return {
    itemId: item.id,
    itemName: item.name,
    totalStock,
    reorderThreshold: item.reorderThreshold,
    stockBaseline: item.stockBaseline,
    isLow,
  };
};

// ─────────────────────────────────────────
// GET /api/inventory
// Get all items with search, sort, filter
// ─────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const {
    search,
    department,
    tier,
    locationId,
    status, // 'LOW' | 'OK' | 'OUT'
    sortBy = 'name',
    sortOrder = 'asc',
    page = 1,
    limit = 50,
  } = req.query;

  try {
    const where = {};

    // Keyword search on name, sku, notes
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    if (department) where.department = department;
    if (tier) where.tier = tier;

    // Filter by location
    if (locationId) {
      where.stockCounts = { some: { locationId } };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        stockCounts: {
          include: { location: true },
        },
        supplier: true,
        tags: { include: { tag: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    // Add total stock and low stock flag to each item
    const enriched = items.map((item) => {
      const totalStock = item.stockCounts.reduce((sum, sc) => sum + sc.quantity, 0);
      const isLow = totalStock <= item.reorderThreshold;
      const isOut = totalStock === 0;
      return {
        ...item,
        totalStock,
        stockStatus: isOut ? 'OUT' : isLow ? 'LOW' : 'OK',
      };
    });

    // Filter by stock status after enrichment
    const filtered = status
      ? enriched.filter((item) => item.stockStatus === status)
      : enriched;

    const total = await prisma.inventoryItem.count({ where });

    res.json({
      items: filtered,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// GET /api/inventory/low-stock
// Get all items currently below reorder threshold
// ─────────────────────────────────────────
router.get('/low-stock', authenticate, async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      include: {
        stockCounts: {
          include: { location: true },
        },
        supplier: true,
        tags: { include: { tag: true } },
      },
    });

    const lowStock = items
      .map((item) => {
        const totalStock = item.stockCounts.reduce((sum, sc) => sum + sc.quantity, 0);
        const isLow = totalStock <= item.reorderThreshold;
        const isOut = totalStock === 0;
        return {
          ...item,
          totalStock,
          stockStatus: isOut ? 'OUT' : isLow ? 'LOW' : 'OK',
        };
      })
      .filter((item) => item.stockStatus !== 'OK');

    res.json(lowStock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// GET /api/inventory/:id
// Get a single item with full details
// ─────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: {
        stockCounts: { include: { location: true, updatedBy: true } },
        supplier: true,
        tags: { include: { tag: true } },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const totalStock = item.stockCounts.reduce((sum, sc) => sum + sc.quantity, 0);
    const isLow = totalStock <= item.reorderThreshold;

    res.json({
      ...item,
      totalStock,
      stockStatus: totalStock === 0 ? 'OUT' : isLow ? 'LOW' : 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// POST /api/inventory
// Create a new inventory item
// ─────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  const {
    name, sku, hasSerialNumbers, tier, department,
    reorderThreshold, stockBaseline, estimatedShippingDays,
    reorderLink, pricePerPkg, unitsPerPkg, supplierId, notes, tags,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        sku: sku || null,
        hasSerialNumbers: hasSerialNumbers || false,
        tier: tier || 'TIER_2',
        department: department || 'OTHER',
        reorderThreshold: reorderThreshold || 0,
        stockBaseline: stockBaseline || 0,
        estimatedShippingDays: estimatedShippingDays || null,
        reorderLink: reorderLink || null,
        pricePerPkg: pricePerPkg || null,
        unitsPerPkg: unitsPerPkg || null,
        supplierId: supplierId || null,
        notes: notes || null,
        // Create tags if provided
        tags: tags?.length
          ? {
              create: tags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
        supplier: true,
      },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'InventoryItem',
      entityId: item.id,
      details: { name: item.name, tier: item.tier, department: item.department },
    });

    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// PUT /api/inventory/:id
// Update an inventory item
// ─────────────────────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  const {
    name, sku, hasSerialNumbers, tier, department,
    reorderThreshold, stockBaseline, estimatedShippingDays,
    reorderLink, pricePerPkg, unitsPerPkg, supplierId, notes,
  } = req.body;

  try {
    const existing = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        sku: sku ?? existing.sku,
        hasSerialNumbers: hasSerialNumbers ?? existing.hasSerialNumbers,
        tier: tier ?? existing.tier,
        department: department ?? existing.department,
        reorderThreshold: reorderThreshold ?? existing.reorderThreshold,
        stockBaseline: stockBaseline ?? existing.stockBaseline,
        estimatedShippingDays: estimatedShippingDays ?? existing.estimatedShippingDays,
        reorderLink: reorderLink ?? existing.reorderLink,
        pricePerPkg: pricePerPkg ?? existing.pricePerPkg,
        unitsPerPkg: unitsPerPkg ?? existing.unitsPerPkg,
        supplierId: supplierId ?? existing.supplierId,
        notes: notes ?? existing.notes,
      },
      include: {
        tags: { include: { tag: true } },
        supplier: true,
        stockCounts: { include: { location: true } },
      },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'InventoryItem',
      entityId: updated.id,
      details: { before: existing, after: updated },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/inventory/:id
// Delete an inventory item (admin only)
// ─────────────────────────────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: { stockCounts: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Delete image file if one exists
    if (existing.imageUrl) {
      const imagePath = path.join(__dirname, '../uploads', path.basename(existing.imageUrl));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete related records first
    await prisma.itemTag.deleteMany({ where: { itemId: req.params.id } });
    await prisma.stockCount.deleteMany({ where: { itemId: req.params.id } });

    await prisma.inventoryItem.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'DELETE',
      entityType: 'InventoryItem',
      entityId: req.params.id,
      details: { name: existing.name },
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// POST /api/inventory/:id/image
// Upload an image for an inventory item
// ─────────────────────────────────────────
router.post('/:id/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    const existing = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Delete old image if one exists
    if (existing.imageUrl) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(existing.imageUrl));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const updated = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { imageUrl },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'InventoryItem',
      entityId: updated.id,
      details: { imageUpdated: true, imageUrl },
    });

    res.json({ imageUrl: updated.imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// PUT /api/inventory/:id/tags
// Replace all tags on an item
// ─────────────────────────────────────────
router.put('/:id/tags', authenticate, async (req, res) => {
  const { tags } = req.body; // array of tag name strings

  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: 'Tags must be an array of strings' });
  }

  try {
    const existing = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Remove all existing tags then add new ones
    await prisma.itemTag.deleteMany({ where: { itemId: req.params.id } });

    if (tags.length > 0) {
  await Promise.all(
    tags.map((tagName) =>
      prisma.itemTag.create({
        data: {
          item: {
            connect: { id: req.params.id }
          },
          tag: {
            connectOrCreate: {
              where: { name: tagName },
              create: { name: tagName },
            },
          },
        },
      })
    )
  );
}

    const updated = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: { tags: { include: { tag: true } } },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'InventoryItem',
      entityId: req.params.id,
      details: { tagsUpdated: true, tags },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// POST /api/inventory/:id/adjust
// Manually adjust stock count at a location
// ─────────────────────────────────────────
router.post('/:id/adjust', authenticate, async (req, res) => {
  const { locationId, quantity, note } = req.body;

  if (!locationId || quantity === undefined) {
    return res.status(400).json({ error: 'locationId and quantity are required' });
  }

  if (!note || note.trim() === '') {
    return res.status(400).json({ error: 'A note is required when adjusting stock' });
  }

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Upsert stock count — create if it doesn't exist, update if it does
    const stockCount = await prisma.stockCount.upsert({
      where: {
        itemId_locationId: { itemId: req.params.id, locationId },
      },
      update: {
        quantity: parseInt(quantity),
        updatedById: req.user.userId,
      },
      create: {
        itemId: req.params.id,
        locationId,
        quantity: parseInt(quantity),
        updatedById: req.user.userId,
      },
    });

    // Check low stock after adjustment
    const lowStockStatus = await checkLowStock(req.params.id);

    await writeAuditLog({
      userId: req.user.userId,
      action: 'ADJUST',
      entityType: 'StockCount',
      entityId: stockCount.id,
      details: {
        itemId: req.params.id,
        itemName: item.name,
        locationId,
        locationName: location.name,
        newQuantity: quantity,
        note,
        isLow: lowStockStatus?.isLow,
      },
    });

    res.json({
      stockCount,
      lowStockStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;