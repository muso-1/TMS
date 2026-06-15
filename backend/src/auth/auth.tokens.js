const {
  signAccessToken,
  signRefreshToken
} = require('../utils/jwt')

function generateTokens(user) {

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  }

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload)
  }
}

module.exports = {
  generateTokens
}