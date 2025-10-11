import { NavLink } from 'react-router-dom'

const base = 'block px-4 py-2 rounded hover:bg-gray-100'
const active = 'bg-gray-200 font-semibold'

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r">
      <div className="p-4 text-xl font-bold">TMS</div>
      <nav className="p-2 space-y-1">
        <div className="px-4 text-xs uppercase text-gray-500">Landlord</div>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/dashboard">Dashboard</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/units">Units</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/tenants">Tenants</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/leases">Leases</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/water-bills">Water Bills</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/rent">Rent</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/maintenance">Maintenance</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/payments">Payments</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/reports">Reports</NavLink>
        <NavLink className={({isActive})=> `${base} ${isActive?active:''}`} to="/landlord/caretakers">Caretakers</NavLink>
      </nav>
    </aside>
  )
}
