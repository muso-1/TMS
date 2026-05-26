const express = require('express')
const { PrismaClient } = require('@prisma/client')

const { sendBillReminder } = require('../services/reminderService')

const {
  deriveBillStatus,
} = require('../utils/billing')

const {
  getLatestUnitReading,
  getActiveLeaseForUnit,
} = require('../lib/water')

const prisma = new PrismaClient()
const router = express.Router()

// ======================================================
// RESPONSE BUILDER
// ======================================================
function buildWaterBillResponse(
  bill,
  totalPaid = 0
) {
  const status = deriveBillStatus({
    amount: bill.amount,
    totalPaid,
    isVoided: bill.isVoided,
  })

  return {
    id: bill.id,

    tenantId: bill.tenantId,
    unitId: bill.unitId,

    meterReadingId:
      bill.meterReadingId,

    previousReading:
      bill.previousReading,

    currentReading:
      bill.currentReading,

    unitsUsed: bill.unitsUsed,

    amount: bill.amount,

    dueDate: bill.dueDate,

    // STATUS
    status,

    // FINANCIALS
    totalPaid,

    balance:
      bill.amount - totalPaid,

    // VOIDING
    isVoided: bill.isVoided,
    voidedAt: bill.voidedAt,
    voidReason: bill.voidReason,

    createdAt: bill.createdAt,

    tenant: bill.tenant,
    unit: bill.unit,
  }
}

// ======================================================
// CREATE WATER BILLS
// ======================================================
router.post('/', async (req, res) => {
  try {
    const billsData = Array.isArray(req.body)
      ? req.body
      : [req.body]

    if (!billsData.length) {
      return res.status(400).json({
        error:
          'No water bills provided.',
      })
    }

    const createdBills = []

    await prisma.$transaction(
      async (tx) => {
        for (const bill of billsData) {
          const {
            unitId,
            currentReading,
            dueDate,
          } = bill

          if (
            !unitId ||
            currentReading == null ||
            !dueDate
          ) {
            throw new Error(
              'unitId, currentReading and dueDate are required.'
            )
          }

          // 1. Active lease
          const lease =
            await getActiveLeaseForUnit(
              unitId,
              tx
            )

          if (!lease) {
            throw new Error(
              `No active lease found for unit ${unitId}`
            )
          }

          // 2. Latest valid reading
          const latestReading =
            await getLatestUnitReading(
              unitId,
              tx
            )

          const previousReading =
            latestReading?.reading ?? 0

          // 3. Usage
          const unitsUsed =
            currentReading -
            previousReading

          if (unitsUsed < 0) {
            throw new Error(
              'Current reading must be >= previous reading.'
            )
          }

          const ratePerUnit = 350

          const amount =
            unitsUsed * ratePerUnit

          // 4. Create meter reading
          const meterReading =
            await tx.waterMeterReading.create({
              data: {
                unitId,
                reading:
                  currentReading,
              },
            })

          // 5. Create bill
          const newBill =
            await tx.waterBill.create({
              data: {
                tenantId:
                  lease.tenantId,

                unitId,

                meterReadingId:
                  meterReading.id,

                previousReading,
                currentReading,

                unitsUsed,
                amount,

                dueDate:
                  new Date(dueDate),
              },

              include: {
                tenant: true,
                unit: true,
              },
            })

          createdBills.push(newBill)
        }
      }
    )

    if (createdBills.length) {
      await sendBillReminder(
        'water',
        {
          onlyNewBills: true,
          newBillIds:
            createdBills.map(
              (b) => b.id
            ),
        }
      )
    }

    const response =
      createdBills.map((bill) =>
        buildWaterBillResponse(
          bill,
          0
        )
      )

    res.status(201).json({
      message:
        'Water bills created successfully.',
      created: response,
    })
  } catch (error) {
    console.error(
      'Error creating water bills:',
      error
    )

    res.status(400).json({
      error: error.message,
    })
  }
})

// ======================================================
// LATEST UNIT READING
// ======================================================
router.get(
  '/unit/:unitId/latest-reading',
  async (req, res) => {
    try {
      const unitId = Number(
        req.params.unitId
      )

      if (!unitId) {
        return res.status(400).json({
          error:
            'Invalid unit ID',
        })
      }

      const latest =
        await prisma.waterMeterReading.findFirst(
          {
            where: {
              unitId,
            },

            orderBy: {
              readingDate:
                'desc',
            },
          }
        )

      const lease =
        await prisma.lease.findFirst({
          where: {
            unitId,
            status: 'active',
          },

          include: {
            tenant: true,
          },
        })

      res.json({
        previousReading:
          latest?.reading ?? 0,

        tenant:
          lease?.tenant ?? null,
      })
    } catch (error) {
      console.error(error)

      res.status(500).json({
        error:
          'Error fetching latest reading',
      })
    }
  }
)

