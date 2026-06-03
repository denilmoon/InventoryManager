const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate } = require('../middleware/auth');
const writeAuditLog = require('../helpers/auditLog');

// GET /api/dispatch
router.get('/', authenticate, async (req, res) => {
  const { recipientType, technicianId, teamId, page = 1, limit = 50 } = req.query;
  try {
    const where = {};
    if (recipientType) where.recipientType = recipientType;
    if (technicianId) where.technicianId = technicianId;
    if (teamId) where.installerTeamId = teamId;

    const [logs, total] = await Promise.all([
      prisma.dispatchLog.findMany({
        where,
        include: {
          dispatchedBy: { select: { id: true, name: true } },
          installerTeam: true,
          technician: { include: { vehicle: true } },
          lineItems: {
            include: {
              inventoryItem: true,
              sourceLocation: true,
            },
          },
        },
        orderBy: { dispatchedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.dispatchLog.count({ where }),
    ]);

    res.json({
      logs,
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

// POST /api/dispatch
router.post('/', authenticate, async (req, res) => {
  const { recipientType, installerTeamId, technicianId, lineItems, notes } = req.body;

  if (!recipientType) {
    return res.status(400).json({ error: 'recipientType is required' });
  }
  if (recipientType === 'INSTALLER_TEAM' && !installerTeamId) {
    return res.status(400).json({ error: 'installerTeamId is required for team dispatch' });
  }
  if (recipientType === 'TECHNICIAN' && !technicianId) {
    return res.status(400).json({ error: 'technicianId is required for technician dispatch' });
  }
  if (!lineItems || lineItems.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  try {
    // Use transaction — dispatch log + all stock decrements succeed or all fail
    const result = await prisma.$transaction(async (tx) => {
      // Create the dispatch log
      const dispatchLog = await tx.dispatchLog.create({
        data: {
          dispatchedById: req.user.userId,
          recipientType,
          installerTeamId: installerTeamId || null,
          technicianId: technicianId || null,
          notes: notes || null,
          lineItems: {
            create: lineItems.map((li) => ({
              inventoryItemId: li.inventoryItemId,
              quantity: parseInt(li.quantity),
              serialNumbers: li.serialNumbers || null,
              sourceLocationId: li.sourceLocationId,
            })),
          },
        },
        include: {
          dispatchedBy: { select: { id: true, name: true } },
          installerTeam: true,
          technician: { include: { vehicle: true } },
          lineItems: {
            include: {
              inventoryItem: true,
              sourceLocation: true,
            },
          },
        },
      });

      // Decrement stock for each line item
      for (const li of lineItems) {
        const stockCount = await tx.stockCount.findUnique({
          where: {
            itemId_locationId: {
              itemId: li.inventoryItemId,
              locationId: li.sourceLocationId,
            },
          },
        });

        if (!stockCount) {
          throw new Error(
            `No stock count found for item ${li.inventoryItemId} at location ${li.sourceLocationId}`
          );
        }

        if (stockCount.quantity < parseInt(li.quantity)) {
          throw new Error(
            `Insufficient stock for item ${li.inventoryItemId}. Available: ${stockCount.quantity}, requested: ${li.quantity}`
          );
        }

        await tx.stockCount.update({
          where: {
            itemId_locationId: {
              itemId: li.inventoryItemId,
              locationId: li.sourceLocationId,
            },
          },
          data: {
            quantity: { decrement: parseInt(li.quantity) },
            updatedById: req.user.userId,
          },
        });
      }

      return dispatchLog;
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'DISPATCH',
      entityType: 'DispatchLog',
      entityId: result.id,
      details: {
        recipientType,
        installerTeamId,
        technicianId,
        lineItemCount: lineItems.length,
      },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    if (err.message.includes('Insufficient stock') || err.message.includes('No stock count')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;