import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Subjects from './pages/Subjects';
import Teachers from './pages/Teachers';
import TakeAttendance from './pages/TakeAttendance';
import ViewAttendance from './pages/ViewAttendance';
import Reports from './pages/Reports';
import Timetable from './pages/Timetable';
import AttendanceCalculator from './pages/AttendanceCalculator';
import StudentImport from './pages/StudentImport';
import MyAttendance from './pages/MyAttendance';

function ProtectedLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === 'student' ? '/my-attendance' : '/'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<RoleGuard roles={['admin', 'teacher', 'hod', 'student_cr']}><Dashboard /></RoleGuard>} />
        <Route path="/my-attendance" element={<RoleGuard roles={['student']}><MyAttendance /></RoleGuard>} />
        <Route path="/timetable" element={<RoleGuard roles={['admin', 'teacher', 'hod', 'student_cr']}><Timetable /></RoleGuard>} />
        <Route path="/students" element={<RoleGuard roles={['admin', 'hod']}><Students /></RoleGuard>} />
        <Route path="/subjects" element={<RoleGuard roles={['admin', 'hod']}><Subjects /></RoleGuard>} />
        <Route path="/teachers" element={<RoleGuard roles={['admin']}><Teachers /></RoleGuard>} />
        <Route path="/attendance/take" element={<RoleGuard roles={['teacher', 'admin', 'student_cr']}><TakeAttendance /></RoleGuard>} />
        <Route path="/attendance/view" element={<ViewAttendance />} />
        <Route path="/attendance/calculator" element={<AttendanceCalculator />} />
        <Route path="/reports" element={<RoleGuard roles={['admin', 'teacher', 'hod']}><Reports /></RoleGuard>} />
        <Route path="/import" element={<RoleGuard roles={['admin']}><StudentImport /></RoleGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
