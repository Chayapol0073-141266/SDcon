import React from 'react';
import { Employee } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: Employee | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-pastel-bg text-pastel-text font-sans selection:bg-pastel-orangeLight">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-pastel-orangeLight shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Logo Area - Placeholder for User's Image */}
              <div className="h-10 w-auto overflow-hidden rounded-md">
                 <img 
                    src="https://placehold.co/150x50/orange/white?text=SD+Con" 
                    alt="SD Con Logo" 
                    className="h-full w-auto object-contain"
                 />
              </div>
              <span className="font-bold text-xl tracking-tight text-pastel-text hidden sm:block">
                HRM_SDcon <span className="text-pastel-orangeDark">v.1</span>
              </span>
            </div>
            
            {user && (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.role} | {user.department}</span>
                </div>
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full border-2 border-pastel-orangeLight object-cover"
                />
                <button 
                  onClick={onLogout}
                  className="p-2 rounded-full hover:bg-pastel-orangeLight text-gray-500 transition-colors"
                  title="ออกจากระบบ"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};