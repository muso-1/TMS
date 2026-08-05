const {
  PrismaClient,
  Prisma
} = require('@prisma/client')

const prisma = new PrismaClient()

const {
  getActiveLeaseForUnit
} = require('../lib/water')

const {
  applyAvailableCreditToBill
} = require('./applyAvailableCredit')

const {
  syncWaterBillFinancials
} = require('./syncWaterBillFinancials')
const { getWaterRate } = require('../lib/water')

const waterBillingEngine = {

  // ==================================================
  // CREATE MANY BILLS
  // ==================================================
  async createMany(bills) {

    return prisma.$transaction(async (tx) => {

      const results = []

      for (const bill of bills) {

        const created =
          await this.createOne(
            bill,
            tx
          )

        if (created) {
          results.push(created)
        }
      }

      return results
    })
  },

  // ==================================================
  // CREATE ONE BILL
  // ==================================================
  async createOne(input, tx = prisma) {

    const {
      unitId,
      currentReading,
      dueDate,
      readingDate = new Date(),
      billingCycle
    } = input

    if (!unitId) {
      throw new Error(
        'unitId is required'
      )
    }

    if (currentReading == null) {
      throw new Error(
        'currentReading is required'
      )
    }

    if (!billingCycle && !dueDate) {
      throw new Error(
        'Either dueDate or billingCycle is required'
      )
    }

    // ----------------------------------------------
    // IDEMPOTENCY KEY
    // ----------------------------------------------
    const cycleKey =
      billingCycle ??
      this._deriveCycleKey(dueDate)

    // ----------------------------------------------
    // CHECK EXISTING BILL
    // ----------------------------------------------
    const existing =
      await tx.waterBill.findUnique({
        where: {
          unitId_billingCycle: {
            unitId,
            billingCycle: cycleKey
          }
        },
        include: {
          tenant: true,
          unit: true
        }
      })

    if (existing) {
      return existing
    }

    // ----------------------------------------------
    // ACTIVE LEASE
    // ----------------------------------------------
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

    // ----------------------------------------------
    // PREVIOUS READING
    // ----------------------------------------------
    const previousReading =
      await this._getPreviousReading(
        unitId,
        tx
      )

    const unitsUsed =
      currentReading -
      previousReading

    if (unitsUsed < 0) {
      throw new Error(
        `Current reading (${currentReading}) cannot be less than previous reading (${previousReading})`
      )
    }

    // ----------------------------------------------
    // BILL CALCULATION
    // ----------------------------------------------
    const ratePerUnit = await getWaterRate(tx)

    const amount =
      unitsUsed *
      ratePerUnit

    let bill

    try {

      // --------------------------------------------
      // CREATE OR REUSE METER READING
      // --------------------------------------------
      const meterReading =
        await tx.waterMeterReading.upsert({
          where: {
            unitId_billingCycle: {
              unitId,
              billingCycle: cycleKey
            }
          },

          update: {},

          create: {
            unitId,
            billingCycle: cycleKey,
            reading: currentReading,
            readingDate
          }
        })

      // --------------------------------------------
      // CREATE BILL
      // --------------------------------------------
      bill =
        await tx.waterBill.create({
          data: {
            tenantId:
              lease.tenantId,

            unitId,

            meterReadingId:
              meterReading.id,

            billingCycle:
              cycleKey,

            previousReading,
            currentReading,
            unitsUsed,

            ratePerUnit,

            amount,

            outstandingAmount:
              amount,

            dueDate:
              new Date(dueDate)
          }
        })

    } catch (error) {

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {

        return await tx.waterBill.findUnique({
          where: {
            unitId_billingCycle: {
              unitId,
              billingCycle:
                cycleKey
            }
          },

          include: {
            tenant: true,
            unit: true
          }
        })
      }

        throw error
    }

    // ----------------------------------------------
    // APPLY AVAILABLE CREDIT
    // ----------------------------------------------
    await applyAvailableCreditToBill({
      tx,
      tenantId:
        lease.tenantId,
      billType: 'water',
      billId: bill.id,
      billAmount: amount
    })

    // ----------------------------------------------
    // SYNC SNAPSHOTS
    // ----------------------------------------------
    await syncWaterBillFinancials(
      tx,
      bill.id
    )

    // ----------------------------------------------
    // RETURN FRESH BILL
    // ----------------------------------------------
    return await tx.waterBill.findUnique({
      where: {
        id: bill.id
      },
      include: {
        tenant: true,
        unit: true
      }
    })
  },

  // ==================================================
  // GET PREVIOUS READING
  // ==================================================
  async _getPreviousReading(
    unitId,
    billingCycle,
    tx
  ) {

    const lastReading =
      await tx.waterMeterReading.findFirst({
        where: {
          unitId,
          isVoided: false,
          billingCycle: {
            lt: billingCycle
          }
        },

        orderBy: {
          billingCycle: 'desc'
        }
      })

    return lastReading?.reading ?? 0
  },

  // ==================================================
  // BILLING CYCLE
  // ==================================================
  _deriveCycleKey(date) {

    const d =
      new Date(date)

    return `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, '0')}`
  }
}

module.exports =
  waterBillingEngine