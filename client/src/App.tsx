import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import OrderList from '@/pages/OrderList';
import OrderDetail from '@/pages/OrderDetail';
import SubmitOrder from '@/pages/SubmitOrder';
import UserManagement from '@/pages/UserManagement';
import TradeManagement from '@/pages/TradeManagement';
import Profile from '@/pages/Profile';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isLoggedIn, user } = useAuthStore();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute roles={['ADM']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/orders/my" element={<ProtectedRoute roles={['STU']}><OrderList /></ProtectedRoute>} />
          <Route path="/orders/dept" element={<ProtectedRoute roles={['TCH']}><OrderList /></ProtectedRoute>} />
          <Route path="/orders/tasks" element={<ProtectedRoute roles={['WRK']}><OrderList /></ProtectedRoute>} />
          <Route path="/orders/manage" element={<ProtectedRoute roles={['ADM']}><OrderList /></ProtectedRoute>} />
          <Route path="/orders/submit" element={<ProtectedRoute roles={['STU', 'TCH']}><SubmitOrder /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/users" element={<ProtectedRoute roles={['ADM']}><UserManagement /></ProtectedRoute>} />
          <Route path="/trades" element={<ProtectedRoute roles={['ADM']}><TradeManagement /></ProtectedRoute>} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
