const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const writeAuditLog = require('../helpers/auditLog');

// GET /api/shippers
router.get('/', authenticate, async (req, res) => {
  try {
    const shippers = await prisma.shipper.findMany({
      orderBy: { name: 'asc' },
      include: { suppliers: { include: { supplier: true } } },
    });
    res.json(shippers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/shippers
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const shipper = await prisma.shipper.create({
      data: { name, notes },
    });
    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Shipper',
      entityId: shipper.id,
      details: { name },
    });
    res.status(201).json(shipper);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/shippers/:id
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, notes } = req.body;
  try {
    const updated = await prisma.shipper.update({
      where: { id: req.params.id },
      data: { name, notes },
    });
    await writeAuditLog({
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'Shipper',
      entityId: updated.id,
      details: { name, notes },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;