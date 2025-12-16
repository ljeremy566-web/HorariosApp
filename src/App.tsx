import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/login';
import AppLayout from './layout/layout';
import DashboardPage from './pages/DashboardPage';
import StaffPage from './pages/StaffPage';
import TemplatesPage from './pages/TemplatesPage';
import SchedulerPage from './pages/SchedulerPage';
import AreasPage from './pages/AreasPage';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        className: 'text-sm font-medium text-slate-700',
        style: { borderRadius: '12px', background: '#fff', color: '#333' }
      }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="scheduler" element={<SchedulerPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="areas" element={<AreasPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
    </>
  );
}

export default App;
