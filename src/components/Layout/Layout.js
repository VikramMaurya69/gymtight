import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ user, role, onLogout, children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden text-[var(--foreground)]">
      <Sidebar
        user={user}
        role={role}
        onLogout={onLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={setIsSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={setIsMobileMenuOpen}
      />
      <div className={`flex flex-col flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[280px]'}`}>
        <Header 
          user={user}
          role={role}
          onLogout={onLogout}
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto bg-[var(--background)]/80 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;


