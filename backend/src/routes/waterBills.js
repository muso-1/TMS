const express = require('express')
const { PrismaClient } = require('@prisma/client')

const { sendBillReminder } = require('../services/reminderService')
const { applyAvailableCreditToBill } = require('../services/applyAvailableCredit')

const {
  syncWaterBillFinancials,
  buildWaterBillResponse,
} = require('../services/syncWaterBillFinancials')

const {
  syncPaymentFinancials,
} = require('../services/syncPaymentFinancials')

const {
  getLatestUnitReading,
  getActiveLeaseForUnit,
} = require('../lib/water')

const waterBillingEngine = require('../services/waterBillingEngine')

const prisma = new PrismaClient()
const router = express.Router()

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
        error: 'No water bills provided.'
      })
    }

    const result =
      await waterBillingEngine.createMany(
        billsData
      )

    if (result.length) {
      await sendBillReminder(
        'water',
        {
          onlyNewBills: true,
          newBillIds: result.map(
            b => b.id
          )
        }
      )
    }

    res.status(201).json({
      message:
        'Water bills processed successfully',
      created: result,
    })

  } catch (err) {

    console.error(
      'Error creating water bills:',
      err
    )

    res.status(400).json({
      error: err.message
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

      const unitId =
        Number(req.params.unitId)

      if (!unitId) {
        return res.status(400).json({
          error: 'Invalid unit ID',
        })
      }

      const latest =
        await prisma.waterMeterReading.findFirst({
          where: {
            unitId,
            isVoided: false,
          },

          orderBy: {
            readingDate: 'desc',
          },
        })

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

router.get('/config/water-rate', async (req, res) => {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'WATER_DEFAULT_RATE' },
  })

  res.json({
    rate: Number(config?.value ?? 350),
  })
})


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

    const results =
      bills.map(
        buildWaterBillResponse
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

    const id =
      Number(req.params.id)

    const bill =
      await prisma.waterBill.findFirst({
        where: { id },

        include: {
          tenant: true,
          unit: true,

          allocations: {
            where: {
              billType: 'water',
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
        error:
          'Water bill not found.',
      })
    }

    const response =
      buildWaterBillResponse(
        bill
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
// ======================================================
router.put('/:id', async (req, res) => {

  try {

    const id =
      Number(req.params.id)

    const { dueDate } =
      req.body

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

    // ============================================
    // BLOCK EDITING IF ACTIVE ALLOCATIONS EXIST
    // ============================================
    const allocationCount =
      await prisma.paymentAllocation.count({
        where: {
          billType: 'water',
          waterBillId: id,
          isReversed: false,
        },
      })

    if (allocationCount > 0) {
      return res.status(400).json({
        error:
          'Cannot edit water bill with active payments applied.',
      })
    }

    const updated =
      await prisma.waterBill.update({
        where: { id },

        data: {
          dueDate:
            dueDate
              ? new Date(dueDate)
              : undefined,
        },

        include: {
          tenant: true,
          unit: true,
        },
      })

    await syncWaterBillFinancials(
      prisma,
      updated.id
    )

    const synced =
      await prisma.waterBill.findUnique({
        where: {
          id: updated.id,
        },

        include: {
          tenant: true,
          unit: true,
        },
      })

    res.json(
      buildWaterBillResponse(
        synced
      )
    )

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
router.patch('/:id/void', async (req, res) => {

  try {

    const id =
      Number(req.params.id)

    const { reason } =
      req.body

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

        // ============================================
        // FIND ACTIVE BILL
        // ============================================
        const bill =
          await tx.waterBill.findFirst({
            where: {
              id,
              isVoided: false,
            },
          })

        if (!bill) {
          throw new Error(
            'Active water bill not found.'
          )
        }

        // ============================================
        // ENSURE LATEST BILL ONLY
        // ============================================
        const latestBill =
          await tx.waterBill.findFirst({
            where: {
              unitId: bill.unitId,
              isVoided: false,
            },

            orderBy: [
              { dueDate: 'desc' },
              { createdAt: 'desc' },
            ],
          })

        if (
          !latestBill ||
          latestBill.id !== bill.id
        ) {
          throw new Error(
            'Only the latest water bill for a unit can be voided.'
          )
        }

        // ============================================
        // FETCH ACTIVE ALLOCATIONS
        // ============================================
        const allocations =
          await tx.paymentAllocation.findMany({
            where: {
              waterBillId: bill.id,
              isReversed: false,
            },
          })

        // ============================================
        // REVERSE ALLOCATIONS
        // ============================================
        for (const allocation of allocations) {

          await tx.paymentAllocation.update({
            where: {
              id: allocation.id,
            },

            data: {
              isReversed: true,
              reversedAt: new Date(),

              reversalReason:
                `Water bill voided: ${reason.trim()}`,
            },
          })

          // ============================================
          // RESYNC PAYMENT SNAPSHOTS
          // ============================================
          await syncPaymentFinancials(
            tx,
            allocation.paymentId
          )
        }

        // ============================================
        // VOID BILL
        // ============================================
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

        // ============================================
        // RESYNC BILL SNAPSHOTS
        // ============================================
        await syncWaterBillFinancials(
          tx,
          bill.id
        )

        // ============================================
        // VOID LINKED METER READING
        // ============================================
        if (bill.meterReadingId) {

          await tx.waterMeterReading.update({
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
          })
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
})

module.exports = router