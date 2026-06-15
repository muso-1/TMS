const prisma = require('../lib/prisma')

const {
  comparePassword
} = require('../utils/password')

const {
  generateTokens
} = require('./auth.tokens')

async function login(email, password) {

  const user = await prisma.user.findUnique({
    where: {
      email
    }
  })

  if (!user) {
    throw new Error('Invalid credentials')
  }

  if (!user.isActive) {
    throw new Error('Account disabled')
  }

  const passwordValid =
    await comparePassword(
      password,
      user.passwordHash
    )

  if (!passwordValid) {
    throw new Error('Invalid credentials')
  }

  return generateTokens(user)
}

module.exports = {
  login
}