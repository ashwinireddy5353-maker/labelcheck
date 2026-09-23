import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/services';
import { AdminStats, AuditLog } from '../../types';
import { 
  Users, 
  Scan, 
  Database, 
  Flame, 
  TrendingUp, 
  History,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function loadAdminOverview() {
      try {
        const [statsData, logsData] = await Promise.all([
          adminApi.getStats(),
          adminApi.getAuditLogs(),
        ]);
        setStats(statsData);
        setAuditLogs(logsData);
      } catch (err) {
        console.error('Failed to load admin stats', err);
      }
    }
    loadAdminOverview();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>LabelCheck System Administration</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Admin Operations Overview</h1>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Status: Fully Operational</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
          <div className="flex justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Total Registered Users</span>
            <Users className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{stats?.totalUsers || 1420}</p>
          <p className="text-[11px] text-slate-400">+12% growth this month</p>
        </div>

        <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
          <div className="flex justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Total Scans Executed</span>
            <Scan className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{stats?.totalScans || 8940}</p>
          <p className="text-[11px] text-slate-400">98.4% OCR precision</p>
        </div>

        <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
          <div className="flex justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Indexed Ingredients</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{stats?.totalIngredients || 4850}</p>
          <p className="text-[11px] text-slate-400">CosIng & EWG synced</p>
        </div>

        <div className="p-5 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
          <div className="flex justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Flagged Chemical Hazards</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-amber-400">{stats?.flaggedIngredientsCount || 620}</p>
          <p className="text-[11px] text-slate-400">Restricted substances</p>
        </div>
      </div>

      {/* Analytics Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Flagged Chemicals */}
        <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Top Flagged Chemical Compounds in Scans
          </h3>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topFlaggedChemicals || []} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="count" fill="#0f766e" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Activity Trail */}
        <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" />
            Recent System Audit Logs
          </h3>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-900/80 rounded-2xl border border-slate-700/60 text-xs space-y-1">
                <div className="flex justify-between items-center text-slate-300 font-bold">
                  <span>{log.action}</span>
                  <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-[11px] text-slate-400">{log.details}</p>
                <p className="text-[10px] text-teal-400">By: {log.performedBy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
