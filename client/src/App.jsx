import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Claim from './pages/Claim';
import Scratch from './pages/Scratch';
import Result from './pages/Result';
import DeliveryDetails from './pages/DeliveryDetails';
import TokenLanding from './pages/TokenLanding';
import InstantWinDirect from './pages/InstantWinDirect';
import NiterraCrosswordEnter from './pages/NiterraCrosswordEnter';
import AudiInstantWinEnter from './pages/AudiInstantWinEnter';
import DeviceSimulator from './pages/DeviceSimulator';
import Lab from './pages/Lab';
import LabDisplay from './pages/LabDisplay';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminManifest from './pages/AdminManifest';
import AdminClaims from './pages/AdminClaims';
import AdminAudit from './pages/AdminAudit';
import AdminReconciliation from './pages/AdminReconciliation';
import AdminDemoControl from './pages/AdminDemoControl';
import FulfilPrize from './pages/FulfilPrize';

function RequireAdmin({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"                    element={<Landing />} />
        <Route path="/claim"               element={<Claim />} />
        <Route path="/scratch/:claimId"    element={<Scratch />} />
        <Route path="/result/:claimId"     element={<Result />} />
        <Route path="/delivery/:claimId"  element={<DeliveryDetails />} />
        <Route path="/fulfil/:token"        element={<FulfilPrize />} />

        {/* Pure Random device flow */}
        <Route path="/t/:token"            element={<TokenLanding />} />
        <Route path="/enter"               element={<InstantWinDirect />} />
        <Route path="/enter/repco"         element={<NiterraCrosswordEnter />} />
        <Route path="/enter/audi-instant-win" element={<AudiInstantWinEnter />} />
        <Route path="/enter/audi"          element={<Navigate to="/enter/audi-instant-win" replace />} />
        <Route path="/demo/device"         element={<DeviceSimulator />} />
        <Route path="/demo/device/:hwId"   element={<DeviceSimulator />} />
        <Route path="/lab"                 element={<Lab />} />
        <Route path="/lab/display/:sessionId" element={<LabDisplay />} />
        <Route path="/lab/:configId"        element={<Lab />} />

        {/* Admin */}
        <Route path="/admin"               element={<AdminLogin />} />
        <Route path="/admin/dashboard"     element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/manifest"      element={<RequireAdmin><AdminManifest /></RequireAdmin>} />
        <Route path="/admin/claims"        element={<RequireAdmin><AdminClaims /></RequireAdmin>} />
        <Route path="/admin/audit"         element={<RequireAdmin><AdminAudit /></RequireAdmin>} />
        <Route path="/admin/reconciliation"element={<RequireAdmin><AdminReconciliation /></RequireAdmin>} />
        <Route path="/admin/demo-prizes"   element={<RequireAdmin><AdminDemoControl /></RequireAdmin>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
