// src/utils/billing.js

export function deriveBillStatus({
  amount,
  totalPaid,
  isVoided,
}) {
  if (isVoided) {
    return 'voided'
  }

  if (totalPaid <= 0) {
    return 'pending'
  }

  if (totalPaid < amount) {
    return 'partial'
  }

  if (totalPaid === amount) {
    return 'paid'
  }

  return 'overpaid'
}