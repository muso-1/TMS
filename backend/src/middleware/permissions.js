const PERMISSIONS =
  require('../utils/permissions')

function requirePermission(permission) {

  return (req, res, next) => {

    if (!req.user) {

      return res.status(401).json({
        message: 'Unauthorized'
      })

    }

    const allowedRoles =
      PERMISSIONS[permission]

    if (!allowedRoles) {

      return res.status(500).json({
        message: 'Permission not configured'
      })

    }

    if (
      !allowedRoles.includes(
        req.user.role
      )
    ) {

      return res.status(403).json({
        message: 'Forbidden'
      })

    }

    next()
  }
}

module.exports = {
  requirePermission
}