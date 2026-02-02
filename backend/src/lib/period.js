function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function resolvePeriod(req) {
  const now = new Date()

  const from = req.query.from
    ? new Date(String(req.query.from))
    : startOfMonth(now)

  const to = req.query.to
    ? new Date(String(req.query.to))
    : endOfMonth(now)

  return { from, to }
}

module.exports = { resolvePeriod }
