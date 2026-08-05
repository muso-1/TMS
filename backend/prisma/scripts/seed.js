require('dotenv').config()

const { PrismaClient } =
  require('@prisma/client')

const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {

  const passwordHash =
    await bcrypt.hash(
      'Admin@123',
      10
    )

  await prisma.user.upsert({

    where: {
      email: 'admin@test.com'
    },

    update: {},

    create: {

      email: 'admin@test.com',

      passwordHash,

      role: 'admin',

      isActive: true
    }
  })

  console.log(
    'Admin user created'
  )

  await prisma.user.upsert({
    where: {
      email: 'accountant@test.com'
    },

    update: {},
    create: {
      email: 'accountant@test.com',
      passwordHash,
      role: 'accountant',
      isActive: true
    }
  })

  console.log(
    'Accountant user created'
  )

  await prisma.user.upsert({
    where: {
      email: 'user@test.com'
    },

    update: {},
    create: {
      email: 'user@test.com',
      passwordHash,
      role: 'user',
      isActive: true
    }
  })

  console.log(
    'Regular user created'
  )
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })