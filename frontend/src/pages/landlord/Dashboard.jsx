import { useQuery } from '@tanstack/react-query'
import { listTenants } from '../../api/tenants'
import { listUnits } from '../../api/units'
import { listWaterBills } from '../../api/waterBills'
import { listRentBills } from '../../api/rentBills'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import TenantForm from '../../components/forms/TenantForm'
import UnitForm from '../../components/forms/UnitForm'
import WaterBillForm from '../../components/forms/WaterBillForm'
import RentBillForm from '../../components/forms/RentBillForm'
import { useState, useMemo } from 'react'
import { monthKey, formatMoney } from '../../components/utils/format'

export default function Dashboard() {
  const [open, setOpen] = useState({ tenant:false, unit:false, water:false, rent:false })
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: listTenants })
  const { data: units = [] }   = useQuery({ queryKey: ['units'], queryFn: listUnits })
  const { data: wbs = [] }     = useQuery({ queryKey: ['water-bills'], queryFn: listWaterBills })
  const { data: rbs = [] }     = useQuery({ queryKey: ['rent-bills'],  queryFn: listRentBills  })

  const vacantUnits = units.filter(u => !u.tenantId).length
  const nowKey = monthKey(new Date())
  const wbThisMonth = wbs.filter(b => monthKey(b.dueDate) === nowKey)
  const rbThisMonth = rbs.filter(b => monthKey(b.dueDate) === nowKey)
  const isUnpaid = (b) => ('paid' in b) ? !b.paid : (b.status && b.status !== 'paid')
  const sum = (arr) => arr.reduce((a,x)=> a + Number(x.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-5 gap-4">
        <Card title="Total Tenants" value={tenants.length} />
        <Card title="Vacant Units" value={vacantUnits} />
        <Card title="Pending Maintenance Requests" value="—" />
        <Card title="Water (month total / unpaid)">
          <div className="text-lg font-semibold">{formatMoney(sum(wbThisMonth))}</div>
          <div className="text-sm text-gray-500">Unpaid: {formatMoney(sum(wbThisMonth.filter(isUnpaid)))}</div>
        </Card>
        <Card title="Rent (month total / unpaid)">
          <div className="text-lg font-semibold">{formatMoney(sum(rbThisMonth))}</div>
          <div className="text-sm text-gray-500">Unpaid: {formatMoney(sum(rbThisMonth.filter(isUnpaid)))}</div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="bg-black text-white px-3 py-2 rounded" onClick={()=>setOpen(o=>({...o,tenant:true}))}>Add Tenant</button>
        <button className="bg-black text-white px-3 py-2 rounded" onClick={()=>setOpen(o=>({...o,unit:true}))}>Add Unit</button>
        <button className="bg-black text-white px-3 py-2 rounded" onClick={()=>setOpen(o=>({...o,water:true}))}>Record Water Reading</button>
        <button className="bg-black text-white px-3 py-2 rounded" onClick={()=>setOpen(o=>({...o,rent:true}))}>Record Rent</button>
        {/* Send reminders actions can be wired when reminder endpoints exist */}
      </div>

      <Modal title="Add Tenant" open={open.tenant} onClose={()=>setOpen(o=>({...o,tenant:false}))}>
        <TenantForm onClose={()=>setOpen(o=>({...o,tenant:false}))} />
      </Modal>
      <Modal title="Add Unit" open={open.unit} onClose={()=>setOpen(o=>({...o,unit:false}))}>
        <UnitForm onClose={()=>setOpen(o=>({...o,unit:false}))} />
      </Modal>
      <Modal title="Create Water Bill" open={open.water} onClose={()=>setOpen(o=>({...o,water:false}))}>
        <WaterBillForm onClose={()=>setOpen(o=>({...o,water:false}))} />
      </Modal>
      <Modal title="Create Rent Bill" open={open.rent} onClose={()=>setOpen(o=>({...o,rent:false}))}>
        <RentBillForm onClose={()=>setOpen(o=>({...o,rent:false}))} />
      </Modal>
    </div>
  )
}
