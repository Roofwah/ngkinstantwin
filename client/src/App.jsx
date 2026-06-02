import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Claim from './pages/Claim';
import Scratch from './pages/Scratch';
import Result from './pages/Result';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminManifest from './pages/AdminManifest';
import AdminClaims from './pages/AdminClaims';
import AdminAudit from './pages/AdminAudit';
import AdminReconciliation from './pages/AdminReconciliation';

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

        {/* Admin */}
        <Route path="/admin"               element={<AdminLogin />} />
        <Route path="/admin/dashboard"     element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/manifest"      element={<RequireAdmin><AdminManifest /></RequireAdmin>} />
        <Route path="/admin/claims"        element={<RequireAdmin><AdminClaims /></RequireAdmin>} />
        <Route path="/admin/audit"         element={<RequireAdmin><AdminAudit /></RequireAdmin>} />
        <Route path="/admin/reconciliation"element={<RequireAdmin><AdminReconciliation /></RequireAdmin>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
