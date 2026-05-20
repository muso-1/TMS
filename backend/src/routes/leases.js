const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const leasesRouter = express.Router();

// Create a new lease
leasesRouter.post('/', async (req, res) => {
  try {
    const {
      tenantId,
      unitId,
      startDate,
      endDate,
      monthlyRent
    } = req.body;

    const lease = await prisma.$transaction(async (tx) => {
      // Create the lease
      const newLease = await tx.lease.create({
        data: {
          tenantId: parseInt(tenantId),
          unitId: parseInt(unitId),
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          monthlyRent: parseFloat(monthlyRent),
          status: 'active'
        }
      });

      // Assign tenant to the unit
      await tx.unit.update({
        where: { id: parseInt(unitId) },
        data: {
          tenantId: parseInt(tenantId),
          status: 'occupied'
        }
      });

      return newLease;
    });

    res.status(201).json(lease);
  } catch (error) {
    console.error('Error creating lease:', error);
    res.status(500).json({ error: 'Failed to create lease' });
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

leasesRouter.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { startDate, endDate, monthlyRent, status } = req.body;

    const updatedLease = await prisma.$transaction(async (tx) => {

      // 1. Update lease
      const lease = await tx.lease.update({
        where: { id },
        data: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          monthlyRent: monthlyRent !== undefined ? Number(monthlyRent) : undefined,
          status: status ?? undefined
        }
      });

      // 2. Sync unit based on lease status
      if (status === 'terminated' || status === 'expired') {
        await tx.unit.update({
          where: { id: lease.unitId },
          data: {
            tenantId: null,
            status: 'vacant'
          }
        });
      }

      if (status === 'active') {
        await tx.unit.update({
          where: { id: lease.unitId },
          data: {
            tenantId: lease.tenantId,
            status: 'occupied'
          }
        });
      }

      return lease;
    });

    res.json(updatedLease);

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
