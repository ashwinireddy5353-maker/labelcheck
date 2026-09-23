import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { 
  Scan, 
  History, 
  Bookmark, 
  BarChart2, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Logo size="md" />

        {/* Main Navigation Links */}
        {isAuthenticated ? (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isActive('/dashboard') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            <Link
              to="/scan"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isActive('/scan') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scan className="w-4 h-4" />
              Scan Product
            </Link>

            <Link
              to="/history"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isActive('/history') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              Scan History
            </Link>

            <Link
              to="/saved"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isActive('/saved') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved Products
            </Link>

            <Link
              to="/compare"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isActive('/compare') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Compare
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className="px-3 py-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 ml-2 shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Panel
              </Link>
            )}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-teal-700 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-teal-700 transition-colors">Features</a>
            <a href="#why-labelcheck" className="hover:text-teal-700 transition-colors">Why Us</a>
            <a href="#disclaimer" className="hover:text-teal-700 transition-colors">Disclaimer</a>
          </nav>
        )}

        {/* Right CTA / Controls */}
        <div className="flex items-center gap-3">
          {/* Dev Mode Role Switcher */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-medium text-slate-600">
              <span className="px-1.5 text-slate-400">Role:</span>
              <button
                onClick={() => switchRole('user')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  user?.role === 'user' ? 'bg-white text-teal-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                User
              </button>
              <button
                onClick={() => switchRole('admin')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  user?.role === 'admin' ? 'bg-amber-600 text-white shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Admin
              </button>
            </div>
          )}

          {isAuthenticated ? (
            <>
              {/* Quick Scan CTA */}
              <Button
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate('/scan')}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Quick Scan
              </Button>

              {/* Notifications Icon */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600 ring-2 ring-white" />
              </Link>

              {/* Profile Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 rounded-full border border-slate-200 hover:border-teal-500 transition-colors focus:outline-none"
                >
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={user?.fullName || 'User'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block" />
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in"
                    onMouseLeave={() => setProfileOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{user?.fullName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      My Profile & Preferences
                    </Link>

                    <Link
                      to="/history"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <History className="w-4 h-4 text-slate-400" />
                      Scan History
                    </Link>

                    {user?.role === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors font-semibold"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        Admin Dashboard
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
