const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const writeAuditLog = require('../helpers/auditLog');

// ─────────────────────────────────────────
// INSTALLER TEAMS
// ─────────────────────────────────────────

router.get('/teams', authenticate, async (req, res) => {
  try {
    const teams = await prisma.installerTeam.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/teams', authenticate, requireAdmin, async (req, res) => {
  const { name, contactName, contactPhone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const team = await prisma.installerTeam.create({
      data: { name, contactName, contactPhone, notes },
    });
    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'InstallerTeam',
      entityId: team.id,
      details: { name },
    });
    res.status(201).json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/teams/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, contactName, contactPhone, notes } = req.body;
  try {
    const updated = await prisma.installerTeam.update({
      where: { id: req.params.id },
      data: { name, contactName, contactPhone, notes },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// VEHICLES
// ─────────────────────────────────────────

router.get('/vehicles', authenticate, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { licensePlate: 'asc' },
      include: { technician: true },
    });
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/vehicles', authenticate, requireAdmin, async (req, res) => {
  const { licensePlate, make, model, year, notes } = req.body;
  if (!licensePlate) return res.status(400).json({ error: 'License plate is required' });
  try {
    const vehicle = await prisma.vehicle.create({
      data: { licensePlate, make, model, year: year ? parseInt(year) : null, notes },
    });
    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      details: { licensePlate },
    });
    res.status(201).json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// TECHNICIANS
// ─────────────────────────────────────────

router.get('/technicians', authenticate, async (req, res) => {
  try {
    const technicians = await prisma.technician.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { vehicle: true },
    });
    res.json(technicians);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/technicians', authenticate, requireAdmin, async (req, res) => {
  const { name, employeeId, assignedVehicleId, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const technician = await prisma.technician.create({
      data: {
        name,
        employeeId: employeeId || null,
        assignedVehicleId: assignedVehicleId || null,
        notes: notes || null,
      },
      include: { vehicle: true },
    });
    await writeAuditLog({
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Technician',
      entityId: technician.id,
      details: { name },
    });
    res.status(201).json(technician);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/technicians/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, employeeId, assignedVehicleId, active, notes } = req.body;
  try {
    const updated = await prisma.technician.update({
      where: { id: req.params.id },
      data: {
        name,
        employeeId,
        assignedVehicleId: assignedVehicleId || null,
        active: active !== undefined ? active : true,
        notes,
      },
      include: { vehicle: true },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;