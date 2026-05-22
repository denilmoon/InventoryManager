const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate } = require('../middleware/auth');

// ─────────────────────────────────────────
// GET /api/dashboard
// Returns everything the dashboard needs in one call
// ─────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    // All items with their stock counts
    const allItems = await prisma.inventoryItem.findMany({
      include: {
        stockCounts: {
          include: { location: true },
        },
        supplier: true,
      },
    });

    // Enrich with stock status
    const enriched = allItems.map((item) => {
      const totalStock = item.stockCounts.reduce((sum, sc) => sum + sc.quantity, 0);
      const isOut = totalStock === 0;
      const isLow = totalStock <= item.reorderThreshold;
      return {
        ...item,
        totalStock,
        stockStatus: isOut ? 'OUT' : isLow ? 'LOW' : 'OK',
      };
    });

    // Low stock and out of stock items
    const lowStockItems = enriched.filter((i) => i.stockStatus !== 'OK');

    // Quick stats
    const stats = {
      totalItems: allItems.length,
      tier1Items: allItems.filter((i) => i.tier === 'TIER_1').length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: enriched.filter((i) => i.stockStatus === 'OUT').length,
    };

    // Pending shipments
    const pendingShipments = await prisma.shipment.findMany({
      where: {
        status: { in: ['PENDING', 'ORDERED', 'IN_TRANSIT'] },
      },
      include: {
        supplier: true,
        lineItems: {
          include: { inventoryItem: true },
        },
      },
      orderBy: { estimatedArrival: 'asc' },
      take: 5,
    });

    // Open reorders
    const openReorders = await prisma.reorder.findMany({
      where: {
        status: { in: ['PENDING', 'ORDERED'] },
      },
      include: {
        inventoryItem: true,
        requestedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
      take: 5,
    });

    // Recent activity from audit log
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      stats,
      lowStockItems,
      pendingShipments,
      openReorders,
      recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;