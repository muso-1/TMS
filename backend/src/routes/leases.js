const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const leasesRouter = express.Router();

// Create a new lease
leasesRouter.post('/', async (req, res) => {
  try {
    const { tenantId, unitId, startDate, endDate, monthlyRent } = req.body;

    if (!tenantId || !unitId || !startDate || !monthlyRent) {
      return res.status(400).json({ error: 'tenantId, unitId, startDate, and monthlyRent are required' });
    }

    // Validate tenant and unit exist
    const [tenant, unit] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: Number(tenantId) } }),
      prisma.unit.findUnique({ where: { id: Number(unitId) } })
    ]);

    if (!tenant) return res.status(400).json({ error: 'Invalid tenantId' });
    if (!unit) return res.status(400).json({ error: 'Invalid unitId' });

    const lease = await prisma.lease.create({
      data: {
        tenantId: Number(tenantId),
        unitId: Number(unitId),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        monthlyRent: Number(monthlyRent),
      },
      include: {
        tenant: true,
        unit: true,
      }
    });

    res.status(201).json(lease);
  } catch (e) {
    console.error('Error creating lease:', e);
    res.status(500).json({ error: e.message });
  }
});

// List all leases (with tenant + unit info)
leasesRouter.get('/', async (req, res) => {
  try {
    const leases = await prisma.lease.findMany({
      include: {
        tenant: true,
        unit: true
      },
      orderBy: { startDate: 'desc' }
    });
    res.json(leases);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a single lease by ID
leasesRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        tenant: true,
        unit: true,
        rentBills: true, // optional: see all bills under this lease
      }
    });

    if (!lease) return res.status(404).json({ error: 'Lease not found' });

    res.json(lease);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a lease
leasesRouter.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { startDate, endDate, monthlyRent } = req.body;

    const lease = await prisma.lease.update({
      where: { id },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        monthlyRent: monthlyRent !== undefined ? Number(monthlyRent) : undefined,
      },
      include: {
        tenant: true,
        unit: true
      }
    });

    res.json(lease);
  } catch (e) {
    console.error('Error updating lease:', e);
    res.status(500).json({ error: e.message });
  }
});

// Delete a lease
// Also deletes rent bills under this lease id cascade is configured
leasesRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.lease.delete({ where: { id } });
    res.json({ ok: true, message: 'Lease deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = leasesRouter;
