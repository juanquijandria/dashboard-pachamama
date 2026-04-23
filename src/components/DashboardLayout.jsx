import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Home, Users, Calendar, DollarSign, TrendingUp, Menu, Activity } from 'lucide-react';

const DashboardLayout = ({ children, onLogout }) => {
  const location = useLocation();
  
  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={`flex items-center px-4 py-3 rounded-lg transition-colors font-medium ${
          isActive 
            ? 'bg-green-50 text-pachamama-green' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-pachamama-green'
        }`}
      >
        <Icon className="mr-3 h-5 w-5" />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-gray-200 bg-pachamama-earth text-white">
          <h1 className="text-xl font-bold">Grupo Pachamama</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem to="/" icon={Home} label="Inicio" />
          <NavItem to="/avance-asesores" icon={Activity} label="Avance Asesores" />
          <NavItem to="/citas" icon={Calendar} label="Citas" />
          <NavItem to="/cotizaciones" icon={DollarSign} label="Cotizaciones" />
          <NavItem to="/ventas" icon={TrendingUp} label="Ventas" />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-8">
          <div className="flex items-center text-pachamama-earth font-medium">
            <Menu className="mr-4 h-6 w-6 cursor-pointer lg:hidden" />
            Dashboard
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Admin</span>
            <div className="h-8 w-8 rounded-full bg-pachamama-green text-white flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
