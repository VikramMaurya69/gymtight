import React from 'react';
import { Menu, Bell } from 'lucide-react';
import BranchSelector from '../Branch/BranchSelector';

const Header = ({ user, role, onLogout, onMobileMenuToggle, isMobileMenuOpen, title = 'GymTight Fitness Admin Panel' }) => {
  const emailPrefix = user?.email?.split('@')[0] || '';
  const normalizedPrefix = emailPrefix.toLowerCase();
  const displayName = user?.displayName || (normalizedPrefix.includes('vigour') ? 'GymTight Fitness' : (emailPrefix || 'Admin'));

  return (
    <header className="bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-20 h-16 flex items-center">
      <div className="flex items-center justify-between w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors"
            onClick={onMobileMenuToggle}
            aria-label="Toggle mobile menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight leading-none">{title}</h1>
            <span className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium hidden sm:block">
              Welcome back, {displayName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:block">
            <BranchSelector />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 pl-4 border-l border-[var(--border)]">
            <button className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] rounded-full transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--card)]"></span>
            </button>

            <div className="flex items-center gap-3 pl-2">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-[var(--foreground)] leading-none">
                  {displayName}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] mt-0.5 capitalize">
                  {role || 'Admin'}
                </span>
              </div>

              <div className="h-9 w-9 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-[var(--border)] cursor-pointer transition-all">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;


