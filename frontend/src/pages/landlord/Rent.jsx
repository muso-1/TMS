import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  listRentBills,
  getRentBill,
} from '../../api/rentBills'

import {
  sendReminder,
  sendBulkReminders,
} from '../../api/reminders'

import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'

import RentBillForm from '../../components/forms/RentBillForm'
import VoidRentBillForm from '../../components/forms/VoidRentBillForm'

import { useState } from 'react'

import {
  formatDate,
  formatMoney,
} from '../../components/utils/format'

export default function Rent() {
  const queryClient = useQueryClient()

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['rent-bills'],
    queryFn: listRentBills,
  })

  const [openCreate, setOpenCreate] = useState(false)
  const [openVoid, setOpenVoid] = useState(false)
  const [voidingBill, setVoidingBill] = useState(null)

  const [openDetails, setOpenDetails] = useState(false)
  const [selectedBillId, setSelectedBillId] = useState(null)

  const { data: billDetails, isLoading: loadingBill } = useQuery({
    queryKey: ['rent-bill', selectedBillId],
    queryFn: () => getRentBill(selectedBillId),
    enabled: openDetails && !!selectedBillId,
  })

  const [loadingReminder, setLoadingReminder] = useState(false)

  // =====================================================
  // REMINDERS
  // =====================================================
  const handleSendReminder = async (billId) => {
    try {
      setLoadingReminder(true)

      const res = await sendReminder('rent', billId)

      alert(res.message || 'Reminder sent successfully!')

      queryClient.invalidateQueries(['rent-bills'])
    } catch (err) {
      console.error(err)
      alert('Failed to send reminder.')
    } finally {
      setLoadingReminder(false)
    }
  }

  const handleSendBulkReminders = async () => {
    if (!confirm('Send reminders for all pending rent bills?')) return

    try {
      setLoadingReminder(true)

      const res = await sendBulkReminders('rent')

      alert(res.message || 'Bulk reminders sent successfully!')

      queryClient.invalidateQueries(['rent-bills'])
    } catch (err) {
      console.error(err)
      alert('Failed to send bulk reminders.')
    } finally {
      setLoadingReminder(false)
    }
  }

  // =====================================================
  // TABLE COLUMNS
  // =====================================================
  const columns = [
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (r) => r.lease?.tenant?.name || '—',
    },

    {
      key: 'amount',
      header: 'Amount',
      cell: (r) => formatMoney(r.amount),
    },

    {
      key: 'totalPaid',
      header: 'Total Paid',
      cell: (r) => formatMoney(r.totalRentPaid || 0),
    },

    {
      key: 'outstanding',
      header: 'Outstanding',
      cell: (r) => formatMoney(r.outstandingAmount || 0),
    },

    {
      key: 'dueDate',
      header: 'Due Date',
      cell: (r) => formatDate(r.dueDate),
    },

    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        switch (r.status) {
          case 'voided':
            return (
              <span className="text-gray-500 font-medium">
                Voided
              </span>
            )

          case 'paid':
            return (
              <span className="text-green-600 font-medium">
                Paid
              </span>
            )

          case 'partially_paid':
            return (
              <span className="text-yellow-600 font-medium">
                Partial
              </span>
            )

          case 'overdue':
            return (
              <span className="text-red-600 font-medium">
                Overdue
              </span>
            )

          case 'unpaid':
          default:
            return (
              <span className="text-gray-700 font-medium">
                Unpaid
              </span>
            )
        }
      },
    },

    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => {
        const isVoided = r.status === 'voided'
        const isPending = r.status === 'unpaid'
        const isPartial = r.status === 'partially_paid'
        const isPaid = r.status === 'paid'
        const isOverdue = r.status === 'overdue'

        const canRemind =
          !isVoided && (isPending || isPartial || isOverdue)

        const canVoid = !isVoided

        return (
          <div className="flex gap-3 flex-wrap items-center">

            {/* VIEW */}
            <button
              onClick={() => {
                setSelectedBillId(r.id)
                setOpenDetails(true)
              }}
              className="text-blue-600 hover:underline"
            >
              View
            </button>

            {/* REMINDER */}
            {canRemind && (
              <button
                onClick={() => handleSendReminder(r.id)}
                disabled={loadingReminder}
                className="text-green-600 hover:underline"
              >
                Reminder
              </button>
            )}

            {/* VOID */}
            {canVoid && (
              <button
                onClick={() => {
                  setVoidingBill(r)
                  setOpenVoid(true)
                }}
                className="text-red-600 hover:underline"
              >
                {r.totalRentPaid > 0
                  ? 'Void & Restore Payment'
                  : 'Void'}
              </button>
            )}

          </div>
        )
      },
    },
  ]

  if (isLoading) return <div>Loading...</div>

  const safeDetails = billDetails || {}

  return (
    <div className="space-y-4">

      <div className="flex justify-between items-center">
        <button
          className="bg-black text-black px-3 py-2 rounded"
          onClick={() => setOpenCreate(true)}
        >
          Create Rent Bill
        </button>

        <button
          onClick={handleSendBulkReminders}
          disabled={loadingReminder}
          className="bg-blue-600 text-black px-3 py-2 rounded"
        >
          {loadingReminder ? 'Sending...' : 'Send All Reminders'}
        </button>
      </div>

      <Table columns={columns} data={bills} />

      {/* CREATE */}
      <Modal
        title="Create Rent Bill"
        open={openCreate}
        onClose={() => setOpenCreate(false)}
      >
        <RentBillForm onClose={() => setOpenCreate(false)} />
      </Modal>

      {/* VOID */}
      <Modal
        title="Void Rent Bill"
        open={openVoid}
        onClose={() => {
          setOpenVoid(false)
          setVoidingBill(null)
        }}
      >
        <VoidRentBillForm
          bill={voidingBill}
          onClose={() => {
            setOpenVoid(false)
            setVoidingBill(null)
          }}
        />
      </Modal>

      {/* DETAILS */}
      <Modal
        title="Rent Bill Details"
        open={openDetails}
        onClose={() => {
          setOpenDetails(false)
          setSelectedBillId(null)
        }}
      >
        {loadingBill ? (
          <div>Loading...</div>
        ) : billDetails ? (
          <div className="space-y-2">

            <div>
              <strong>Tenant:</strong> {safeDetails.lease?.tenant?.name}
            </div>

            <div>
              <strong>Amount:</strong> {formatMoney(safeDetails.amount)}
            </div>

            {safeDetails.totalRentPaid > 0 &&
              safeDetails.status !== 'voided' && (
                <div className="text-amber-600">
                  Voiding this bill will reverse allocations
                  and return {formatMoney(safeDetails.totalRentPaid)}
                  to tenant credit.
                </div>
            )}

            <div>
              <strong>Outstanding:</strong> {formatMoney(safeDetails.outstandingAmount || 0)}
            </div>

            <div>
              <strong>Due Date:</strong> {formatDate(safeDetails.dueDate)}
            </div>

            {safeDetails.status === 'voided' && (
              <>
                <div className="text-red-600 font-bold">Voided</div>

                <div>
                  <strong>Reason:</strong> {safeDetails.voidReason}
                </div>
              </>
            )}
          </div>
        ) : (
          <div>Bill not found</div>
        )}
      </Modal>
    </div>
  )
}