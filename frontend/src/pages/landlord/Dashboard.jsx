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

import { formatMoney } from '../../components/utils/format'

export default function Dashboard() {
  const [open, setOpen] = useState({
    tenant: false,
    unit: false,
    water: false,
  })

  const period = 'month'

  // =====================================================
  // DATA
  // =====================================================
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: listUnits,
  })

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary', period],
    queryFn: () => getDashboardSummary({ period }),
  })

  if (isLoading || !summary) {
    return <div className="text-gray-500">Loading dashboard...</div>
  }

  // =====================================================
  // SAFE ACCESS (HYBRID CONTRACT)
  // =====================================================
  const collections = summary.collections ?? {}
  const rent = summary.rent ?? {}
  const water = summary.water ?? {}
  const rentBills = summary.rentBills ?? {}
  const waterBills = summary.waterBills ?? {}

  // =====================================================
  // UNITS
  // =====================================================
  const totalUnits = units.length

  const occupiedUnits = Array.isArray(units)
    ? units.filter((u) =>
        Array.isArray(u.leases) &&
        u.leases.some((l) => l.status === 'active')
      ).length
    : 0

  const vacantUnits = totalUnits - occupiedUnits

  const occupancyRate =
    totalUnits > 0
      ? Math.round((occupiedUnits / totalUnits) * 100)
      : 0

  // =====================================================
  // FINANCIALS (HYBRID SAFE)
  // =====================================================
  const totalOutstanding =
    (rent.outstanding ?? 0) + (water.outstanding ?? 0)

  const totalBilled =
    (rent.billed ?? 0) + (water.billed ?? 0)

  const totalCollected =
    collections.total ?? 0

  const collectionRate =
    totalBilled > 0
      ? Math.round((totalCollected / totalBilled) * 100)
      : 0

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6">

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">

        <Card title="Total Tenants">
          <div className="text-2xl font-semibold">
            {tenants.length}
          </div>
        </Card>

        <Card title="Total Units">
          <div className="text-2xl font-semibold">
            {totalUnits}
          </div>
        </Card>

        <Card title="Occupied Units">
          <div className="text-2xl font-semibold">
            {occupiedUnits}
          </div>
          <div className="text-sm text-gray-500">
            {occupancyRate}% occupancy
          </div>
        </Card>

        <Card title="Vacant Units">
          <div className="text-2xl font-semibold text-yellow-600">
            {vacantUnits}
          </div>
        </Card>

        <Card title="Outstanding">
          <div className="text-2xl font-semibold text-red-600">
            {formatMoney(totalOutstanding)}
          </div>
        </Card>

        <Card title="Collections">
          <div className="text-2xl font-semibold text-blue-600">
            {formatMoney(totalCollected)}
          </div>
        </Card>
      </div>

      {/* COLLECTION BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card title="Rent Collections">
          <div className="text-2xl font-semibold">
            {formatMoney(collections.rent ?? 0)}
          </div>
        </Card>

        <Card title="Water Collections">
          <div className="text-2xl font-semibold">
            {formatMoney(collections.water ?? 0)}
          </div>
        </Card>

        <Card title="Recovery Rate">
          <div className="text-2xl font-semibold">
            {collectionRate}%
          </div>
        </Card>
      </div>

      {/* RENT STATUS */}
      <div className="grid grid-cols-4 gap-4">
        <Card title="Rent Paid">
          <div className="text-green-600 text-2xl">
            {rentBills.fullyPaid ?? 0}
          </div>
        </Card>

        <Card title="Partial">
          <div className="text-yellow-600 text-2xl">
            {rentBills.partiallyPaid ?? 0}
          </div>
        </Card>

        <Card title="Unpaid">
          <div className="text-orange-600 text-2xl">
            {rentBills.unpaid ?? 0}
          </div>
        </Card>

        <Card title="Overdue">
          <div className="text-red-600 text-2xl">
            {rentBills.overdue ?? 0}
          </div>
        </Card>
      </div>

      {/* WATER STATUS */}
      <div className="grid grid-cols-4 gap-4">
        <Card title="Water Paid">
          <div className="text-green-600 text-2xl">
            {waterBills.fullyPaid ?? 0}
          </div>
        </Card>

        <Card title="Partial">
          <div className="text-yellow-600 text-2xl">
            {waterBills.partiallyPaid ?? 0}
          </div>
        </Card>

        <Card title="Unpaid">
          <div className="text-orange-600 text-2xl">
            {waterBills.unpaid ?? 0}
          </div>
        </Card>

        <Card title="Overdue">
          <div className="text-red-600 text-2xl">
            {waterBills.overdue ?? 0}
          </div>
        </Card>
      </div>

      {/* MODALS */}
      <Modal
        title="Add Tenant"
        open={open.tenant}
        onClose={() =>
          setOpen((o) => ({ ...o, tenant: false }))
        }
      >
        <TenantForm onClose={() =>
          setOpen((o) => ({ ...o, tenant: false }))
        } />
      </Modal>

      <Modal
        title="Add Unit"
        open={open.unit}
        onClose={() =>
          setOpen((o) => ({ ...o, unit: false }))
        }
      >
        <UnitForm onClose={() =>
          setOpen((o) => ({ ...o, unit: false }))
        } />
      </Modal>

      <Modal
        title="Create Water Bill"
        open={open.water}
        onClose={() =>
          setOpen((o) => ({ ...o, water: false }))
        }
      >
        <WaterBillForm onClose={() =>
          setOpen((o) => ({ ...o, water: false }))
        } />
      </Modal>

    </div>
  )
}