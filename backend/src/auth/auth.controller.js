const authService =
  require('./auth.service')

async function login(req, res) {

  try {

    const { email, password } = req.body

    const tokens =
      await authService.login(
        email,
        password
      )

    return res.status(200).json(tokens)

  } catch (error) {

    return res.status(401).json({
      message: error.message
    })

  }
}

module.exports = {
  login
}