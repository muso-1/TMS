const prisma = require('../lib/prisma')

const {
  verifyAccessToken
} = require('../utils/jwt')

async function authenticate(
  req,
  res,
  next
) {

  try {

    const authHeader =
      req.headers.authorization

    if (!authHeader) {

      return res.status(401).json({
        message: 'Authorization header missing'
      })

    }

    const parts =
      authHeader.split(' ')

    if (
      parts.length !== 2 ||
      parts[0] !== 'Bearer'
    ) {

      return res.status(401).json({
        message: 'Invalid token format'
      })

    }

    const token = parts[1]

    const payload =
      verifyAccessToken(token)

    const user =
      await prisma.user.findUnique({
        where: {
          id: payload.userId
        }
      })

    if (!user) {

      return res.status(401).json({
        message: 'User not found'
      })

    }

    if (!user.isActive) {

      return res.status(403).json({
        message: 'Account disabled'
      })

    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    }

    next()

  } catch (error) {

    return res.status(401).json({
      message: 'Invalid token'
    })

  }
}

module.exports = authenticate