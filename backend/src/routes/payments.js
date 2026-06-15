const { Router } = require('express')
const prisma = require('../lib/prisma')

const {
  applyPayment,
} = require('../services/applyPayments')

const {
  syncPaymentFinancials,
} = require('../services/syncPaymentFinancials')

const {
  syncRentBillFinancials,
} = require('../services/syncRentBillFinancials')

const {
  syncWaterBillFinancials,
} = require('../services/syncWaterBillFinancials')

const paymentsRouter = Router()


// ======================================================
// LIST PAYMENTS (FIXED SEARCH + FILTER LOGIC)
// ======================================================
paymentsRouter.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1)

    const pageSize = Math.min(
      Number(req.query.pageSize ?? 20),
      100
    )

    const skip = (page - 1) * pageSize

    const tenantId = req.query.tenantId
      ? Number(req.query.tenantId)
      : undefined

    const from = req.query.from
      ? new Date(req.query.from)
      : undefined

    const to = req.query.to
      ? new Date(req.query.to)
      : undefined

    const search = req.query.search?.trim()

    const includeReversed =
      req.query.includeReversed === 'true'

    // ======================================================
    // SAFE WHERE BUILDER (FIXED)
    // ======================================================
    const where = {
      AND: [
        // --------------------------------------------------
        // Exclude reversed unless explicitly included
        // --------------------------------------------------
        !includeReversed
          ? { isReversed: false }
          : {},

        // --------------------------------------------------
        // Tenant filter
        // --------------------------------------------------
        tenantId
          ? { tenantId }
          : {},

        // --------------------------------------------------
        // Date range filter
        // --------------------------------------------------
        from || to
          ? {
              paidAt: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {},

        // --------------------------------------------------
        // SEARCH (FIXED RELATION + OR GROUPING)
        // --------------------------------------------------
        search
          ? {
              OR: [
                {
                  reference: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  note: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  tenant: {
                    is: {
                      name: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ],
            }
          : {},
      ],
    }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,

        orderBy: {
          paidAt: 'desc',
        },

        skip,
        take: pageSize,

        include: {
          tenant: true,

          allocations: {
            where: {
              isReversed: false,
            },
          },
        },
      }),

      prisma.payment.count({
        where,
      }),
    ])

    res.json({
      page,
      pageSize,
      total,
      items,
    })
  } catch (e) {
    console.error('Error listing payments:', e)

    res.status(500).json({
      error: e.message,
    })
  }
})


// ======================================================
// GET SINGLE PAYMENT
// ======================================================
paymentsRouter.get('/:id', async (req, res) => {

  try {

    const id =
      Number(req.params.id)

    const payment =
      await prisma.payment.findUnique({
        where: { id },

        include: {
          tenant: true,

          allocations: {
            where: {
              isReversed: false,
            },
          },
        },
      })

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
      })
    }

    res.json(payment)

  } catch (e) {

    console.error(
      'Error fetching payment:',
      e
    )

    res.status(500).json({
      error: e.message,
    })
  }
})


// ======================================================
// CREATE PAYMENT
// ======================================================
paymentsRouter.post('/', async (req, res) => {

  try {

    const {
      tenantId,
      amount,
      paidAt,
      method,
      reference,
      note,
    } = req.body

    if (!tenantId || !amount) {
      return res.status(400).json({
        error:
          'tenantId and amount are required',
      })
    }

    const result =
      await prisma.$transaction(
        async (tx) => {

          return applyPayment(
            {
              tenantId:
                Number(tenantId),

              amount:
                Number(amount),

              paidAt:
                paidAt
                  ? new Date(paidAt)
                  : new Date(),

              method,
              reference,
              note,
            },
            tx
          )
        }
      )

    res.status(201).json(result)

  } catch (e) {

    console.error(
      'Error creating payment:',
      e
    )

    res.status(500).json({
      error: e.message,
    })
  }
})


// ======================================================
// UPDATE PAYMENT
// Metadata-only update
// ======================================================
paymentsRouter.patch('/:id', async (req, res) => {

  try {

    const id =
      Number(req.params.id)

    const {
      paidAt,
      method,
      reference,
      note,
    } = req.body

    const updated =
      await prisma.payment.update({
        where: { id },

        data: {
          paidAt:
            paidAt
              ? new Date(paidAt)
              : undefined,

          method,
          reference,
          note,
        },

        include: {
          tenant: true,

          allocations: {
            where: {
              isReversed: false,
            },
          },
        },
      })

    res.json(updated)

  } catch (e) {

    console.error(
      'Payment update error:',
      e
    )

    res.status(500).json({
      error: e.message,
    })
  }
})


// ======================================================
// REVERSE PAYMENT
// ======================================================
paymentsRouter.patch('/:id/reverse', async (req, res) => {
  try {

    const id = Number(req.params.id)

    const result = await prisma.$transaction(async (tx) => {

      const payment = await tx.payment.findUnique({
        where: { id },

        include: {
          allocations: {
            where: {
              isReversed: false
            }
          }
        }
      })

      if (!payment) {
        throw new Error('NOT_FOUND')
      }

      if (payment.isReversed) {
        throw new Error('ALREADY_REVERSED')
      }

      const reversedAt = new Date()

      const affectedAllocations =
        payment.allocations

      // Reverse allocations

      for (const allocation of affectedAllocations) {

        await tx.paymentAllocation.update({
          where: {
            id: allocation.id
          },

          data: {
            isReversed: true,
            reversedAt,
            reversalReason:
              `Payment reversed (#${payment.id})`
          }
        })
      }

      // Reverse payment

      await tx.payment.update({
        where: { id },

        data: {
          isReversed: true,
          reversedAt,
          reversalReason:
            'Payment manually reversed'
        }
      })

      // Refresh payment snapshot

      await syncPaymentFinancials(
        tx,
        payment.id
      )

      // Refresh affected bills

      for (const allocation of affectedAllocations) {

        if (
          allocation.billType === 'rent' &&
          allocation.rentBillId
        ) {
          await syncRentBillFinancials(
            tx,
            allocation.rentBillId
          )
        }

        if (
          allocation.billType === 'water' &&
          allocation.waterBillId
        ) {
          await syncWaterBillFinancials(
            tx,
            allocation.waterBillId
          )
        }
      }

      return {
        reversedPaymentId: id
      }
    })

    res.json({
      ok: true,
      ...result
    })

  } catch (e) {

    if (e.message === 'NOT_FOUND') {
      return res.status(404).json({
        error: 'Payment not found'
      })
    }

    if (e.message === 'ALREADY_REVERSED') {
      return res.status(409).json({
        error: 'Payment has already been reversed'
      })
    }

    console.error(
      'Payment reversal error:',
      e
    )

    res.status(500).json({
      error: e.message
    })
  }
})

module.exports = paymentsRouter