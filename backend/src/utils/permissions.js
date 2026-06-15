const PERMISSIONS = {

  CREATE_BILL: [
    'admin',
    'accountant'
  ],

  UPDATE_BILL: [
    'admin',
    'accountant'
  ],

  DELETE_BILL: [
    'admin'
  ],

  VOID_BILL: [
    'admin'
  ],

  RECORD_PAYMENT: [
    'admin',
    'accountant'
  ],

  VIEW_REPORTS: [
    'admin',
    'accountant'
  ],

  MANAGE_USERS: [
    'admin'
  ]
}

module.exports = PERMISSIONS