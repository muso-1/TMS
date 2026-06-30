const express = require('express')
const router = express.Router()

const { resolvePeriod } = require('../lib/period')

const {
  getBillSumsByPeriod,
  getRentSummary,
  getWaterSummary,
} = require('../services/dashboard.service')

const authenticate = require('../middleware/authenticate')

router.get('/summary', authenticate, async (req, res) => {
  try {
    const { from, to } = resolvePeriod(req)

    console.log('Dashboard period:', { from, to })

    const [
      ledgerSums,
      rentSnapshot,
      waterSnapshot,
    ] = await Promise.all([
      getBillSumsByPeriod(from, to),
      getRentSummary(from, to),
      getWaterSummary(from, to),
    ])

    // =====================================================
    // LEDGER (SOURCE OF TRUTH FOR MONEY FLOW)
    // =====================================================
    const rentCollections = ledgerSums?.rentPaid ?? 0
    const waterCollections = ledgerSums?.waterPaid ?? 0

    const collections = {
      rent: rentCollections,
      water: waterCollections,
      total: rentCollections + waterCollections,
    }

    // =====================================================
    // RENT SNAPSHOT (BILL STATE)
    // =====================================================
    const rent = {
      billed: rentSnapshot?.billed ?? 0,
      paid: rentSnapshot?.paid ?? 0,
      outstanding: rentSnapshot?.outstanding ?? 0,
    }

    const rentBills = {
      fullyPaid: rentSnapshot?.fullyPaid ?? 0,
      partiallyPaid: rentSnapshot?.partiallyPaid ?? 0,
      unpaid: rentSnapshot?.unpaid ?? 0,
      overdue: rentSnapshot?.overdue ?? 0,
    }

    // =====================================================
    // WATER SNAPSHOT (BILL STATE)
    // =====================================================
    const water = {
      billed: waterSnapshot?.billed ?? 0,
      paid: waterSnapshot?.paid ?? 0,
      outstanding: waterSnapshot?.outstanding ?? 0,
    }

    const waterBills = {
      fullyPaid: waterSnapshot?.fullyPaid ?? 0,
      partiallyPaid: waterSnapshot?.partiallyPaid ?? 0,
      unpaid: waterSnapshot?.unpaid ?? 0,
      overdue: waterSnapshot?.overdue ?? 0,
    }

    // =====================================================
    // RESPONSE (CLEAR HYBRID SEPARATION)
    // =====================================================
    res.json({
      period: { from, to },

      collections, // ledger-only

      rent,
      water,

      rentBills,
      waterBills,
    })

  } catch (e) {
    console.error('Dashboard summary error:', e)

    res.status(500).json({
      error: e.message,
    })
  }
})

module.exports = router