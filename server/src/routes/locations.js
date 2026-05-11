const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const writeAuditLog = require('../helpers/auditLog');

// ─────────────────────────────────────────
// GET /api/locations
// Get all locations (with children nested)
// ─────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
          include: {
            children: {
              orderBy: { name: 'asc' },
            },
          },
        },
      },
      where: {
        parentLocationId: null, // only fetch top-level locations
      },
    });

    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// GET /api/locations/flat
// Get all locations as a flat list (useful for dropdowns)
// ─────────────────────────────────────────
router.get('/flat', authenticate, async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// GET /api/locations/:id
// Get a single location
// ─────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id: req.params.id },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// POST /api/locations
// Create a new location (admin only)
// ─────────────────────────────────────────
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, locationType, parentLocationId, address, notes } = req.body;

  if (!name || !locationType) {
    return res.status(400).json({ error: 'Name and locationType are required' });
  }

  try {
    const location = await prisma.location.create({
      data: {
        name,
        locationType,
        parentLocationId: parentLocationId || null,
        address: address || null,
        notes: notes || null,
      },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Location',
      entityId: location.id,
      details: { name, locationType },
    });

    res.status(201).json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// PUT /api/locations/:id
// Update a location (admin only)
// ─────────────────────────────────────────
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, locationType, parentLocationId, address, notes } = req.body;

  try {
    const existing = await prisma.location.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const updated = await prisma.location.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        locationType: locationType ?? existing.locationType,
        parentLocationId: parentLocationId ?? existing.parentLocationId,
        address: address ?? existing.address,
        notes: notes ?? existing.notes,
      },
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'Location',
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
// DELETE /api/locations/:id
// Delete a location (admin only)
// ─────────────────────────────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.location.findUnique({
      where: { id: req.params.id },
      include: { children: true, stockCounts: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (existing.children.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete a location that has sub-locations. Remove sub-locations first.',
      });
    }

    if (existing.stockCounts.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete a location that has stock counts associated with it.',
      });
    }

    await prisma.location.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'DELETE',
      entityType: 'Location',
      entityId: req.params.id,
      details: { name: existing.name },
    });

    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;