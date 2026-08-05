import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { listTenants, listTenantPayments } from '../../api/tenants'
import { listUnits } from '../../api/units'

import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'

import EditTenantForm from '../../components/forms/EditTenantForm'
import TenantForm from '../../components/forms/TenantForm'

export default function Tenants() {

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data: tenants = [],
    isLoading
  } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants
  })

  // OPTIONAL
  // Keep only if actually needed elsewhere
  useQuery({
    queryKey: ['units'],
    queryFn: listUnits
  })

  // ====================================================
  // STATE
  // ====================================================

  const [open, setOpen] = useState({
    tenant: false
  })

  const [q, setQ] = useState('')

  const [editing, setEditing] =
    useState(null)

  const [paymentsTenantId, setPaymentsTenantId] =
    useState(null)

  const [payments, setPayments] =
    useState([])

  // ====================================================
  // FILTER TENANTS
  // ====================================================

  const filtered =
    Array.isArray(tenants)
      ? tenants.filter((tenant) => {

          const search = [
            tenant.name,
            tenant.email,
            tenant.phone
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return search.includes(
            q.toLowerCase()
          )
        })
      : []

  // ====================================================
  // FETCH TENANT PAYMENTS
  // ====================================================

  const fetchPayments = async (
    tenantId
  ) => {

    setPaymentsTenantId(tenantId)

    try {

      const data =
        await listTenantPayments(
          tenantId
        )

      setPayments(data)

    } catch (err) {

      console.error(
        'Error fetching tenant payments:',
        err
      )

      setPayments([])
    }
  }

  // ====================================================
  // TABLE COLUMNS
  // ====================================================

  const columns = [

    {
      key: 'name',
      header: 'Name'
    },

    {
      key: 'email',
      header: 'Email'
    },

    {
      key: 'phone',
      header: 'Phone'
    },

    {
      key: 'unitNumber',

      header: 'Unit',

      cell: (tenant) =>
        tenant.units?.[0]?.unitNumber ??
        'Not Assigned'
    },

    // ================================================
    // BILL SNAPSHOTS
    // ================================================

    {
      key: 'totalBilled',

      header: 'Rent Billed',

      cell: (tenant) => (
        <span>
          {Number(
            tenant.totalBilled || 0
          ).toFixed(2)}
        </span>
      )
    },

    {
      key: 'totalRentPaid',

      header: 'Rent Paid',

      cell: (tenant) => (
        <span className="text-green-600">
          {Number(
            tenant.totalRentPaid || 0
          ).toFixed(2)}
        </span>
      )
    },

    {
      key: 'outstandingRent',

      header: 'Outstanding',

      cell: (tenant) => (
        <span
          className={
            tenant.outstandingRent > 0
              ? 'text-red-600 font-medium'
              : 'text-green-600'
          }
        >
          {Number(
            tenant.outstandingRent || 0
          ).toFixed(2)}
        </span>
      )
    },

    // ================================================
    // PAYMENT LEDGER
    // ================================================

    {
      key: 'totalPaid',

      header: 'Payments Received',

      cell: (tenant) => (
        <span className="text-blue-600">
          {Number(
            tenant.totalPaid || 0
          ).toFixed(2)}
        </span>
      )
    },

    {
      key: 'creditBalance',

      header: 'Credit Balance',

      cell: (tenant) => (
        <span
          className={
            tenant.creditBalance > 0
              ? 'text-amber-600 font-medium'
              : ''
          }
        >
          {Number(
            tenant.creditBalance || 0
          ).toFixed(2)}
        </span>
      )
    },

    // ================================================
    // ACTIONS
    // ================================================

    {
      key: 'actions',

      header: 'Actions',

      cell: (tenant) => (
        <div className="space-x-3">

          <button
            className="text-blue-600 hover:underline"
            onClick={() =>
              setEditing(tenant)
            }
          >
            Edit
          </button>

          <button
            className="text-green-600 hover:underline"
            onClick={() =>
              fetchPayments(
                tenant.id
              )
            }
          >
            View Payments
          </button>

        </div>
      )
    }
  ]

  // ====================================================
  // LOADING
  // ====================================================

  if (isLoading) {
    return <div>Loading…</div>
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-4">

      {/* HEADER */}

      <div className="flex justify-between items-center">

        <input
          value={q}

          onChange={(e) =>
            setQ(e.target.value)
          }

          placeholder="Search tenants…"

          className="border rounded px-3 py-2 w-1/2"
        />

        <button
          className="border px-4 py-2 rounded"

          onClick={() =>
            setOpen((o) => ({
              ...o,
              tenant: true
            }))
          }
        >
          Add Tenant
        </button>

      </div>

      {/* TABLE */}

      <Table
        columns={columns}
        data={filtered}
      />

      {/* EDIT TENANT */}

      <Modal
        title="Edit Tenant"

        open={!!editing}

        onClose={() =>
          setEditing(null)
        }
      >
        {editing && (
          <EditTenantForm
            tenant={editing}

            onClose={() =>
              setEditing(null)
            }
          />
        )}
      </Modal>

      {/* PAYMENTS */}

      <Modal
        title="Tenant Payments"

        open={!!paymentsTenantId}

        onClose={() => {
          setPaymentsTenantId(null)
          setPayments([])
        }}
      >

        {payments.length === 0 ? (

          <div>No payments found</div>

        ) : (

          <Table
            columns={[

              {
                key: 'id',
                header: 'ID'
              },

              {
                key: 'amountReceived',
                header: 'Amount',

                cell: (payment) => (
                  <span>
                    {Number(
                      payment.amountReceived || 0
                    ).toFixed(2)}
                  </span>
                )
              },

              {
                key: 'totalAllocated',

                header: 'Allocated',

                cell: (payment) => (
                  <span>
                    {Number(
                      payment.totalAllocated || 0
                    ).toFixed(2)}
                  </span>
                )
              },

              {
                key: 'unappliedAmount',

                header: 'Unapplied',

                cell: (payment) => (
                  <span
                    className={
                      payment.unappliedAmount > 0
                        ? 'text-amber-600 font-medium'
                        : ''
                    }
                  >
                    {Number(
                      payment.unappliedAmount || 0
                    ).toFixed(2)}
                  </span>
                )
              },

              {
                key: 'paidAt',

                header: 'Paid At',

                cell: (payment) =>
                  new Date(
                    payment.paidAt
                  ).toLocaleDateString()
              },

              {
                key: 'method',
                header: 'Method'
              },

              {
                key: 'reference',
                header: 'Reference'
              },

              {
                key: 'note',
                header: 'Note'
              }

            ]}

            data={payments}
          />
        )}

      </Modal>

      {/* ADD TENANT */}

      <Modal
        title="Add Tenant"

        open={open.tenant}

        onClose={() =>
          setOpen((o) => ({
            ...o,
            tenant: false
          }))
        }
      >

        <TenantForm
          onClose={() =>
            setOpen((o) => ({
              ...o,
              tenant: false
            }))
          }
        />

      </Modal>

    </div>
  )
}