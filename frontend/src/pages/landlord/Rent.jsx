import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listRentBills, deleteRentBill, getRentBill } from '../../api/rentBills'
import { sendReminder, sendBulkReminders } from '../../api/reminders'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import RentBillForm from '../../components/forms/RentBillForm'
import { useState, useEffect } from 'react'
import { formatDate, formatMoney } from '../../components/utils/format'
import { listPayments, deletePayment } from '../../api/payments'

export default function Rent() {
  const queryClient = useQueryClient()

  // Fetch all rent bills
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['rent-bills'],
    queryFn: listRentBills,
  })

  // Create/Edit Rent Bill Modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // Rent Bill Details Modal
  const [openDetails, setOpenDetails] = useState(false)
  const [selectedBillId, setSelectedBillId] = useState(null)

  const { data: billDetails, isLoading: loadingBill } = useQuery({
    queryKey: ['rent-bill', selectedBillId],
    queryFn: () => getRentBill(selectedBillId),
    enabled: openDetails && !!selectedBillId,
  })

  // Delete Rent Bill
  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this rent bill?')) {
      await deleteRentBill(id)
      queryClient.invalidateQueries(['rent-bills'])
    }
  }

  // Send Reminders
  const [loadingReminder, setLoadingReminder] = useState(false)

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

  // Rent Bills Table Columns
  const columns = [
    { key: 'tenant', header: 'Tenant', cell: (r) => r.lease.tenant?.name || '—' },
    { key: 'amount', header: 'Amount', cell: (r) => formatMoney(r.amount) },
    {
      key: 'totalPaid',
      header: 'Total Paid',
      cell: (r) => formatMoney(r.totalPaid || 0),
    },
    {
      key: 'balance',
      header: 'Balance',
      cell: (r) => formatMoney(r.balance || 0),
    },
    { key: 'dueDate', header: 'Due Date', cell: (r) => formatDate(r.dueDate) },
    { key: 'status', header: 'Status', cell: (r) => (r.paid ? 'Paid' : 'Pending') },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <div className="flex gap-3">
        
          <button
            onClick={() => handleSendReminder(r.id)}
            disabled={loadingReminder}
            className="text-green-600 hover:underline"
          >
            Send Reminder
          </button>

          <button
            onClick={() => handleDelete(r.id)}
            className="text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  const dataWithActions = bills.map((r) => ({
    ...r,
    onEdit: (bill) => {
      setEditing(bill)
      setOpen(true)
    },
    onDelete: () => handleDelete(r.id),
  }))

  if (isLoading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      {/* Create + Bulk Reminder Buttons */}
      <div className="flex justify-between items-center">
        <button
          className="bg-black text-black px-3 py-2 rounded"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          Create Rent Bill
        </button>

        <button
          onClick={handleSendBulkReminders}
          disabled={loadingReminder}
          className="bg-blue-600 text-black  px-3 py-2 rounded hover:bg-blue-700"
        >
          {loadingReminder ? 'Sending...' : 'Send All Reminders'}
        </button>
      </div>

      {/* Rent Bills Table */}
      <Table columns={columns} data={dataWithActions} />

      {/* Rent Bill Create/Edit Modal */}
      <Modal
        title={editing ? 'Edit Rent Bill' : 'Create Rent Bill'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <RentBillForm onClose={() => setOpen(false)} bill={editing} />
      </Modal>

    </div>
  )
}