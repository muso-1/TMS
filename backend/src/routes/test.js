const express = require('express')

const router = express.Router()

const authenticate =
  require('../middleware/authenticate')

const {
  requirePermission
} = require('../middleware/permissions')

router.get(
  '/',
  authenticate,
  (req, res) => {

    res.json({
      message: 'Authorized',
      user: req.user,
      role: req.role
    })

  }
)

router.post(
  '/create',
  authenticate,
  requirePermission('CREATE_BILL'),
  (req, res) => {

    res.json({
      message: 'Bill created'
    })

  }
)

router.post(
  '/void',
  authenticate,
  requirePermission('VOID_BILL'),
  (req, res) => {

    res.json({
      message: 'Bill voided'
    })

  }
)

module.exports = router