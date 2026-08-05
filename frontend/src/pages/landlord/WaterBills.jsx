import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  listWaterBills,
  voidWaterBill,
} from '../../api/waterBills'

import {
  sendReminder,
  sendBulkReminders,
} from '../../api/reminders'

import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'

import WaterBillForm from '../../components/forms/WaterBillForm'
import WaterBulkBillingForm from '../../components/forms/WaterBulkBillingForm'
import VoidWaterBillForm from '../../components/forms/VoidWaterBillForm'

import { useState } from 'react'

import {
  formatDate,
  formatMoney,
} from '../../components/utils/format'

const getStatusStyles = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700 border-green-200'

    case 'partially_paid':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'

    case 'overdue':
      return 'bg-red-100 text-red-700 border-red-200'

    case 'voided':
      return 'bg-gray-100 text-gray-500 border-gray-200'

    default:
      return 'bg-blue-100 text-blue-700 border-blue-200'
  }
}

const getOutstandingStyles = (bill) => {
  const amount = bill.outstandingAmount || 0

  if (bill.status === 'voided') {
    return 'text-gray-400'
  }

  if (amount === 0) {
    return 'text-green-600 font-semibold'
  }

  if (amount > 0 && amount <= bill.amount * 0.3) {
    return 'text-yellow-600 font-semibold'
  }

  return 'text-red-600 font-bold'
}

