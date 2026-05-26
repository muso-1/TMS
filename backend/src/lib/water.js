const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function getLatestUnitReading(unitId, tx = prisma) {
  const latest = await tx.waterMeterReading.findFirst({
    where: { 
        unitId,
        isVoided: false,
     },
    orderBy: {
      readingDate: 'desc',
    },
  })

  return latest?.reading ?? 0
}

async function getActiveLeaseForUnit(unitId, tx = prisma) {
  return await tx.lease.findFirst({
    where: {
      unitId,
      status: 'active',
    },
    include: {
      tenant: true,
      unit: true,
    },
  })
}

module.exports = {
  getLatestUnitReading,
  getActiveLeaseForUnit,
}