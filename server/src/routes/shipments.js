const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const writeAuditLog = require('../helpers/auditLog');

// ─────────────────────────────────────────
// GET /api/shipments
// ─────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const { status, supplierId, search, page = 1, limit = 50 } = req.query;

  try {
    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
        { shipper: { name: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          supplier: true,
          shipper: true,
          createdBy: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
          destination: true,
          lineItems: {
            include: { inventoryItem: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.shipment.count({ where }),
    ]);

    res.json({
      shipments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// GET /api/shipments/:id
// ─────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        shipper: true,
        createdBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        destination: true,
        lineItems: { include: { inventoryItem: true } },
        reorder: true,
      },
    });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    res.json(shipment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// POST /api/shipments
// Create a new shipment
// ─────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  const {
    supplierId, shipperId, shipDate,
    estimatedArrival, destinationLocationId, notes, lineItems,
  } = req.body;

  if (!supplierId) {
    return res.status(400).json({ error: 'Supplier is required' });
  }
  if (!lineItems || lineItems.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  try {
    const shipment = await prisma.shipment.create({
      data: {
        supplierId,
        shipperId: shipperId || null,
        shipDate: shipDate ? new Date(shipDate) : null,
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : null,
        destinationLocationId: destinationLocationId || null,
        notes: notes || null,
        status: 'PENDING',
        createdById: req.user.userId,
        lineItems: {
          create: lineItems.map((li) => ({
            inventoryItemId: li.inventoryItemId,
            expectedQty: parseInt(li.expectedQty),
            receivedQty: null,
            serialNumbers: li.serialNumbers || null,
          })),
        },
      },
      include: {
        supplier: true,
        shipper: true,
        lineItems: { include: { inventoryItem: true } },
      },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Shipment',
      entityId: shipment.id,
      details: { supplierId, lineItemCount: lineItems.length },
    });

    res.status(201).json(shipment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// PUT /api/shipments/:id/status
// Update shipment status
// ─────────────────────────────────────────
router.put('/:id/status', authenticate, async (req, res) => {
  const { status, shipperId, shipDate, estimatedArrival, notes } = req.body;

  const validStatuses = ['PENDING', 'ORDERED', 'IN_TRANSIT', 'ISSUE'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use PENDING, ORDERED, IN_TRANSIT, or ISSUE.' });
  }

  try {
    const existing = await prisma.shipment.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Shipment not found' });

    const updated = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status,
        shipperId: shipperId ?? existing.shipperId,
        shipDate: shipDate ? new Date(shipDate) : existing.shipDate,
        estimatedArrival: estimatedArrival
          ? new Date(estimatedArrival)
          : existing.estimatedArrival,
        notes: notes ?? existing.notes,
      },
      include: {
        supplier: true,
        shipper: true,
        lineItems: { include: { inventoryItem: true } },
      },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'Shipment',
      entityId: updated.id,
      details: { statusChange: { from: existing.status, to: status } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// POST /api/shipments/:id/receive
// Receive a shipment — updates stock counts
// ─────────────────────────────────────────
router.post('/:id/receive', authenticate, async (req, res) => {
  const { lineItems, destinationLocationId, notes } = req.body;

  if (!lineItems || lineItems.length === 0) {
    return res.status(400).json({ error: 'Line items with received quantities are required' });
  }
  if (!destinationLocationId) {
    return res.status(400).json({ error: 'Destination location is required' });
  }

  try {
    const existing = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: { lineItems: true },
    });

    if (!existing) return res.status(404).json({ error: 'Shipment not found' });
    if (existing.status === 'RECEIVED') {
      return res.status(400).json({ error: 'Shipment has already been received' });
    }

    // Use a transaction — all stock updates succeed or all fail together
    const result = await prisma.$transaction(async (tx) => {
      // Update each line item with received quantity
      for (const li of lineItems) {
        await tx.shipmentLineItem.update({
          where: { id: li.id },
          data: {
            receivedQty: parseInt(li.receivedQty),
            serialNumbers: li.serialNumbers || null,
          },
        });

        // Upsert stock count at destination location
        await tx.stockCount.upsert({
          where: {
            itemId_locationId: {
              itemId: li.inventoryItemId,
              locationId: destinationLocationId,
            },
          },
          update: {
            quantity: { increment: parseInt(li.receivedQty) },
            updatedById: req.user.userId,
          },
          create: {
            itemId: li.inventoryItemId,
            locationId: destinationLocationId,
            quantity: parseInt(li.receivedQty),
            updatedById: req.user.userId,
          },
        });
      }

      // Mark shipment as received
      const updated = await tx.shipment.update({
        where: { id: req.params.id },
        data: {
          status: 'RECEIVED',
          receivedDate: new Date(),
          receivedById: req.user.userId,
          destinationLocationId,
          notes: notes ?? existing.notes,
        },
        include: {
          supplier: true,
          shipper: true,
          lineItems: { include: { inventoryItem: true } },
          destination: true,
        },
      });

      return updated;
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'RECEIVE',
      entityType: 'Shipment',
      entityId: req.params.id,
      details: {
        destinationLocationId,
        lineItemCount: lineItems.length,
        receivedAt: new Date(),
      },
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/shipments/:id
// Delete a shipment (admin, only if PENDING)
// ─────────────────────────────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.shipment.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Shipment not found' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Only PENDING shipments can be deleted.',
      });
    }

    await prisma.shipmentLineItem.deleteMany({
      where: { shipmentId: req.params.id },
    });
    await prisma.shipment.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'DELETE',
      entityType: 'Shipment',
      entityId: req.params.id,
      details: { supplierId: existing.supplierId },
    });

    res.json({ message: 'Shipment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;