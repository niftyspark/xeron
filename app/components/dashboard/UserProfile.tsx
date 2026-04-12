'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { 
  User, CreditCard, Zap, Clock, Settings, X, ChevronRight,
  Check, Star, Crown, Database, MessageSquare, Brain
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PLANS } from '@/lib/integrations';

const tierIcons: Record<string, React.ElementType> = {
  free: Check,
  starter: Zap,
  pro: Star,
  ultra: Crown,
};

export function UserProfile() {
  const [open, setOpen] = useState(false);
  const { userTier, messagesRemaining, messagesLimit, setUserTier, setMessagesRemaining, setMessagesLimit } = useUI();
  const { displayName, walletAddress } = useUser();

  const currentPlan = PLANS.find(p => p.id === userTier) || PLANS[0];
  const TierIcon = tierIcons[userTier] || Check;
  const usagePercent = messagesLimit > 0 ? Math.min((messagesRemaining / messagesLimit) * 100, 100) : 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-white/40 hover:text-white"
      >
        <User className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{displayName || 'User'}</span>
        <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center">
          <TierIcon className="w-3 h-3 text-blue-400" />
        </div>
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-80 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{displayName || 'Guest User'}</p>
                    <p className="text-[11px] text-white/40 truncate max-w-[120px]">
                      {walletAddress?.slice(0, 10)}...
                    </p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)}>
                  <X className="w-4 h-4 text-white/30" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Current Plan */}
                <div className="p-3 rounded-xl glass">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TierIcon className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-white">{currentPlan.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-blue-400">
                      Upgrade
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Zap className="w-3 h-3" />
                    {messagesRemaining} / {messagesLimit > 0 ? messagesLimit : 'Unlimited'} messages today
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all" 
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl glass text-center">
                    <MessageSquare className="w-4 h-4 text-white/40 mx-auto mb-1" />
                    <p className="text-sm text-white font-medium">{messagesRemaining}</p>
                    <p className="text-[10px] text-white/30">Messages</p>
                  </div>
                  <div className="p-3 rounded-xl glass text-center">
                    <Brain className="w-4 h-4 text-white/40 mx-auto mb-1" />
                    <p className="text-sm text-white font-medium">127</p>
                    <p className="text-[10px] text-white/30">Memories</p>
                  </div>
                  <div className="p-3 rounded-xl glass text-center">
                    <Zap className="w-4 h-4 text-white/40 mx-auto mb-1" />
                    <p className="text-sm text-white font-medium">20</p>
                    <p className="text-[10px] text-white/30">Skills</p>
                  </div>
                </div>

                {/* Links */}
                <div className="space-y-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-white/60 hover:text-white"
                    onClick={() => window.location.href = '/dashboard/settings'}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-white/60 hover:text-white"
                    onClick={() => window.location.href = '/dashboard/tools'}
                  >
                    <CreditCard className="w-4 h-4" />
                    Subscription
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}