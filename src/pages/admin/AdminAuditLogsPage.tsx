import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/services';
import { AuditLog } from '../../types';
import { History, ShieldCheck } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function load() {
      const data = await adminApi.getAuditLogs();
      setLogs(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-teal-400" />
            Audit Logs & User-Reported OCR Errors
          </h1>
          <p className="text-xs text-slate-400">Complete immutable record of database modifications and user feedback.</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Performed By</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-3.5 px-4 font-bold text-white">{log.action}</td>
                <td className="py-3.5 px-4 text-teal-400">{log.performedBy}</td>
                <td className="py-3.5 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="py-3.5 px-4 text-slate-300">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
