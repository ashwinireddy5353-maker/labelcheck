import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  AlertTriangle, 
  Flame, 
  RefreshCw, 
  FileSpreadsheet, 
  History,
  ShieldCheck
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const links = [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/ingredients', label: 'Ingredient Dictionary', icon: Database },
    { to: '/admin/allergens', label: 'Allergen Registry', icon: AlertTriangle },
    { to: '/admin/hazards', label: 'Chemical Hazards', icon: Flame },
    { to: '/admin/alternatives', label: 'Safer Alternatives', icon: RefreshCw },
    { to: '/admin/datasets', label: 'Dataset Sync', icon: FileSpreadsheet },
    { to: '/admin/audit-logs', label: 'Audit Logs & OCR Errors', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] p-4 flex flex-col border-r border-slate-800">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-4 bg-amber-950/40 rounded-xl border border-amber-900/50">
        <ShieldCheck className="w-4 h-4 text-amber-400" />
        <span>Admin Workspace</span>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 mt-6 bg-slate-800/60 rounded-xl border border-slate-700/50 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-200">System Status</p>
        <p className="mt-0.5">AI Model: OCR v4.2 Active</p>
        <p className="text-emerald-400 font-bold mt-1">● All Systems Operational</p>
      </div>
    </aside>
  );
};
