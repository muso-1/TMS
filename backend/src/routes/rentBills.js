const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')

const {
  createRentBillWithCredit
} = require('../services/rentBillService')

const {
  deriveBillStatus
} = require('../utils/billing')

const prisma = new PrismaClient()
const rentBillsRouter = Router()

// =====================================================
// HELPERS
// =====================================================

function buildRentBillResponse(
  bill,
  totalPaid = 0
) {
  const status =
    deriveBillStatus({
      amount: bill.amount,
      totalPaid,
      isVoided: bill.isVoided,
    })

  const rawBalance =
    bill.amount - totalPaid

  return {
    id: bill.id,

    amount: bill.amount,

    dueDate: bill.dueDate,

    // VOIDING
    isVoided: bill.isVoided,
    voidedAt: bill.voidedAt,
    voidReason: bill.voidReason,

    // FINANCIALS
    status,

    totalPaid,

    balance:
      rawBalance > 0
        ? rawBalance
        : 0,

    credit:
      rawBalance < 0
        ? Math.abs(rawBalance)
        : 0,

    // REMINDERS
    reminderSent:
      bill.reminderSent,

    reminderSentAt:
      bill.reminderSentAt,

    // RELATIONS
    lease: bill.lease && {
      id: bill.lease.id,

      monthlyRent:
        bill.lease.monthlyRent,

      startDate:
        bill.lease.startDate,

      endDate:
        bill.lease.endDate,

      tenant:
        bill.lease.tenant,

      unit:
        bill.lease.unit,
    },
  }
}

// =====================================================
// LIST RENT BILLS
// =====================================================

rentBillsRouter.get(
  '/',
  async (req, res) => {
    try {
      const bills =
        await prisma.rentBill.findMany({
          include: {
            lease: {
              include: {
                tenant: true,
                unit: true,
              },
            },
          },

          orderBy: [
            {
              dueDate: 'desc',
            },
          ],
        })

      const billIds = bills.map(
        (b) => b.id
      )

      const allocations =
        await prisma.paymentAllocation.groupBy(
          {
            by: ['rentBillId'],

            where: {
              billType: 'rent',

              rentBillId: {
                in: billIds,
              },
            },

            _sum: {
              amount: true,
            },
          }
        )

      const allocationMap =
        Object.fromEntries(
          allocations.map((a) => [
            a.rentBillId,
            a._sum.amount || 0,
          ])
        )

      const results = bills.map(
        (bill) => {
          const totalPaid =
            allocationMap[
              bill.id
            ] || 0

          return buildRentBillResponse(
            bill,
            totalPaid
          )
        }
      )

      res.json(results)

    } catch (e) {
      console.error(
        'Error fetching rent bills:',
        e
      )

      res.status(500).json({
        error: e.message,
      })
    }
  }
)

// =====================================================
// GET SINGLE RENT BILL
// =====================================================

rentBillsRouter.get(
  '/:id',
  async (req, res) => {
    try {
      const id = Number(
        req.params.id
      )

      const bill =
        await prisma.rentBill.findFirst(
          {
            where: {
              id,
            },

            include: {
              lease: {
                include: {
                  tenant: true,
                  unit: true,
                },
              },

              allocations: {
                where: {
                  billType: 'rent',
                },
              },
            },
          }
        )

      if (!bill) {
        return res.status(404).json({
          error:
            'Rent bill not found',
        })
      }

      const totalPaid =
        bill.allocations.reduce(
          (sum, allocation) =>
            sum + allocation.amount,
          0
        )

      const response =
        buildRentBillResponse(
          bill,
          totalPaid
        )

      res.json(response)

    } catch (e) {
      console.error(
        'Error fetching rent bill:',
        e
      )

      res.status(500).json({
        error: e.message,
      })
    }
  }
)

// =====================================================
// CREATE RENT BILL
// =====================================================

rentBillsRouter.post(
  '/',
  async (req, res) => {
    try {
      const {
        leaseId,
        dueDate,
      } = req.body

      if (
        !leaseId ||
        !dueDate
      ) {
        return res.status(400).json(
          {
            error:
              'leaseId and dueDate are required',
          }
        )
      }

      const lease =
        await prisma.lease.findUnique(
          {
            where: {
              id: Number(
                leaseId
              ),
            },

            include: {
              tenant: true,
              unit: true,
            },
          }
        )

      if (!lease) {
        return res.status(404).json(
          {
            error:
              'Lease not found',
          }
        )
      }

      const bill =
        await prisma.$transaction(
          async (tx) => {
            return createRentBillWithCredit(
              {
                tx,

                lease,

                amount:
                  lease.monthlyRent,

                dueDate:
                  new Date(
                    dueDate
                  ),
              }
            )
          }
        )

      const fullBill =
        await prisma.rentBill.findUnique(
          {
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
          }
        )

      const response =
        buildRentBillResponse(
          fullBill,
          0
        )

      res.status(201).json(
        response
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
  }
)

// =====================================================
// VOID RENT BILL
// =====================================================

rentBillsRouter.patch(
  '/:id/void',
  async (req, res) => {
    try {
      const id = Number(
        req.params.id
      )

      const { reason } =
        req.body || {}

      if (
        !reason ||
        !reason.trim()
      ) {
        return res.status(400).json(
          {
            error:
              'Void reason is required',
          }
        )
      }

      await prisma.$transaction(
        async (tx) => {

          // -----------------------------------
          // FIND ACTIVE BILL
          // -----------------------------------

          const bill =
            await tx.rentBill.findFirst(
              {
                where: {
                  id,
                  isVoided: false,
                },

                include: {
                  lease: true,
                },
              }
            )

          if (!bill) {
            return res.status(404).json(
              {
                error:
                  'Active rent bill not found',
              }
            )
          }

          // -----------------------------------
          // PREVENT VOIDING ALLOCATED BILLS
          // -----------------------------------

          const allocationCount =
            await tx.paymentAllocation.count(
              {
                where: {
                  billType:
                    'rent',

                  rentBillId:
                    id,
                },
              }
            )

          if (
            allocationCount > 0
          ) {
            return res.status(400).json(
              {
                error:
                  'Cannot void rent bill with applied payments or credits',
              }
            )
          }

          // -----------------------------------
          // ONLY LATEST BILL MAY BE VOIDED
          // -----------------------------------

          const latestBill =
            await tx.rentBill.findFirst(
              {
                where: {
                  leaseId:
                    bill.leaseId,

                  isVoided:
                    false,
                },

                orderBy: [
                  {
                    dueDate:
                      'desc',
                  },

                  {
                    createdAt:
                      'desc',
                  },
                ],
              }
            )

          if (!latestBill) {
            return res.status(400).json(
              {
                error:
                  'Latest rent bill lookup failed',
              }
            )
          }

          if (
            latestBill.id !==
            bill.id
          ) {
            return res.status(400).json(
              {
                error:
                  'Only the latest rent bill for this lease can be voided',
              }
            )
          }

          // -----------------------------------
          // VOID BILL
          // -----------------------------------

          await tx.rentBill.update(
            {
              where: {
                id: bill.id,
              },

              data: {
                isVoided: true,

                voidedAt:
                  new Date(),

                voidReason:
                  reason.trim(),
              },
            }
          )
        }
      )

      res.json({
        message:
          'Rent bill voided successfully',
      })

    } catch (e) {
      console.error(
        'Error voiding rent bill:',
        e
      )

      res.status(500).json({
        error: e.message,
      })
    }
  }
)

module.exports =
  rentBillsRouter