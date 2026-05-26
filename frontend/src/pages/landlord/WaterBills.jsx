import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listWaterBills, voidWaterBill } from '../../api/waterBills'
import { sendReminder, sendBulkReminders } from '../../api/reminders' // reminder import
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import VoidWaterBillForm from '../../components/forms/VoidWaterBillForm'
import WaterBillForm from '../../components/forms/WaterBillForm'
import { useState } from 'react'
import { formatDate, formatMoney } from '../../components/utils/format'

export default function WaterBills() {
  const queryClient = useQueryClient()
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['water-bills'],
    queryFn: listWaterBills,
  })
  const [open, setOpen] = useState(false)
  const [loadingReminder, setLoadingReminder] = useState(false)
  const [voidingId, setVoidingId] =
    useState(null)
  const [voidModalOpen, setVoidModalOpen] =
    useState(false)

  const [selectedBill, setSelectedBill] =
    useState(null)

  //  Send single reminder for water bill
  const handleSendReminder = async (billId) => {
    try {
      setLoadingReminder(true)
      const res = await sendReminder('water', billId)
      alert(res.message || 'Water bill reminder sent successfully!')
      queryClient.invalidateQueries(['water-bills'])
    } catch (err) {
      console.error(err)
      alert('Failed to send water bill reminder.')
    } finally {
      setLoadingReminder(false)
    }
  }

  // Send bulk reminders for all newly created water bills
  const handleSendBulkReminders = async () => {
    if (!confirm('Send reminders for all pending/newly created water bills?')) return
    try {
      setLoadingReminder(true)
      const res = await sendBulkReminders('water')
      alert(res.message || 'Bulk water bill reminders sent successfully!')
      queryClient.invalidateQueries(['water-bills'])
    } catch (err) {
      console.error(err)
      alert('Failed to send bulk water bill reminders.')
    } finally {
      setLoadingReminder(false)
    }
  }

  const openVoidModal = (bill) => {

    setSelectedBill(bill)

    setVoidModalOpen(true)
  }

  const confirmVoidBill = async (
    reason
  ) => {

    try {

      setVoidingId(selectedBill.id)

      const res =
        await voidWaterBill(
          selectedBill.id,
          reason
        )

      alert(
        res.message ||
        'Water bill voided successfully.'
      )

      queryClient.invalidateQueries({
        queryKey: ['water-bills'],
      })

      setVoidModalOpen(false)

      setSelectedBill(null)

    } catch (error) {

      console.error(error)

      alert(
        error?.response?.data?.error ||
        'Failed to void water bill.'
      )

    } finally {

      setVoidingId(null)
    }
  }
  const columns = [
    { key: 'tenant', header: 'Tenant', cell: (r) => r.tenant?.name ?? r.tenantId },
    { key: 'previousReading', header: 'Prev' },
    { key: 'currentReading', header: 'Current' },
    { key: 'usage', header: 'Usage', cell: (r) => r.usage ?? r.unitsUsed },
    { key: 'amount', header: 'Amount', cell: (r) => formatMoney(r.amount) },
    { key: 'dueDate', header: 'Due', cell: (r) => formatDate(r.dueDate) },
    { key: 'status', 
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

        const isFinalized =
          status === 'paid' ||
          status === 'overpaid'

        const isPendingActionable =
          status === 'pending' ||
          status === 'partial'

        return (
          <div className="flex gap-3 items-center">

            {/* VIEW REMINDER (only if not voided or fully paid) */}
            {!isVoided && isPendingActionable && (
              <button
                onClick={() =>
                  handleSendReminder(r.id)
                }
                disabled={loadingReminder}
                className="text-blue-600 hover:underline"
              >
                Send Reminder
              </button>
            )}

            {/* VOID */}
            {!isVoided && isPendingActionable && (
              <button
                onClick={() =>
                  openVoidModal(r)
                }
                disabled={voidingId === r.id}
                className="text-red-600 hover:underline"
              >
                {voidingId === r.id
                  ? 'Voiding...'
                  : 'Void'}
              </button>
            )}

            {/* STATUS BADGE */}
            {isVoided ? (
              <span className="text-gray-500 font-medium">
                Voided
              </span>
            ) : isFinalized ? (
              <span className="text-green-600 font-medium">
                {status === 'overpaid'
                  ? 'Overpaid'
                  : 'Paid'}
              </span>
            ) : (
              <span className="text-yellow-600 font-medium">
                {status === 'partial'
                  ? 'Partial'
                  : 'Pending'}
              </span>
            )}
          </div>
        )
      }
    }
  ]

  if (isLoading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          className="bg-black text-black px-3 py-2 rounded"
          onClick={() => setOpen(true)}
        >
          Create Water Bill
        </button>

        {/* Bulk reminder button */}
        <button
          onClick={handleSendBulkReminders}
          disabled={loadingReminder}
          className="bg-blue-600 text-black px-3 py-2 rounded hover:bg-blue-700"
        >
          {loadingReminder ? 'Sending...' : 'Send All Reminders'}
        </button>
      </div>

      <Table columns={columns} data={bills} />

      <Modal title="Create Water Bill" open={open} onClose={() => setOpen(false)}>
        <WaterBillForm onClose={() => setOpen(false)} />
      </Modal>
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

          loading={
            voidingId === selectedBill?.id
          }

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