export default function WaterBills() {

  const queryClient = useQueryClient()

  // =====================================================
  // DATA
  // =====================================================
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['water-bills'],
    queryFn: listWaterBills,
  })

  // =====================================================
  // MODAL STATE
  // =====================================================
  const [singleOpen, setSingleOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  const [voidModalOpen, setVoidModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)

  const [loadingReminder, setLoadingReminder] = useState(false)
  const [voidingId, setVoidingId] = useState(null)

  // =====================================================
  // REMINDERS
  // =====================================================
  const handleSendReminder = async (billId) => {
    try {
      setLoadingReminder(true)

      const res = await sendReminder('water', billId)

      alert(res.message || 'Reminder sent successfully.')

      queryClient.invalidateQueries({
        queryKey: ['water-bills'],
      })

    } catch (err) {
      console.error(err)

      alert(
        err?.response?.data?.error ||
        'Failed to send reminder.'
      )

    } finally {
      setLoadingReminder(false)
    }
  }

  const handleSendBulkReminders = async () => {
    const confirmed = confirm(
      'Send reminders for all outstanding water bills?'
    )

    if (!confirmed) return

    try {
      setLoadingReminder(true)

      const res = await sendBulkReminders('water')

      alert(res.message || 'Bulk reminders sent successfully.')

      queryClient.invalidateQueries({
        queryKey: ['water-bills'],
      })

    } catch (err) {
      console.error(err)

      alert(
        err?.response?.data?.error ||
        'Failed to send bulk reminders.'
      )

    } finally {
      setLoadingReminder(false)
    }
  }

  // =====================================================
  // VOID BILL
  // =====================================================
  const openVoidModal = (bill) => {
    setSelectedBill(bill)
    setVoidModalOpen(true)
  }

  const confirmVoidBill = async (reason) => {
    try {
      setVoidingId(selectedBill.id)

      const res = await voidWaterBill(
        selectedBill.id,
        reason
      )

      alert(res.message || 'Bill voided successfully.')

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['water-bills'] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])

      setVoidModalOpen(false)
      setSelectedBill(null)

    } catch (err) {
      console.error(err)

      alert(
        err?.response?.data?.error ||
        'Failed to void bill.'
      )

    } finally {
      setVoidingId(null)
    }
  }

  //const isAdmin = user?.role === 'admin'

  // =====================================================
  // TABLE
  // =====================================================
  const columns = [
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (r) => r.tenant?.name ?? r.tenantId,
    },

    {
      key: 'previousReading',
      header: 'Prev',
    },

    {
      key: 'currentReading',
      header: 'Current',
    },

    {
      key: 'usage',
      header: 'Usage',
      cell: (r) => r.unitsUsed,
    },

    {
      key: 'amount',
      header: 'Amount',
      cell: (r) => formatMoney(r.amount),
    },

    {
      key: 'paid',
      header: 'Paid',
      cell: (r) => formatMoney(r.totalWaterPaid || 0),
    },

    {
      key: 'outstanding',
      header: 'Outstanding',
      cell: (r) => (
        <span className={getOutstandingStyles(r)}>
          {formatMoney(r.outstandingAmount || 0)}
        </span>
      ),
    },

    {
      key: 'dueDate',
      header: 'Due',
      cell: (r) => formatDate(r.dueDate),
    },

    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const label =
          r.status === 'voided'
            ? 'Voided'
            : r.status === 'paid'
            ? 'Paid'
            : r.status === 'partially_paid'
            ? 'Partial'
            : r.status === 'overdue'
            ? 'Overdue'
            : 'Unpaid'

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs border ${getStatusStyles(
              r.status
            )}`}
          >
            {label}
          </span>
        )
      },
    },

    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => {
        const canRemind =
          r.status !== 'voided' &&
          r.outstandingAmount > 0

        const canVoid = r.status !== 'voided'

        return (
          <div className="flex gap-3 items-center">

            {canRemind && (
              <button
                onClick={() => handleSendReminder(r.id)}
                disabled={loadingReminder}
                className="text-blue-600 hover:underline"
              >
                Reminder
              </button>
            )}

            {canVoid && (
              <button
                onClick={() => openVoidModal(r)}
                disabled={voidingId === r.id}
                className="text-red-600 hover:underline"
              >
                {voidingId === r.id ? 'Voiding...' : 'Void'}
              </button>
            )}

          </div>
        )
      },
    },
  ]

  // =====================================================
  // LOADING
  // =====================================================
  if (isLoading) return <div>Loading...</div>

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="space-y-4">

      {/* ACTION BAR */}
      <div className="flex justify-between items-center">

        <div className="flex gap-3">

          {/* SINGLE BILL */}
          <button
            onClick={() => setSingleOpen(true)}
            className="bg-black text-black px-4 py-2 rounded"
          >
            Create Water Bill
          </button>

          {/* BULK BILL */}
          <button
            onClick={() => setBulkOpen(true)}
            className="bg-green-600 text-black px-4 py-2 rounded"
          >
            Bulk Generate Bills
          </button>

        </div>

        {/* BULK REMINDERS */}
        <button
          onClick={handleSendBulkReminders}
          disabled={loadingReminder}
          className="bg-blue-600 text-black px-4 py-2 rounded"
        >
          {loadingReminder ? 'Sending...' : 'Send All Reminders'}
        </button>

      </div>

      {/* TABLE */}
      <Table columns={columns} data={bills} />

      {/* ========================= */}
      {/* SINGLE BILL MODAL */}
      {/* ========================= */}
      <Modal
        title="Create Water Bill"
        open={singleOpen}
        onClose={() => setSingleOpen(false)}
      >
        <WaterBillForm
          onClose={() => setSingleOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['water-bills'])
          }}
        />
      </Modal>

      {/* ========================= */}
      {/* BULK BILL MODAL */}
      {/* ========================= */}
      <Modal
        title="Bulk Generate Water Bills"
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      >
        <WaterBulkBillingForm
          onClose={() => setBulkOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['water-bills'])
          }}
        />
      </Modal>

      {/* ========================= */}
      {/* VOID MODAL */}
      {/* ========================= */}
      <Modal
        title="Void Water Bill"
        open={voidModalOpen}
        onClose={() => {
          setVoidModalOpen(false)
          setSelectedBill(null)
        }}
      >
        <VoidWaterBillForm
          bill={selectedBill}
          loading={voidingId === selectedBill?.id}
          onConfirm={confirmVoidBill}
          onCancel={() => {
            setVoidModalOpen(false)
            setSelectedBill(null)
          }}
        />
      </Modal>

    </div>
  )
}