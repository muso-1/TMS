import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { listTenants } from '../../api/tenants'
import { listUnits } from '../../api/units'
import { getDashboardSummary } from '../../api/dashboard'

import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'

import TenantForm from '../../components/forms/TenantForm'
import UnitForm from '../../components/forms/UnitForm'
import WaterBillForm from '../../components/forms/WaterBillForm'
import AssignTenantForm from '../../components/forms/AssignTenantForm'

import { formatMoney } from '../../components/utils/format'

export default function Dashboard() {
  const [open, setOpen] = useState({
    tenant: false,
    unit: false,
    water: false,
    assign: false
  })

  // Future-proof period support
  const period = 'month'

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: listUnits
  })

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary', period],
    queryFn: () => getDashboardSummary({ period })
  })
  
  const vacantUnits = Array.isArray(units)
  ? units.filter(u => !u.tenantId).length
  : 0

  if (isLoading || !summary) {
    return <div className="text-gray-500">Loading dashboard…</div>
  }

  console.log('summary', summary)

  return (
    <div className="space-y-6">
      {/* ================= KPIs ================= */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card title="Total Tenants" value={tenants.length} />
        <Card title="Vacant Units" value={vacantUnits} />
        <Card title="Pending Maintenance Requests" value="—" />

        <Card title="Water Collections (Period)">
          <div className="text-lg font-semibold">
            {formatMoney(summary.collections.water)}
          </div>
        </Card>

        <Card title="Rent Collections (Period)">
          <div className="text-lg font-semibold">
            {formatMoney(summary.collections.rent)}
          </div>
          <div className="text-sm text-gray-500">
            Outstanding: {formatMoney(summary.rent.outstanding)}
          </div>
        </Card>
      </div>

      {/* ============ Financial Overview ============ */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Total Collections (Period)">
          <div className="text-lg font-semibold">
            {formatMoney(summary.collections.total)}
          </div>
        </Card>

        <Card title="Rent Billed (Period)">
          <div className="text-lg font-semibold">
            {formatMoney(summary.rent.billed)}
          </div>
          <div className="text-sm text-gray-500">
            Paid: {formatMoney(summary.rent.paid)}
          </div>
        </Card>

        <Card title="Rent Outstanding">
          <div className="text-lg font-semibold text-red-600">
            {formatMoney(summary.rent.outstanding)}
          </div>
        </Card>
      </div>

      {/* ============ Rent Bill Status ============ */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card
          title="Fully Paid Rent Bills"
          value={summary.rentBills.fullyPaid}
        />
        <Card
          title="Partially Paid Rent Bills"
          value={summary.rentBills.partiallyPaid}
        />
        <Card
          title="Unpaid Rent Bills"
          value={summary.rentBills.unpaid}
        />
      </div>

      {/* ================= Actions ================= */}
      <div className="flex flex-wrap gap-2">
        <button
          className="text-black px-3 py-2 rounded"
          onClick={() => setOpen(o => ({ ...o, tenant: true }))}
        >
          Add Tenant
        </button>

        <button
          className="text-black px-3 py-2 rounded"
          onClick={() => setOpen(o => ({ ...o, unit: true }))}
        >
          Add Unit
        </button>

        <button
          className="text-black px-3 py-2 rounded"
          onClick={() => setOpen(o => ({ ...o, water: true }))}
        >
          Record Water Reading
        </button>

        <button
          className="text-black px-3 py-2 rounded"
          onClick={() => setOpen(o => ({ ...o, assign: true }))}
        >
          Assign/ Unassign Unit
        </button>
      </div>

      {/* ================= Modals ================= */}
      <Modal
        title="Add Tenant"
        open={open.tenant}
        onClose={() => setOpen(o => ({ ...o, tenant: false }))}
      >
        <TenantForm onClose={() => setOpen(o => ({ ...o, tenant: false }))} />
      </Modal>

      <Modal
        title="Add Unit"
        open={open.unit}
        onClose={() => setOpen(o => ({ ...o, unit: false }))}
      >
        <UnitForm onClose={() => setOpen(o => ({ ...o, unit: false }))} />
      </Modal>

      <Modal
        title="Create Water Bill"
        open={open.water}
        onClose={() => setOpen(o => ({ ...o, water: false }))}
      >
        <WaterBillForm onClose={() => setOpen(o => ({ ...o, water: false }))} />
      </Modal>

      <Modal
        title="Assign Tenant to Unit"
        open={open.assign}
        onClose={() => setOpen(o => ({ ...o, assign: false }))}
      >
        <AssignTenantForm
          tenants={tenants}
          units={units}
          onClose={() => setOpen(o => ({ ...o, assign: false }))}
        />
      </Modal>
    </div>
  )
}
