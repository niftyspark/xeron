'use client';

import { usePathname } from 'next/navigation';
import { WalletConnectButton } from '@/app/components/web3/ConnectButton';
import { useUI } from '@/app/store/useUI';
import { useChat } from '@/app/store/useChat';
import { Menu, Search, Bell, Command } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { UserProfile } from './UserProfile';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Chat',
  '/dashboard/skills': 'Skills',
  '/dashboard/tools': 'Tools',
  '/dashboard/tasks': 'Scheduled Tasks',
  '/dashboard/memory': 'Memory',
  '/dashboard/models': 'Model Catalog',
  '/dashboard/learning': 'Learning Log',
  '/dashboard/history': 'History',
  '/dashboard/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar, toggleCommandPalette } = useUI();
  const title = pageTitles[pathname] || 'Dashboard';

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
        {/* Command palette trigger */}
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

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile */}
        <UserProfile />

        {/* Wallet */}
        <WalletConnectButton />
      </div>
    </header>
  );
}
