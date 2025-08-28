export const formatMoney = (n) => new Intl.NumberFormat().format(Number(n || 0))
export const formatDate  = (d) => d ? new Date(d).toLocaleDateString() : '—'
export const monthKey    = (d) => new Date(d).toISOString().slice(0,7) // YYYY-MM
