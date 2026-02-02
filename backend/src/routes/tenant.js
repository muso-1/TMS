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
      include: {
        units: true,
        balance: true
      }
    })

    const result = tenants.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      units: t.units,
      balance: t.balance?.balance ?? 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching tenants:', error)
    res.status(500).json({ error: 'Error fetching tenants' })
  }
})


// READ tenant by ID with totalPaid and balance
router.get('/:id', async (req, res) => {
  try {
    const tenantId = Number(req.params.id)

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        units: true,
        balance: true,
        leases: {
          include: {
            unit: true,
            rentBills: true
          }
        },
        waterBills: true
      }
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    res.json({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      units: tenant.units,
      leases: tenant.leases,
      waterBills: tenant.waterBills,
      balance: tenant.balance?.balance ?? 0
    })
  } catch (error) {
    console.error('Error fetching tenant:', error)
    res.status(500).json({ error: 'Error fetching tenant' })
  }
})

// GET all payments for a tenant
router.get('/:id/payments', async (req, res) => {
  try {
    const tenantId = Number(req.params.id)

    const payments = await prisma.payment.findMany({
      where: { tenantId },
      include: {
        allocations: true
      },
      orderBy: { paidAt: 'desc' }
    })

    res.json(payments)
  } catch (error) {
    console.error('Error fetching tenant payments:', error)
    res.status(500).json({ error: 'Failed to fetch tenant payments' })
  }
})


module.exports = router;
