'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { Menu, Search, Command, LogOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { UserProfile } from './UserProfile';
import { authFetch } from '@/lib/client-auth';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Chat',
  '/dashboard/code': 'Code Agent',
  '/dashboard/skills': 'Skills',
  '/dashboard/tools': 'Tools',
  '/dashboard/tasks': 'Scheduled Tasks',
  '/dashboard/memory': 'Memory',
  '/dashboard/models': 'Model Catalog',
  '/dashboard/learning': 'Learning Log',
  '/dashboard/history': 'History',
  '/dashboard/preferences': 'Preferences',
  '/dashboard/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar, toggleCommandPalette } = useUI();
  const title = pageTitles[pathname] || 'Dashboard';

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if the request fails, we still clear local state below — the
      // cookie will either be unset by the server or will simply expire.
    }
    useUser.getState().clear();
    // Wipe client caches populated during the session.
    try {
      localStorage.removeItem('xeron-chat');
      localStorage.removeItem('xeron-code-sessions');
      localStorage.removeItem('xeron-user');
    } catch {
      /* localStorage unavailable — ignore */
    }
    router.push('/');
  };

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCommandPalette}
          className="hidden md:flex items-center gap-2 text-white/40 hover:text-white/70"
        >
          <Search className="w-4 h-4" />
          <span className="text-xs">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">
            <Command className="w-3 h-3" />K
          </kbd>
        </Button>

        <ThemeToggle />
        <UserProfile />

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
