import { useState } from 'react'
import { createWaterBills } from '../../api/waterBills'
import { getWaterRate } from '../../api/waterBills'

export default function WaterBulkBillingForm({
  onClose,
  onSuccess,
}) {

  // =====================================================
  // STATE (GRID)
  // =====================================================
  const [rows, setRows] = useState([
    {
      unitId: '',
      currentReading: '',
    },
  ])

  const { data } = useQuery({
    queryKey: ['water-rate'],
    queryFn: getWaterRate,
  })

  const rate = data?.rate ?? 350

  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)

  // =====================================================
  // GRID HANDLERS
  // =====================================================
  const updateRow = (index, field, value) => {
    const updated = [...rows]
    updated[index][field] = value
    setRows(updated)
  }

  const addRow = () => {
    setRows([
      ...rows,
      { unitId: '', currentReading: '' },
    ])
  }

  const removeRow = (index) => {
    const updated = rows.filter((_, i) => i !== index)
    setRows(updated)
  }

  // =====================================================
  // VALIDATION
  // =====================================================
  const isValid = () => {
    if (!dueDate) return false

    return rows.every(
      r =>
        r.unitId &&
        r.currentReading !== '' &&
        !isNaN(Number(r.currentReading))
    )
  }

  // =====================================================
  // SUBMIT
  // =====================================================
  const handleSubmit = async () => {
    try {
      setLoading(true)

      const payload = rows.map(r => ({
        unitId: Number(r.unitId),
        currentReading: Number(r.currentReading),
        dueDate,
      }))

      await createWaterBills(payload)

      onSuccess?.()
      onClose?.()

    } catch (err) {
      console.error(err)
      alert(
        err?.response?.data?.error ||
        'Failed to generate bills'
      )
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">
          Bulk Water Billing
        </h2>

        <button
          onClick={addRow}
          className="bg-black text-black px-3 py-1 rounded"
        >
          + Add Row
        </button>
      </div>

      {/* DUE DATE (GLOBAL) */}
      <div>
        <label className="text-sm font-medium">
          Due Date
        </label>

        <input
          type="date"
          value={dueDate}
          onChange={(e) =>
            setDueDate(e.target.value)
          }
          className="w-full border p-2 rounded"
        />
      </div>

      <div className="bg-gray-100 p-3 rounded flex justify-between items-center">
        <span className="font-medium">Water Rate</span>
        <span className="text-green-700 font-bold">
          {rate} per unit
        </span>
      </div>

      {/* GRID TABLE */}
      <div className="border rounded overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Unit ID</th>
              <th className="p-2 text-left">Current Reading</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t">

                {/* UNIT ID */}
                <td className="p-2">
                  <input
                    value={row.unitId}
                    onChange={(e) =>
                      updateRow(index, 'unitId', e.target.value)
                    }
                    placeholder="e.g. 101"
                    className="border p-1 w-full"
                  />
                </td>

                {/* CURRENT READING */}
                <td className="p-2">
                  <input
                    value={row.currentReading}
                    onChange={(e) =>
                      updateRow(
                        index,
                        'currentReading',
                        e.target.value
                      )
                    }
                    placeholder="e.g. 1500"
                    className="border p-1 w-full"
                  />
                </td>

                {/* REMOVE */}
                <td className="p-2">
                  <button
                    onClick={() => removeRow(index)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-end gap-3">

        <button
          onClick={onClose}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={!isValid() || loading}
          className="bg-green-600 text-black px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Generate Bills'}
        </button>

      </div>

    </div>
  )
}