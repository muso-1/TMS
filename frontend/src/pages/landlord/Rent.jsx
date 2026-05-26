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

  // =====================================
  // RENT BILLS
  // =====================================
  const {
    data: bills = [],
    isLoading,
  } = useQuery({
    queryKey: ['rent-bills'],
    queryFn: listRentBills,
  })

  // =====================================
  // CREATE MODAL
  // =====================================
  const [openCreate, setOpenCreate] =
    useState(false)

  // =====================================
  // VOID MODAL
  // =====================================
  const [openVoid, setOpenVoid] =
    useState(false)

  const [voidingBill, setVoidingBill] =
    useState(null)

  // =====================================
  // DETAILS MODAL
  // =====================================
  const [openDetails, setOpenDetails] =
    useState(false)

  const [selectedBillId, setSelectedBillId] =
    useState(null)

  const {
    data: billDetails,
    isLoading: loadingBill,
  } = useQuery({
    queryKey: [
      'rent-bill',
      selectedBillId,
    ],

    queryFn: () =>
      getRentBill(selectedBillId),

    enabled:
      openDetails && !!selectedBillId,
  })

  // =====================================
  // REMINDERS
  // =====================================
  const [loadingReminder, setLoadingReminder] =
    useState(false)

  const handleSendReminder = async (
    billId
  ) => {
    try {
      setLoadingReminder(true)

      const res = await sendReminder(
        'rent',
        billId
      )

      alert(
        res.message ||
          'Reminder sent successfully!'
      )

      queryClient.invalidateQueries([
        'rent-bills',
      ])
    } catch (err) {
      console.error(err)

      alert('Failed to send reminder.')
    } finally {
      setLoadingReminder(false)
    }
  }

  const handleSendBulkReminders =
    async () => {
      if (
        !confirm(
          'Send reminders for all pending rent bills?'
        )
      ) {
        return
      }

      try {
        setLoadingReminder(true)

        const res =
          await sendBulkReminders('rent')

        alert(
          res.message ||
            'Bulk reminders sent successfully!'
        )

        queryClient.invalidateQueries([
          'rent-bills',
        ])
      } catch (err) {
        console.error(err)

        alert(
          'Failed to send bulk reminders.'
        )
      } finally {
        setLoadingReminder(false)
      }
    }

  // =====================================
  // TABLE COLUMNS
  // =====================================
  const columns = [
    {
      key: 'tenant',
      header: 'Tenant',

      cell: (r) =>
        r.lease?.tenant?.name || '—',
    },

    {
      key: 'amount',
      header: 'Amount',

      cell: (r) =>
        formatMoney(r.amount),
    },

    {
      key: 'totalPaid',
      header: 'Total Paid',

      cell: (r) =>
        formatMoney(r.totalPaid || 0),
    },

    {
      key: 'balance',
      header: 'Balance',

      cell: (r) =>
        formatMoney(r.balance || 0),
    },

    {
      key: 'dueDate',
      header: 'Due Date',

      cell: (r) =>
        formatDate(r.dueDate),
    },

    {
      key: 'status',
      header: 'Status',

      cell: (r) => {
        switch (r.status) {
          case 'voided':
            return 'Voided'

          case 'paid':
            return 'Paid'

          case 'partial':
            return 'Partial'

          case 'overpaid':
            return 'Overpaid'

          default:
            return 'Pending'
        }
      }
    },

    {
      key: 'actions',
      header: 'Actions',

      cell: (r) => {
        const isVoided = r.isVoided
        const status = r.status

        const isPending = status === 'pending'
        const isPartial = status === 'partial'
        const isPaid = status === 'paid'
        const isOverpaid = status === 'overpaid'

        const canAct =
          !isVoided && (isPending || isPartial)

        const canVoid =
          !isVoided && isPending

        const canRemind =
          !isVoided && (isPending || isPartial)

        return (
          <div className="flex gap-3 flex-wrap items-center">

            {/* VIEW (always available) */}
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
                onClick={() =>
                  handleSendReminder(r.id)
                }
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
                Void
              </button>
            )}

            {/* STATUS BADGE */}
            {isVoided ? (
              <span className="text-gray-500 font-medium">
                Voided
              </span>
            ) : isPaid ? (
              <span className="text-green-600 font-medium">
                Paid
              </span>
            ) : isOverpaid ? (
              <span className="text-blue-600 font-medium">
                Overpaid
              </span>
            ) : isPartial ? (
              <span className="text-yellow-600 font-medium">
                Partial
              </span>
            ) : (
              <span className="text-gray-700 font-medium">
                Pending
              </span>
            )}
          </div>
        )
      }
    },
  ]

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">

      {/* ================================= */}
      {/* ACTION BUTTONS */}
      {/* ================================= */}
      <div className="flex justify-between items-center">

        <button
          className="bg-black text-black px-3 py-2 rounded"
          onClick={() =>
            setOpenCreate(true)
          }
        >
          Create Rent Bill
        </button>

        <button
          onClick={
            handleSendBulkReminders
          }
          disabled={loadingReminder}
          className="bg-blue-600 text-black px-3 py-2 rounded hover:bg-blue-700"
        >
          {loadingReminder
            ? 'Sending...'
            : 'Send All Reminders'}
        </button>
      </div>

      {/* ================================= */}
      {/* TABLE */}
      {/* ================================= */}
      <Table
        columns={columns}
        data={bills}
      />

      {/* ================================= */}
      {/* CREATE MODAL */}
      {/* ================================= */}
      <Modal
        title="Create Rent Bill"
        open={openCreate}
        onClose={() =>
          setOpenCreate(false)
        }
      >
        <RentBillForm
          onClose={() =>
            setOpenCreate(false)
          }
        />
      </Modal>

      {/* ================================= */}
      {/* VOID MODAL */}
      {/* ================================= */}
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

      {/* ================================= */}
      {/* DETAILS MODAL */}
      {/* ================================= */}
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
              <strong>Tenant:</strong>{' '}
              {
                billDetails.lease?.tenant
                  ?.name
              }
            </div>

            <div>
              <strong>Amount:</strong>{' '}
              {formatMoney(
                billDetails.amount
              )}
            </div>

            <div>
              <strong>Total Paid:</strong>{' '}
              {formatMoney(
                billDetails.totalPaid
              )}
            </div>

            <div>
              <strong>Balance:</strong>{' '}
              {formatMoney(
                billDetails.balance
              )}
            </div>

            <div>
              <strong>Due Date:</strong>{' '}
              {formatDate(
                billDetails.dueDate
              )}
            </div>

            {billDetails.isVoided && (
              <>
                <div className="text-red-600">
                  <strong>Voided</strong>
                </div>

                <div>
                  <strong>Reason:</strong>{' '}
                  {
                    billDetails.voidReason
                  }
                </div>

                <div>
                  <strong>Voided At:</strong>{' '}
                  {formatDate(
                    billDetails.voidedAt
                  )}
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