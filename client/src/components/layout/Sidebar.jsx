import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareText,
  FileSpreadsheet,
  ShoppingBag,
  Users,
  Boxes,
  Building2,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import clsx from 'clsx';

export function Sidebar() {
  const { user, organization } = useAuth();

  const NAV_ITEMS = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'WhatsApp AI Inbox', to: '/inbox', icon: MessageSquareText, badge: 'AI' },
    { name: 'Quotations', to: '/quotations', icon: FileSpreadsheet },
    { name: 'Sales Orders', to: '/orders', icon: ShoppingBag },
    { name: 'Leads & Enquiries', to: '/leads', icon: Users },
    { name: 'Products & Stock', to: '/products', icon: Boxes },
    { name: 'Customers', to: '/customers', icon: Building2 },
    { name: 'Analytics', to: '/analytics', icon: BarChart3 },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-900/50">
          <Sparkles className="w-5 h-5 text-emerald-100" />
        </div>
        <div>
          <span className="font-bold text-base text-white tracking-tight">VyaparAI</span>
          <span className="text-[10px] block text-emerald-400 font-medium uppercase tracking-wider">
            B2B Orchestrator
          </span>
        </div>
      </div>

      {/* Organization Badge */}
      <div className="px-4 py-3 mx-3 my-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400 font-medium truncate">{organization?.name || 'My Organization'}</p>
        <span className="text-[11px] text-emerald-400 font-semibold block capitalize">
          {organization?.industry || 'Textiles'} Wholesaler
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-700/40 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs uppercase">
          {user?.name?.[0] || 'U'}
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
          <p className="text-[10px] text-slate-400 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
        </div>
      </div>
    </aside>
  );
}
