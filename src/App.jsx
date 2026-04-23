import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import AvanceAsesores from './pages/AvanceAsesores';
import Citas from './pages/Citas';
import Cotizaciones from './pages/Cotizaciones';
import Ventas from './pages/Ventas';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('auth') === 'true';
  });

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth');
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <DashboardLayout onLogout={handleLogout}>
                <DashboardHome />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        <Route 
          path="/avance-asesores" 
          element={
            isAuthenticated ? (
              <DashboardLayout onLogout={handleLogout}>
                <AvanceAsesores />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        <Route 
          path="/citas" 
          element={
            isAuthenticated ? (
              <DashboardLayout onLogout={handleLogout}>
                <Citas />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        <Route 
          path="/cotizaciones" 
          element={
            isAuthenticated ? (
              <DashboardLayout onLogout={handleLogout}>
                <Cotizaciones />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        <Route 
          path="/ventas" 
          element={
            isAuthenticated ? (
              <DashboardLayout onLogout={handleLogout}>
                <Ventas />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
