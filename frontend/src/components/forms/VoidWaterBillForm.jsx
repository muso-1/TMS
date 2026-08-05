import { useState } from 'react'
import { formatMoney }
from '../utils/format'

export default function VoidWaterBillForm({
  bill,
  loading,
  onConfirm,
  onCancel,
}) {

  const [reason, setReason] =
    useState('')

  const handleSubmit = (e) => {

    e.preventDefault()

    if (!reason.trim()) {
      return alert(
        'Void reason is required.'
      )
    }

    onConfirm(reason)
  }

  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >

      {/* Bill Details */}
      <div className="
        text-sm
        text-gray-700
        space-y-1
      ">

        <p>
          <strong>Tenant:</strong>{' '}
          {bill?.tenant?.name}
        </p>

        <p>
          <strong>Amount:</strong>{' '}
          {formatMoney(bill?.amount)}
        </p>

        <p>
          <strong>Reading:</strong>{' '}
          {bill?.previousReading}
          {' → '}
          {bill?.currentReading}
        </p>

      </div>

      {/* Reason */}
      <div>

        <label className="
          block
          mb-1
          font-medium
        ">
          Void Reason
        </label>

        <textarea
          value={reason}

          onChange={(e) =>
            setReason(
              e.target.value
            )
          }

          rows={4}

          className="
            w-full
            border
            rounded
            p-2
          "

          placeholder="
            Enter reason for voiding
          "
        />

      </div>

      {/* Actions */}
      <div className="
        flex
        justify-end
        gap-2
      ">

        <button
          type="button"

          onClick={onCancel}

          className="
            px-4
            py-2
            border
            rounded
          "
        >
          Cancel
        </button>

        <button
          type="submit"

          disabled={
            loading ||
            !reason.trim()
          }

          className="
            bg-red-600
            text-black
            px-4
            py-2
            rounded
          "
        >
          {loading
            ? 'Voiding...'
            : 'Confirm Void'}
        </button>

      </div>
    </form>
  )
}