const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate } = require('../middleware/auth');

// ─────────────────────────────────────────
// GET /api/stock-counts/:itemId
// Get all stock counts for a specific item across all locations
// ─────────────────────────────────────────
router.get('/:itemId', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.itemId },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const stockCounts = await prisma.stockCount.findMany({
      where: { itemId: req.params.itemId },
      include: {
        location: true,
        updatedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { location: { name: 'asc' } },
    });

    const totalStock = stockCounts.reduce((sum, sc) => sum + sc.quantity, 0);
    const isLow = totalStock <= item.reorderThreshold;

    res.json({
      item: {
        id: item.id,
        name: item.name,
        reorderThreshold: item.reorderThreshold,
        stockBaseline: item.stockBaseline,
      },
      stockCounts,
      totalStock,
      stockStatus: totalStock === 0 ? 'OUT' : isLow ? 'LOW' : 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// GET /api/stock-counts/location/:locationId
// Get all stock counts at a specific location
// ─────────────────────────────────────────
router.get('/location/:locationId', authenticate, async (req, res) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id: req.params.locationId },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const stockCounts = await prisma.stockCount.findMany({
      where: { locationId: req.params.locationId },
      include: {
        item: {
          include: {
            tags: { include: { tag: true } },
          },
        },
        updatedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { item: { name: 'asc' } },
    });

    res.json({
      location,
      stockCounts,
      totalUniqueItems: stockCounts.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;