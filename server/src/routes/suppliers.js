const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const writeAuditLog = require('../helpers/auditLog');

// GET /api/suppliers
router.get('/', authenticate, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/suppliers
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, phone, email, website, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const supplier = await prisma.supplier.create({
      data: { name, phone, email, website, notes },
    });
    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: { name },
    });
    res.status(201).json(supplier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;