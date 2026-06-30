const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')

const {
  createRentBillWithCredit
} = require('../services/rentBillService')

const {
  syncRentBillFinancials,
  buildRentBillResponse,
} = require('../services/syncRentBillFinancials')

const {
  syncPaymentFinancials
} = require('../services/syncPaymentFinancials')

const authenticate =
  require('../middleware/authenticate')

const {
  requirePermission
} = require('../middleware/permissions')

const prisma = new PrismaClient()
const rentBillsRouter = Router()

// =====================================================
// LIST RENT BILLS
// =====================================================

rentBillsRouter.get('/', authenticate, async (req, res) => {
  try {

    const bills = await prisma.rentBill.findMany({
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true,
          },
        },
      },

      orderBy: [
        { dueDate: 'desc' },
      ],
    })

    res.json(
      bills.map(buildRentBillResponse)
    )

  } catch (e) {

    console.error(
      'Error fetching rent bills:',
      e
    )

    res.status(500).json({
      error: e.message,
    })
  }
})


// =====================================================
// GET SINGLE RENT BILL
// =====================================================

rentBillsRouter.get('/:id', authenticate, async (req, res) => {
  try {

    const id = Number(req.params.id)

    const bill = await prisma.rentBill.findFirst({
      where: { id },

      include: {
        lease: {
          include: {
            tenant: true,
            unit: true,
          },
        },

        allocations: {
          where: {
            isReversed: false,
          },

          include: {
            payment: true,
          },
        },
      },
    })

    if (!bill) {
      return res.status(404).json({
        error: 'Rent bill not found',
      })
    }

    res.json({
      ...buildRentBillResponse(bill),
      allocations: bill.allocations,
    })

  } catch (e) {

    console.error(
      'Error fetching rent bill:',
      e
    )

    res.status(500).json({
      error: e.message,
    })
  }
})


// =====================================================
// CREATE RENT BILL
// =====================================================

rentBillsRouter.post('/', authenticate, requirePermission('CREATE_BILL'), async (req, res) => {
  try {

    const {
      leaseId,
      dueDate,
    } = req.body

    if (!leaseId || !dueDate) {
      return res.status(400).json({
        error:
          'leaseId and dueDate are required',
      })
    }

    const lease =
      await prisma.lease.findUnique({
        where: {
          id: Number(leaseId),
        },

        include: {
          tenant: true,
          unit: true,
        },
      })

    if (!lease) {
      return res.status(404).json({
        error: 'Lease not found',
      })
    }

    const bill =
      await prisma.$transaction(async (tx) => {

        const createdBill =
          await createRentBillWithCredit({
            tx,
            lease,
            amount: lease.monthlyRent,
            dueDate: new Date(dueDate),
          })

        await syncRentBillFinancials(
          tx,
          createdBill.id
        )

        return createdBill
      })

    const fullBill =
      await prisma.rentBill.findUnique({
        where: {
          id: bill.id,
        },

        include: {
          lease: {
            include: {
              tenant: true,
              unit: true,
            },
          },
        },
      })

    res.status(201).json(
      buildRentBillResponse(fullBill)
    )

  } catch (e) {

    console.error(
      'Error creating rent bill:',
      e
    )

    res.status(500).json({
      error: e.message,
    })
  }
})


// =====================================================
// VOID RENT BILL
// =====================================================

rentBillsRouter.patch('/:id/void', authenticate, requirePermission('VOID_BILL'), async (req, res) => {
  try {

    const id = Number(req.params.id)

    const { reason } = req.body || {}

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: 'Void reason is required',
      })
    }

    await prisma.$transaction(async (tx) => {

      // ============================================
      // 1. FIND BILL
      // ============================================

      const bill =
        await tx.rentBill.findFirst({
          where: {
            id,
            isVoided: false,
          },

          include: {
            lease: true,
          },
        })

      if (!bill) {
        throw new Error(
          'Active rent bill not found'
        )
      }

      // ============================================
      // 2. ENSURE LATEST BILL ONLY
      // ============================================

      const latestBill =
        await tx.rentBill.findFirst({
          where: {
            leaseId: bill.leaseId,
            isVoided: false,
          },

          orderBy: [
            { dueDate: 'desc' },
            { createdAt: 'desc' },
          ],
        })

      if (!latestBill || latestBill.id !== bill.id) {
        throw new Error(
          'Only the latest rent bill can be voided'
        )
      }

      // ============================================
      // 3. FETCH ACTIVE ALLOCATIONS
      // ============================================

      const allocations =
        await tx.paymentAllocation.findMany({
          where: {
            rentBillId: bill.id,
            isReversed: false,
          },
        })

      // ============================================
      // 4. REVERSE ALLOCATIONS
      // ============================================

      const affectedPayments = new Set()

      for (const allocation of allocations) {

        await tx.paymentAllocation.update({
          where: {
            id: allocation.id,
          },

          data: {
            isReversed: true,
            reversedAt: new Date(),
            reversalReason:
              `Rent bill voided: ${reason.trim()}`,
          },
        })

        if (allocation.paymentId) {
          affectedPayments.add(
            allocation.paymentId
          )
        }
      }

      // ============================================
      // 5. SYNC PAYMENTS
      // ============================================

      for (const paymentId of affectedPayments) {
        await syncPaymentFinancials(
          tx,
          paymentId
        )
      }

      // ============================================
      // 6. VOID BILL
      // ============================================

      await tx.rentBill.update({
        where: {
          id: bill.id,
        },

        data: {
          isVoided: true,
          voidedAt: new Date(),
          voidReason: reason.trim(),
        },
      })

      // ============================================
      // 7. SYNC BILL SNAPSHOT
      // ============================================

      await syncRentBillFinancials(
        tx,
        bill.id
      )
    })

    res.json({
      message:
        'Rent bill voided successfully',
    })

  } catch (e) {

    console.error(
      'Error voiding rent bill:',
      e
    )

    res.status(400).json({
      error: e.message,
    })
  }
})

module.exports = rentBillsRouter
