const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const writeAuditLog = require('../helpers/auditLog');

// GET /api/reorders
router.get('/', authenticate, async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  try {
    const where = {};
    if (status) where.status = status;

    const [reorders, total] = await Promise.all([
      prisma.reorder.findMany({
        where,
        include: {
          inventoryItem: true,
          requestedBy: { select: { id: true, name: true } },
          shipment: { include: { supplier: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.reorder.count({ where }),
    ]);

    res.json({
      reorders,
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

// POST /api/reorders
router.post('/', authenticate, async (req, res) => {
  const { inventoryItemId, quantityRequested, notes } = req.body;

  if (!inventoryItemId || !quantityRequested) {
    return res.status(400).json({
      error: 'inventoryItemId and quantityRequested are required',
    });
  }

  try {
    const reorder = await prisma.reorder.create({
      data: {
        inventoryItemId,
        requestedById: req.user.userId,
        quantityRequested: parseInt(quantityRequested),
        status: 'PENDING',
        notes: notes || null,
      },
      include: {
        inventoryItem: true,
        requestedBy: { select: { id: true, name: true } },
      },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Reorder',
      entityId: reorder.id,
      details: { inventoryItemId, quantityRequested },
    });

    res.status(201).json(reorder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/reorders/:id/status
router.put('/:id/status', authenticate, async (req, res) => {
  const { status, shipmentId } = req.body;

  const validStatuses = ['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const existing = await prisma.reorder.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Reorder not found' });

    const updated = await prisma.reorder.update({
      where: { id: req.params.id },
      data: {
        status,
        shipmentId: shipmentId ?? existing.shipmentId,
      },
      include: {
        inventoryItem: true,
        requestedBy: { select: { id: true, name: true } },
        shipment: { include: { supplier: true } },
      },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'Reorder',
      entityId: updated.id,
      details: { statusChange: { from: existing.status, to: status } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/reorders/:id (admin, only PENDING)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.reorder.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Reorder not found' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only PENDING reorders can be deleted' });
    }

    await prisma.reorder.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'DELETE',
      entityType: 'Reorder',
      entityId: req.params.id,
      details: { inventoryItemId: existing.inventoryItemId },
    });

    res.json({ message: 'Reorder deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;