import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AdminSidebar } from './Sidebar';
import { Footer } from './Footer';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden bg-slate-900/50">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};
