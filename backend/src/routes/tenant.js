const express = require('express')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const router = express.Router()

// ======================================================
// CREATE TENANT
// ======================================================
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body

    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email are required'
      })
    }

    const tenant = await prisma.tenant.create({
      data: { name, email, phone }
    })

    res.status(201).json(tenant)

  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: 'Error creating tenant'
    })
  }
})


// ======================================================
// LIST TENANTS (LEDGER-CORRECT FINANCIAL MODEL)
// ======================================================
router.get('/', async (req, res) => {
  try {

    const tenants = await prisma.tenant.findMany({
      include: {
        units: true,

        leases: {
          include: {
            rentBills: {
              where: { isVoided: false },
              select: {
                id: true,
                amount: true
              }
            }
          }
        }
      }
    })

    const results = await Promise.all(
      tenants.map(async (t) => {

        // -------------------------------------------------
        // BILL SIDE (snapshot ONLY for structure, NOT totals)
        // -------------------------------------------------
        const rentBills = t.leases.flatMap(l => l.rentBills)
        const billIds = rentBills.map(b => b.id)

        const totalBilled = rentBills.reduce(
          (sum, b) => sum + (b.amount || 0),
          0
        )

        // -------------------------------------------------
        // LEDGER SIDE (SOURCE OF TRUTH)
        // -------------------------------------------------
        const allocations = await prisma.paymentAllocation.findMany({
          where: {
            rentBillId: { in: billIds },
            isReversed: false
          },
          select: {
            amount: true,
            rentBillId: true
          }
        })

        const paidMap = new Map()

        for (const a of allocations) {
          paidMap.set(
            a.rentBillId,
            (paidMap.get(a.rentBillId) || 0) + a.amount
          )
        }

        let totalRentPaid = 0
        let outstandingRent = 0

        for (const bill of rentBills) {
          const paid = paidMap.get(bill.id) || 0

          totalRentPaid += paid
          outstandingRent += Math.max(bill.amount - paid, 0)
        }

        // -------------------------------------------------
        // PAYMENT LEDGER (GLOBAL TENANT VIEW)
        // -------------------------------------------------
        const payments = await prisma.payment.findMany({
          where: {
            tenantId: t.id,
            isReversed: false
          },
          include: {
            allocations: {
              where: {
                isReversed: false
              }
            }
          }
        })

        const totalPaid = payments.reduce(
          (sum, p) => sum + (p.amountReceived || 0),
          0
        )

        const totalAllocated = payments.reduce(
          (sum, p) =>
            sum + p.allocations.reduce(
              (s, a) => s + (a.amount || 0),
              0
            ),
          0
        )

        const creditBalance = Math.max(
          totalPaid - totalAllocated,
          0
        )

        // -------------------------------------------------
        // FINAL RESPONSE
        // -------------------------------------------------
        return {
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone,

          units: t.units,

          // BILLING VIEW (UI convenience ONLY)
          totalBilled,

          // LEDGER-DERIVED BILLING TRUTH
          totalRentPaid,
          outstandingRent,

          // LEDGER (GLOBAL TENANT FINANCIAL STATE)
          totalPaid,
          totalAllocated,
          creditBalance
        }
      })
    )

    res.json(results)

  } catch (error) {
    console.error('Error fetching tenants:', error)

    res.status(500).json({
      error: 'Error fetching tenants'
    })
  }
})


// ======================================================
// TENANT PAYMENTS (LEDGER SAFE)
// ======================================================
router.get('/:id/payments', async (req, res) => {
  try {

    const tenantId = Number(req.params.id)

    const payments = await prisma.payment.findMany({
      where: { tenantId },

      include: {
        allocations: {
          where: { isReversed: false }
        }
      },

      orderBy: {
        paidAt: 'desc'
      }
    })

    res.json(payments)

  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: 'Failed to fetch tenant payments'
    })
  }
})


// ======================================================
// UPDATE TENANT
// ======================================================
router.patch('/:id', async (req, res) => {
  try {

    const id = Number(req.params.id)
    const { name, email, phone } = req.body

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { name, email, phone }
    })

    res.json(tenant)

  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: error.message
    })
  }
})

module.exports = router