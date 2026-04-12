'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUI } from '@/app/store/useUI';
import { useChat } from '@/app/store/useChat';
import {
  MessageSquare, Zap, Wrench, Calendar, Brain,
  Cpu, BookOpen, History, Settings, ChevronLeft,
  ChevronRight, Sparkles, Plus, X, Pin,
} from 'lucide-react';

const navItems = [
  { label: 'Chat', href: '/dashboard', icon: MessageSquare },
  { label: 'Skills', href: '/dashboard/skills', icon: Zap },
  { label: 'Tools', href: '/dashboard/tools', icon: Wrench },
  { label: 'Tasks', href: '/dashboard/tasks', icon: Calendar },
  { label: 'Memory', href: '/dashboard/memory', icon: Brain },
  { label: 'Models', href: '/dashboard/models', icon: Cpu },
  { label: 'Learning', href: '/dashboard/learning', icon: BookOpen },
  { label: 'History', href: '/dashboard/history', icon: History },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUI();
  const { conversations, activeConversationId, setActiveConversation } = useChat();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 flex flex-col bg-[#0d0d14] border-r border-white/5 sidebar-transition',
          sidebarOpen ? 'w-64' : 'w-16',
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 h-16 border-b border-white/5">
          {sidebarOpen && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white tracking-tight">XERON</span>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-blue-400')} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Recent conversations */}
        {sidebarOpen && conversations.length > 0 && (
          <div className="border-t border-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/30 uppercase tracking-wider">Recent</span>
              <Link
                href="/dashboard"
                className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {conversations.slice(0, 5).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded-md text-xs truncate transition-colors',
                    conv.id === activeConversationId
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  )}
                >
                  {conv.title || 'New Chat'}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
