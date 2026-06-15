const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function getWaterRate(tx = prisma) {
  const config = await tx.systemConfig.findUnique({
    where: { key: 'WATER_DEFAULT_RATE' },
  })

  return Number(config?.value ?? 350)
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
  getWaterRate,
  getActiveLeaseForUnit,
}