// ======================================================
// LIST WATER BILLS
// ======================================================
router.get('/', async (req, res) => {
  try {
    const bills =
      await prisma.waterBill.findMany({
        include: {
          tenant: true,
          unit: true,
        },

        orderBy: {
          dueDate: 'desc',
        },
      })

    const billIds = bills.map(
      (b) => b.id
    )

    const allocations =
      await prisma.paymentAllocation.groupBy(
        {
          by: ['waterBillId'],

          where: {
            billType: 'water',

            waterBillId: {
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
          a.waterBillId,
          a._sum.amount || 0,
        ])
      )

    const results = bills.map(
      (bill) => {
        const totalPaid =
          allocationMap[bill.id] || 0

        return buildWaterBillResponse(
          bill,
          totalPaid
        )
      }
    )

    res.json(results)
  } catch (error) {
    console.error(
      'Error fetching water bills:',
      error
    )

    res.status(500).json({
      error:
        'Error fetching water bills.',
    })
  }
})

// ======================================================
// GET SINGLE WATER BILL
// ======================================================
router.get('/:id', async (req, res) => {
  try {
    const id = Number(
      req.params.id
    )

    const bill =
      await prisma.waterBill.findFirst(
        {
          where: {
            id,
            isVoided: false,
          },

          include: {
            tenant: true,
            unit: true,

            allocations: {
              where: {
                billType:
                  'water',
              },

              include: {
                payment: true,
              },
            },
          },
        }
      )

    if (!bill) {
      return res.status(404).json({
        error:
          'Water bill not found.',
      })
    }

    const totalPaid =
      bill.allocations.reduce(
        (sum, allocation) =>
          sum + allocation.amount,
        0
      )

    const response =
      buildWaterBillResponse(
        bill,
        totalPaid
      )

    res.json({
      ...response,
      allocations:
        bill.allocations,
    })
  } catch (error) {
    console.error(
      'Error fetching water bill:',
      error
    )

    res.status(500).json({
      error:
        'Error fetching water bill.',
    })
  }
})

// ======================================================
// UPDATE WATER BILL
// Only due date editable
// ======================================================
router.put('/:id', async (req, res) => {
  try {
    const id = Number(
      req.params.id
    )

    const { dueDate } = req.body

    const existing =
      await prisma.waterBill.findFirst({
        where: {
          id,
          isVoided: false,
        },

        include: {
          tenant: true,
          unit: true,
        },
      })

    if (!existing) {
      return res.status(404).json({
        error:
          'Active water bill not found.',
      })
    }

    // Prevent editing allocated bills
    const allocationCount =
      await prisma.paymentAllocation.count(
        {
          where: {
            billType: 'water',
            waterBillId: id,
          },
        }
      )

    if (allocationCount > 0) {
      return res.status(400).json({
        error:
          'Cannot edit water bill with payments applied.',
      })
    }

    const updated =
      await prisma.waterBill.update({
        where: { id },

        data: {
          dueDate: dueDate
            ? new Date(dueDate)
            : undefined,
        },

        include: {
          tenant: true,
          unit: true,
        },
      })

    const response =
      buildWaterBillResponse(
        updated,
        0
      )

    res.json(response)
  } catch (error) {
    console.error(
      'Error updating water bill:',
      error
    )

    res.status(500).json({
      error: error.message,
    })
  }
})

// ======================================================
// VOID WATER BILL
// ======================================================
router.patch(
  '/:id/void',
  async (req, res) => {
    try {
      const id = Number(
        req.params.id
      )

      const { reason } = req.body

      if (
        !reason ||
        !reason.trim()
      ) {
        return res.status(400).json({
          error:
            'Void reason is required.',
        })
      }

      await prisma.$transaction(
        async (tx) => {
          // 1. Find active bill
          const bill =
            await tx.waterBill.findFirst(
              {
                where: {
                  id,
                  isVoided: false,
                },

                include: {
                  allocations: true,
                },
              }
            )

          if (!bill) {
            throw new Error(
              'Active water bill not found.'
            )
          }

          // 2. Prevent voiding allocated bills
          if (
            bill.allocations.length >
            0
          ) {
            throw new Error(
              'Cannot void a bill with payments allocated.'
            )
          }

          // 3. Ensure latest bill
          const latestBill =
            await tx.waterBill.findFirst(
              {
                where: {
                  unitId:
                    bill.unitId,

                  isVoided: false,
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
            throw new Error(
              'Latest bill lookup failed.'
            )
          }

          if (
            latestBill.id !== bill.id
          ) {
            throw new Error(
              'Only the latest water bill for a unit can be voided.'
            )
          }

          // 4. Void bill
          await tx.waterBill.update({
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
          })

          // 5. Void linked meter reading
          if (bill.meterReadingId) {
            await tx.waterMeterReading.update(
              {
                where: {
                  id: bill.meterReadingId,
                },

                data: {
                  isVoided: true,

                  voidedAt:
                    new Date(),

                  voidReason:
                    `Voided with bill #${bill.id}: ${reason.trim()}`,
                },
              }
            )
          }
        }
      )

      res.json({
        message:
          'Water bill voided successfully.',
      })
    } catch (error) {
      console.error(
        'Error voiding water bill:',
        error
      )

      res.status(400).json({
        error: error.message,
      })
    }
  }
)

module.exports = router