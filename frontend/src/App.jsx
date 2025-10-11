import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import LandlordDashboard from './pages/landlord/Dashboard'
import Tenants from './pages/landlord/Tenants'
import Units from './pages/landlord/Units'
import WaterBills from './pages/landlord/WaterBills'
import Rent from './pages/landlord/Rent'
import RentBillDetails from './pages/landlord/RentBillDetails'
import Maintenance from './pages/landlord/Maintenance'
import Payments from './pages/landlord/Payments'
// placeholders
import Reports from './pages/landlord/Reports'
import Caretakers from './pages/landlord/Caretakers'
import LeasesPage from './pages/landlord/Leases'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1">
          <Header />
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/landlord/dashboard" />} />
              {/* Landlord */}
              <Route path="/landlord/dashboard" element={<LandlordDashboard />} />
              <Route path="/landlord/tenants" element={<Tenants />} />
              <Route path="/landlord/units" element={<Units />} />
              <Route path="/landlord/water-bills" element={<WaterBills />} />
              <Route path="/landlord/rent" element={<Rent />} />
              <Route path="/rent-bills/:id" element={<RentBillDetails />} />
              <Route path="/landlord/maintenance" element={<Maintenance />} />
              <Route path="/landlord/payments" element={<Payments />} />
              <Route path="/landlord/reports" element={<Reports />} />
              <Route path="/landlord/caretakers" element={<Caretakers />} />
              <Route path="/landlord/leases" element={<LeasesPage />} />
              {/* Add Caretaker/Tenant routes later */}
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
