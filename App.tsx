import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { CEODashboard } from './pages/CEODashboard';
import { Employee, Role } from './types';

function App() {
  const [user, setUser] = useState<Employee | null>(null);

  // Check for persisted session
  useEffect(() => {
    const savedUser = localStorage.getItem('hrm_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (employee: Employee) => {
    setUser(employee);
    localStorage.setItem('hrm_user', JSON.stringify(employee));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hrm_user');
  };

  const renderContent = () => {
    if (!user) {
      return <Login onLogin={handleLogin} />;
    }

    if (user.role === Role.CEO) {
        return (
            <div className="space-y-8">
                <CEODashboard />
                <div className="border-t pt-8 border-gray-200">
                   <h3 className="text-xl font-bold text-gray-400 mb-4">ข้อมูลการลงเวลาของคุณ</h3>
                   <EmployeeDashboard user={user} />
                </div>
            </div>
        );
    }

    if (user.role === Role.ADMIN) {
        return (
            <div className="space-y-8">
                <AdminDashboard />
                <div className="border-t pt-8 border-gray-200">
                   <h3 className="text-xl font-bold text-gray-400 mb-4">ข้อมูลการลงเวลาของคุณ</h3>
                   <EmployeeDashboard user={user} />
                </div>
            </div>
        );
    }

    return <EmployeeDashboard user={user} />;
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
}

export default App;