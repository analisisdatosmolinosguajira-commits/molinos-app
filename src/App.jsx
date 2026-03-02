import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
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
import ProfilePage from './pages/profile/ProfilePage';
import OperationsControlPage from './pages/admin/OperationsControlPage';
import SSTPage from './pages/sst/SSTPage';
import PersonSSTDetail from './pages/sst/PersonSSTDetail';
import NotificationsPage from './pages/notifications/NotificationsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
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

          {/* SST */}
          <Route path="sst" element={<SSTPage />} />
          <Route path="sst/:personId" element={<PersonSSTDetail />} />

          {/* Profile & Admin */}
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="notificaciones" element={<NotificationsPage />} />
          <Route path="admin/operaciones" element={<OperationsControlPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;