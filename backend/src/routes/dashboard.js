const express = require('express')
const router = express.Router()

const { resolvePeriod } = require('../lib/period')

const {
  getAllocationSumsByBillPeriod,
  getRentBilled,
  getRentBillsInPeriod,
  getRentAllocationsByBill,
  classifyRentBills
} = require('../services/dashboard.service')

/*
  Dashboard summary endpoint
  - Collections: allocations tied to bills due in period
  - Rent billed: rent due in period
  - Rent bill stats: lifetime payment status per rent bill
 */
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = resolvePeriod(req)

    console.log('Dashboard period:', { from, to })

    const [
      allocationSums,
      rentBilled,
      rentBills,
      rentAllocationsByBill
    ] = await Promise.all([
      getAllocationSumsByBillPeriod(from, to),
      getRentBilled(from, to),
      getRentBillsInPeriod(from, to),
      getRentAllocationsByBill()
    ])

    const rentStats = classifyRentBills(rentBills, rentAllocationsByBill)

    res.json({
      period: { from, to },

      collections: {
        rent: allocationSums.rent,
        water: allocationSums.water,
        total: allocationSums.rent + allocationSums.water
      },

      rent: {
        billed: rentBilled,
        paid: rentStats.totalPaid,
        outstanding: rentBilled - rentStats.totalPaid
      },

      rentBills: {
        fullyPaid: rentStats.fullyPaid,
        partiallyPaid: rentStats.partiallyPaid,
        unpaid: rentStats.unpaid
      }
    })
  } catch (e) {
    console.error('Dashboard summary error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
