import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listWaterBills } from '../../api/waterBills'
import { sendReminder, sendBulkReminders } from '../../api/reminders' // reminder import
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
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

  const columns = [
    { key: 'tenant', header: 'Tenant', cell: (r) => r.tenant?.name ?? r.tenantId },
    { key: 'previousReading', header: 'Prev' },
    { key: 'currentReading', header: 'Current' },
    { key: 'usage', header: 'Usage', cell: (r) => r.usage ?? r.unitsUsed },
    { key: 'amount', header: 'Amount', cell: (r) => formatMoney(r.amount) },
    { key: 'dueDate', header: 'Due', cell: (r) => formatDate(r.dueDate) },
    { key: 'status', header: 'Status', cell: (r) => (r.paid ? 'Paid' : (r.status || 'Pending')) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <button
          onClick={() => handleSendReminder(r.id)}
          disabled={loadingReminder}
          className="text-blue-600 hover:underline"
        >
          Send Reminder
        </button>
      ),
    },
  ]

  if (isLoading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          className="bg-black text-white px-3 py-2 rounded"
          onClick={() => setOpen(true)}
        >
          Create Water Bill
        </button>

        {/* Bulk reminder button */}
        <button
          onClick={handleSendBulkReminders}
          disabled={loadingReminder}
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
        >
          {loadingReminder ? 'Sending...' : 'Send All Reminders'}
        </button>
      </div>

      <Table columns={columns} data={bills} />

      <Modal title="Create Water Bill" open={open} onClose={() => setOpen(false)}>
        <WaterBillForm onClose={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
