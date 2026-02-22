import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import MolinosPage from './pages/assets/MolinosPage';
import BombasPage from './pages/assets/BombasPage';
import VisitasPage from './pages/operations/VisitasPage';
import JourneyPage from './pages/operations/JourneyPage';
import JourneyDetail from './pages/operations/JourneyDetail';
import OrdenesPage from './pages/operations/OrdenesPage';
import DiagnosticosPage from './pages/operations/DiagnosticosPage';
import NewDiagnosisPage from './pages/operations/NewDiagnosisPage';
import ConcertacionesPage from './pages/operations/ConcertacionesPage';
import InstallPumpPage from './pages/operations/InstallPumpPage';
import PersonnelPage from './pages/operations/PersonnelPage';
import InventoryPage from './pages/inventory/InventoryPage';
import SupplierDetail from './pages/inventory/SupplierDetail';
import ReportsPage from './pages/reports/ReportsPage';
import CommunitiesPage from './pages/admin/CommunitiesPage';
import FabricationPage from './pages/fabrication/FabricationPage';
import MillDetail from './pages/assets/MillDetail';
import PumpDetail from './pages/assets/PumpDetail';
import RLSTestPage from './pages/test/RLSTestPage';
import MigrationsTestPage from './pages/test/MigrationsTestPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          {/* Field Work */}
          <Route path="visitas" element={<JourneyPage />} />
          <Route path="visitas/:id" element={<JourneyDetail />} />
          <Route path="comunidades" element={<CommunitiesPage />} />

          <Route path="ordenes" element={<OrdenesPage />} />
          <Route path="diagnosticos" element={<DiagnosticosPage />} />
          <Route path="diagnosticos/new" element={<NewDiagnosisPage />} />
          <Route path="operations/install-pump" element={<InstallPumpPage />} />
          <Route path="concertaciones" element={<ConcertacionesPage />} />
          <Route path="cuadrillas" element={<PersonnelPage />} />

          {/* Assets */}
          <Route path="molinos" element={<MolinosPage />} />
          <Route path="molinos/:id" element={<MillDetail />} />
          <Route path="bombas" element={<BombasPage />} />
          <Route path="bombas/:id" element={<PumpDetail />} />

          {/* Workshop */}
          <Route path="inventario" element={<InventoryPage />} />
          <Route path="inventario/supplier/:id" element={<SupplierDetail />} />
          <Route path="fabricacion" element={<FabricationPage />} />

          {/* Management */}
          <Route path="reportes" element={<ReportsPage />} />

          {/* Test / Development */}
          <Route path="test/rls" element={<RLSTestPage />} />
          <Route path="test/migrations" element={<MigrationsTestPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;