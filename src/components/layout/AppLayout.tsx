import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AiAssistantWidget } from '../ui/AiAssistantWidget';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <AiAssistantWidget />
      <Footer />
    </div>
  );
};
