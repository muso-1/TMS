import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listRentBills, deleteRentBill } from '../../api/rentBills'
import { sendReminder, sendBulkReminders } from '../../api/reminders'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import RentBillForm from '../../components/forms/RentBillForm'
import { useState } from 'react'
import { formatDate, formatMoney } from '../../components/utils/format'
import { Link } from 'react-router-dom'

export default function Rent() {
  const queryClient = useQueryClient()

  // Fetch rent bills
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['rent-bills'],
    queryFn: listRentBills,
  })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loadingReminder, setLoadingReminder] = useState(false)

  // Delete rent bill
  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this rent bill?')) {
      await deleteRentBill(id)
      queryClient.invalidateQueries(['rent-bills'])
    }
  }

  // Send single reminder
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

  // Send bulk reminders
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

  // Table columns
  const columns = [
    { key: 'tenant', header: 'Tenant', cell: (r) => r.lease.tenant?.name || '—' },
    { key: 'amount', header: 'Amount', cell: (r) => formatMoney(r.amount) },
    {
      key: 'totalPaid',
      header: 'Total Paid',
      cell: (r) =>
        formatMoney(r.payments?.reduce((sum, p) => sum + p.amount, 0) || 0),
    },
    {
      key: 'balance',
      header: 'Balance',
      cell: (r) => {
        const totalPaid = r.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
        return formatMoney(r.amount - totalPaid)
      },
    },
    { key: 'dueDate', header: 'Due Date', cell: (r) => formatDate(r.dueDate) },
    { key: 'status', header: 'Status', cell: (r) => (r.paid ? 'Paid' : 'Pending') },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <div className="flex gap-3">
          <Link
            to={`/rent-bills/${r.id}`}
            className="text-blue-600 hover:underline"
          >
            Payment Details
          </Link>
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
          className="bg-blue-600 text-black px-3 py-2 rounded hover:bg-blue-700"
        >
          {loadingReminder ? 'Sending...' : 'Send All Reminders'}
        </button>
      </div>

      <Table columns={columns} data={dataWithActions} />

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
