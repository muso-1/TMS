const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// CREATE tenant
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const tenant = await prisma.tenant.create({
      data: { name, email, phone }
    });

    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Error creating tenant' });
  }
});

// READ all tenants with totalPaid and balance
router.get('/', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { units: true }
    });

    // Populate totalPaid and balance for each tenant
    const tenantsWithPayments = await Promise.all(
      tenants.map(async (tenant) => {
        // Sum of all payments for this tenant
        const paymentsAgg = await prisma.payment.aggregate({
          where: { tenantId: tenant.id },
          _sum: { amount: true }
        });
        const totalPaid = paymentsAgg._sum.amount ?? 0;

        // Sum of all rent bills for this tenant
        const rentBills = await prisma.rentBill.findMany({
          where: { lease: { tenantId: tenant.id } }
        });
        const totalRent = rentBills.reduce((sum, b) => sum + b.amount, 0);

        // Sum of all water bills for this tenant
        const waterBills = await prisma.waterBill.findMany({
          where: { tenantId: tenant.id }
        });
        const totalWater = waterBills.reduce((sum, b) => sum + b.amount, 0);

        const balance = totalRent + totalWater - totalPaid;

        return { ...tenant, totalPaid, balance };
      })
    );

    res.json(tenantsWithPayments);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Error fetching tenants' });
  }
});

// READ tenant by ID with totalPaid and balance
router.get('/:id', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { units: true }
    });

    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Aggregate payments
    const paymentsAgg = await prisma.payment.aggregate({
      where: { tenantId },
      _sum: { amount: true }
    });
    const totalPaid = paymentsAgg._sum.amount ?? 0;

    // Sum rent and water bills
    const rentBills = await prisma.rentBill.findMany({
      where: { lease: { tenantId } }
    });
    const totalRent = rentBills.reduce((sum, b) => sum + b.amount, 0);

    const waterBills = await prisma.waterBill.findMany({
      where: { tenantId }
    });
    const totalWater = waterBills.reduce((sum, b) => sum + b.amount, 0);

    const balance = totalRent + totalWater - totalPaid;

    res.json({ ...tenant, totalPaid, balance });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Error fetching tenant' });
  }
});

// UPDATE tenant
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: parseInt(req.params.id) },
      data: { name, email, phone }
    });

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Error updating tenant' });
  }
});

// GET all payments for a tenant
router.get('/:id/payments', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    const payments = await prisma.payment.findMany({
      where: { tenantId },
      include: {
        rentBill: { include: { lease: { include: { unit: true } } } },
        waterBill: true
      },
      orderBy: { paidAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching tenant payments:', error);
    res.status(500).json({ error: 'Failed to fetch tenant payments' });
  }
});

module.exports = router;
