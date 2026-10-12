import React from 'react';
import { LogOut, Bell, Wifi, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {/* Status Indicators */}
        <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>WhatsApp Cloud API Connected</span>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Gemini 2.0 Flash Ready</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role badge */}
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {user?.role?.replace('_', ' ')}
        </span>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign out of session"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
