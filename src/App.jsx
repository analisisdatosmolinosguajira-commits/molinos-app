import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import MolinosPage from './pages/assets/MolinosPage';
import BombasPage from './pages/assets/BombasPage';
import VisitasPage from './pages/operations/VisitasPage';
import VisitDetail from './pages/operations/VisitDetail';
import OrdenesPage from './pages/operations/OrdenesPage';
import DiagnosticosPage from './pages/operations/DiagnosticosPage';
import ConcertacionesPage from './pages/operations/ConcertacionesPage';
import PersonnelPage from './pages/operations/PersonnelPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ReportsPage from './pages/reports/ReportsPage';
import CommunitiesPage from './pages/admin/CommunitiesPage';
import FabricationPage from './pages/fabrication/FabricationPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          {/* Field Work */}
          <Route path="visitas" element={<VisitasPage />} />
          <Route path="visitas/:id" element={<VisitDetail />} />
          <Route path="comunidades" element={<CommunitiesPage />} />

          <Route path="ordenes" element={<OrdenesPage />} />
          <Route path="diagnosticos" element={<DiagnosticosPage />} />
          <Route path="concertaciones" element={<ConcertacionesPage />} />
          <Route path="cuadrillas" element={<PersonnelPage />} />

          {/* Assets */}
          <Route path="molinos" element={<MolinosPage />} />
          <Route path="bombas" element={<BombasPage />} />

          {/* Workshop */}
          <Route path="inventario" element={<InventoryPage />} />
          <Route path="fabricacion" element={<FabricationPage />} />

          {/* Management */}
          <Route path="reportes" element={<ReportsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;