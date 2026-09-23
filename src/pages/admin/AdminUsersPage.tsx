import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { User, UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Users, Search, ShieldCheck, UserCheck, ShieldAlert } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await adminApi.getUsers();
        setUsers(data);
      } catch {
        showToast('Failed to load user management list.', 'error');
      }
    }
    loadUsers();
  }, []);

  const handleRoleToggle = (userId: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === 'admin' ? 'user' : 'admin';
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    showToast(`User role updated to ${newRole.toUpperCase()}`, 'success');
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-400" />
            User Management
          </h1>
          <p className="text-xs text-slate-400">View registered accounts, change roles, and manage permissions.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search user by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-teal-500"
        />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Joined Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/50">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-900 text-teal-300 font-bold flex items-center justify-center">
                    {u.fullName.charAt(0)}
                  </div>
                  <div>
                    <p>{u.fullName}</p>
                    <p className="text-[11px] text-slate-400 font-normal">{u.email}</p>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'admin' ? 'bg-amber-900 text-amber-200 border border-amber-700' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="py-3.5 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRoleToggle(u.id, u.role)}
                    className="text-teal-400 hover:text-white"
                  >
                    Switch to {u.role === 'admin' ? 'User' : 'Admin'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
