const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function backfillPayments() {
  const payments = await prisma.payment.findMany({
    include: {
      allocations: {
        where: {
          isReversed: false
        }
      }
    }
  })

  for (const payment of payments) {

    const totalAllocated = payment.allocations.reduce(
      (sum, a) => sum + (a.amount || 0),
      0
    )

    const amountReceived = payment.amountReceived ?? 0

    let unapplied = amountReceived - totalAllocated

    // ============================================
    // SAFETY GUARD (IMPORTANT)
    // ============================================
    if (unapplied < 0) {
      console.warn(
        `⚠ Payment #${payment.id} has negative unapplied amount. Clamping to 0.`
      )
      unapplied = 0
    }

    await prisma.payment.update({
      where: {
        id: payment.id
      },

      data: {
        totalAllocated,
        unappliedAmount: unapplied
      }
    })

    console.log(
      `Updated Payment #${payment.id} | allocated=${totalAllocated} | unapplied=${unapplied}`
    )
  }

  console.log('Payment backfill complete')
}

async function main() {
  try {
    await backfillPayments()
  } catch (error) {
    console.error('Backfill failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// IMPORTANT: actually run the script
main()