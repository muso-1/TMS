const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all units
router.get('/', async (req, res) => {
  try {
    const units = await prisma.unit.findMany({ include: { tenant: true } });

    // Derive status dynamically
    const normalized = units.map((u) => ({
      ...u,
      status: u.tenantId ? 'occupied' : 'vacant',
    }));

    res.json(normalized);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Error fetching units' });
  }
});


// CREATE unit
router.post('/', async (req, res) => {
  try {
    const { unitNumber, status } = req.body;
    const unit = await prisma.unit.create({
      data: {
        unitNumber,
        status: status || 'vacant',
      },
    });
    res.status(201).json(unit);
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ error: 'Error creating unit' });
  }
});

module.exports = router;
