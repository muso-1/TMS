import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'

import {
  listPayments,
  reversePayment,
} from '../../api/payments'

import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import PaymentForm from '../../components/forms/PaymentForm'

import {
  formatDate,
  formatMoney,
} from '../../components/utils/format'

export default function Payments() {

  const queryClient = useQueryClient()

  // ==================================================
  // UI STATE (instant)
  // ==================================================
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // ==================================================
  // FILTER STATE (server-side only)
  // ==================================================
  const [filters, setFilters] = useState({
    tenantId: '',
    includeReversed: false,
    from: '',
    to: '',
  })

  // ==================================================
  // DEBOUNCE SEARCH
  // ==================================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  // ==================================================
  // FETCH PAYMENTS (React Query)
  // ==================================================
  const {
    data,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      'payments',
      debouncedSearch,
      filters.tenantId,
      filters.includeReversed,
      filters.from,
      filters.to,
    ],

    queryFn: () =>
      listPayments({
        search: debouncedSearch,
        tenantId: filters.tenantId,
        includeReversed: filters.includeReversed,
        from: filters.from,
        to: filters.to,
      }),

    keepPreviousData: true,
  })

  const payments = data?.items ?? []

  // ==================================================
  // MODAL STATE
  // ==================================================
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // ==================================================
  // REVERSE PAYMENT
  // ==================================================
  const handleReverse = async (id) => {
    const confirmed = confirm(
      'Reverse this payment?\n\nThis will reverse all allocations and recalculate affected bills.'
    )

    if (!confirmed) return

    try {
      await reversePayment(id)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['rent-bills'] }),
        queryClient.invalidateQueries({ queryKey: ['water-bills'] }),
      ])
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.error || 'Failed to reverse payment.')
    }
  }

  // ==================================================
  // COLUMNS (memoized for stability)
  // ==================================================
  const columns = useMemo(() => [
    { key: 'id', header: 'Payment #', cell: (p) => p.id },

    {
      key: 'status',
      header: 'Status',
      cell: (p) => (
        <span className={p.isReversed ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          {p.isReversed ? 'Reversed' : 'Active'}
        </span>
      ),
    },

    {
      key: 'tenant',
      header: 'Tenant',
      cell: (p) => (
        <span className={p.isReversed ? 'text-gray-400 line-through' : ''}>
          {p.tenant?.name || '—'}
        </span>
      ),
    },

    {
      key: 'amountReceived',
      header: 'Payment Amount',
      cell: (p) => formatMoney(p.amountReceived || 0),
    },

    { 
      key: 'totalAllocated', 
      header: 'Allocated', 
      cell: (p) => ( 
        <span className="text-blue-600"> 
          {formatMoney( p.totalAllocated || 0 )} 
        </span> 
      ), 
    }, 
    { 
      key: 'unappliedAmount', 
      header: 'Unapplied', 
      cell: (p) => ( 
        <span className={ p.unappliedAmount > 0 ? 'text-amber-600 font-medium' : 'text-green-600' } > 
          {formatMoney( p.unappliedAmount || 0 )} 
        </span> 
      ),
    }, 
    { key: 'allocations', 
      header: 'Allocations', 
      cell: (p) => p.allocations?.filter( a => !a.isReversed ).length || 0, 
    },

    {
      key: 'paidAt',
      header: 'Paid At',
      cell: (p) => formatDate(p.paidAt),
    },

    {
      key: 'actions',
      header: 'Actions',
      cell: (p) => (
        <div className="space-x-2">
          {!p.isReversed && (
            <button
              className="text-blue-600 hover:underline"
              onClick={() => {
                setEditing(p)
                setOpen(true)
              }}
            >
              Edit
            </button>
          )}

          {!p.isReversed && (
            <button
              className="text-red-600 hover:underline"
              onClick={() => handleReverse(p.id)}
            >
              Reverse
            </button>
          )}
        </div>
      ),
    },
  ], [])

  // ==================================================
  // RESET
  // ==================================================
  const handleReset = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setFilters({
      tenantId: '',
      includeReversed: false,
      from: '',
      to: '',
    })
  }

  // ==================================================
  // LOADING (initial only)
  // ==================================================
  if (isLoading && !data) {
    return <div>Loading payments...</div>
  }

  // ==================================================
  // UI
  // ==================================================
  return (
    <div className="space-y-4">

      {/* FILTERS */}
      <div className="flex gap-2 items-center flex-wrap">

        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search tenant, reference, or note"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="border px-3 py-2 rounded w-72"
        />

        {/* FROM */}
        <input
          type="date"
          value={filters.from}
          onChange={(e) =>
            setFilters(prev => ({ ...prev, from: e.target.value }))
          }
          className="border px-3 py-2 rounded"
        />

        {/* TO */}
        <input
          type="date"
          value={filters.to}
          onChange={(e) =>
            setFilters(prev => ({ ...prev, to: e.target.value }))
          }
          className="border px-3 py-2 rounded"
        />

        {/* INCLUDE REVERSED */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.includeReversed}
            onChange={(e) =>
              setFilters(prev => ({
                ...prev,
                includeReversed: e.target.checked,
              }))
            }
          />
          Show Reversed
        </label>

        {/* RESET */}
        <button
          className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
          onClick={handleReset}
        >
          Reset
        </button>

      </div>

      {/* ADD */}
      <button
        className="bg-black text-black px-4 py-2 rounded"
        onClick={() => {
          setEditing(null)
          setOpen(true)
        }}
      >
        Add Payment
      </button>

      {/* LOADING INDICATOR */}
      {isFetching && (
        <div className="text-sm text-gray-500">
          Updating payments...
        </div>
      )}

      {/* TABLE */}
      <Table columns={columns} data={payments} />

      {/* MODAL */}
      <Modal
        title={editing ? `Edit Payment #${editing.id}` : 'Record Payment'}
        open={open}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
      >
        <PaymentForm
          payment={editing}
          onClose={() => {
            setOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

    </div>
  )
}