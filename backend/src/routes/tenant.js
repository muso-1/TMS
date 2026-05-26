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

// READ all tenants with rent statistics
router.get('/', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        units: true,
        balance: true,

        // leases -> rent bills
        leases: {
          include: {
            rentBills: {
              select: {
                amount: true
              }
            }
          }
        },

        // payments -> allocations
        payments: {
          include: {
            allocations: {
              where: {
                billType: 'rent'
              },
              select: {
                amount: true
              }
            }
          }
        }
      }
    })

    const result = tenants.map(t => {

      // ALL rent bills across leases
      const rentBills = t.leases.flatMap(
        lease => lease.rentBills
      )

      // total rent billed
      const totalRentBilled = rentBills.reduce(
        (sum, bill) => sum + bill.amount,
        0
      )

      // ALL rent allocations across payments
      const rentAllocations = t.payments.flatMap(
        payment => payment.allocations
      )

      // total paid toward rent only
      const totalRentPaid = rentAllocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0
      )

      // derived outstanding rent
      const outstandingRent =
        totalRentBilled - totalRentPaid

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,

        units: t.units,

        balance: t.balance?.balance ?? 0,

        totalRentBilled,
        totalRentPaid,
        outstandingRent
      }
    })

    res.json(result)

  } catch (error) {
    console.error('Error fetching tenants:', error)

    res.status(500).json({
      error: 'Error fetching tenants'
    })
  }
})


// READ tenant by ID with totalPaid and balance
// READ all tenants with totalPaid and outstanding rent
router.get('/', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        units: true,
        balance: true,

        leases: {
          include: {
            rentBills: {
              select: {
                amount: true
              }
            }
          }
        },

        payments: {
          select: {
            amount: true
          }
        }
      }
    })

    const result = tenants.map(t => {
      // total paid
      const totalPaid = t.payments.reduce(
        (sum, p) => sum + p.amount,
        0
      )

      // all rent bills across all leases
      const rentBills = t.leases.flatMap(
        lease => lease.rentBills
      )

      // total billed rent
      const totalBilled = rentBills.reduce(
        (sum, bill) => sum + bill.amount,
        0
      )

      // derived outstanding rent
      const outstandingRent = totalBilled - totalPaid

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,

        units: t.units,

        balance: t.balance?.balance ?? 0,

        totalBilled,
        totalPaid,
        outstandingRent
      }
    })

    res.json(result)

  } catch (error) {
    console.error('Error fetching tenants:', error)

    res.status(500).json({
      error: 'Error fetching tenants'
    })
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

router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, phone } = req.body;

    const tenant = await prisma.tenant.update({
      where: {id},
      data: {
        name: name,
        email: email,
        phone: phone,
      }
    })
    
    res.json(tenant)
  } catch (e) {
    console.error('Error updating tenant:', e);
    res.status(500).json({ error: e.message });
  }
})

module.exports = router;
