const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// CREATE maintenance request
router.post('/', async (req, res) => {
  try {
    const { tenantId, description, cost, status } = req.body;

    if (!tenantId || !description) {
      return res.status(400).json({ error: 'Tenant ID and description are required' });
    }

    const maintenance = await prisma.maintenance.create({
      data: { tenantId, description, cost, status }
    });

    res.status(201).json(maintenance);
  } catch (error) {
    res.status(500).json({ error: 'Error creating maintenance request' });
  }
});

// READ all maintenance requests
router.get('/', async (req, res) => {
  try {
    const maintenanceList = await prisma.maintenance.findMany({
      include: { tenant: true }
    });
    res.json(maintenanceList);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching maintenance requests' });
  }
});

// READ maintenance by ID
router.get('/:id', async (req, res) => {
  try {
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { tenant: true }
    });

    if (!maintenance) return res.status(404).json({ error: 'Maintenance request not found' });

    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching maintenance request' });
  }
});

// UPDATE maintenance request
router.put('/:id', async (req, res) => {
  try {
    const { description, cost, status } = req.body;

    const maintenance = await prisma.maintenance.update({
      where: { id: parseInt(req.params.id) },
      data: { description, cost, status }
    });

    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ error: 'Error updating maintenance request' });
  }
});

// DELETE maintenance request
router.delete('/:id', async (req, res) => {
  try {
    await prisma.maintenance.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Maintenance request deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting maintenance request' });
  }
});

module.exports = router;
