'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import { useUser } from '@/app/store/useUser';
import { useUI } from '@/app/store/useUI';
import { toast } from 'sonner';
import {
  User, Palette, Shield, Database, 
  ExternalLink, Save, Check, CreditCard, Zap, Crown, Rocket, Loader2
} from 'lucide-react';
import { PLANS } from '@/lib/integrations';

export default function SettingsPage() {
  const { walletAddress, displayName, token, logout } = useUser();
  const { appTheme, setAppTheme, userTier, messagesRemaining, messagesLimit } = useUI();
  
  const [name, setName] = useState(displayName || '');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearingMemories, setClearingMemories] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: name }),
      });
      if (res.ok) {
        toast.success('Profile updated');
      }
    } catch {
      toast.error('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!token) {
      toast.error('You must be logged in to export data');
      return;
    }
    setExporting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [conversationsRes, memoriesRes, userRes] = await Promise.all([
        fetch('/api/conversations', { headers }),
        fetch('/api/memories', { headers }),
        fetch('/api/user', { headers }),
      ]);

      const conversations = conversationsRes.ok ? await conversationsRes.json() : [];
      const memories = memoriesRes.ok ? await memoriesRes.json() : [];
      const user = userRes.ok ? await userRes.json() : {};

      const exportData = {
        exportedAt: new Date().toISOString(),
        user,
        conversations,
        memories,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xeron-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleClearMemories = async () => {
    if (!token) return;
    const confirmed = window.confirm(
      'Are you sure you want to clear all memories? This action cannot be undone.'
    );
    if (!confirmed) return;

    setClearingMemories(true);
    try {
      const res = await fetch('/api/memories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clearAll: true }),
      });
      if (res.ok) {
        toast.success('All memories cleared');
      } else {
        toast.error('Failed to clear memories');
      }
    } catch {
      toast.error('Failed to clear memories');
    } finally {
      setClearingMemories(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    const confirmed = window.confirm(
      'WARNING: This will permanently delete your account and all associated data including conversations, memories, and settings. This action CANNOT be undone.\n\nAre you sure you want to delete your account?'
    );
    if (!confirmed) return;

    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        localStorage.removeItem('xeron_token');
        localStorage.removeItem('xeron_user');
        localStorage.removeItem('xeron-user');
        localStorage.removeItem('xeron-ui');
        logout();
        window.location.href = '/';
      } else {
        toast.error('Failed to delete account');
      }
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  const usagePercent = messagesLimit > 0 ? Math.min((messagesRemaining / messagesLimit) * 100, 100) : 100;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">
          Configure your XERON experience
        </p>
      </div>

      <div className="space-y-8">
        {/* User Profile / Subscription */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Plan</h2>
              <p className="text-xs text-white/40">Manage subscription and usage</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === userTier;
              const Icon = plan.id === 'free' ? Check : plan.id === 'starter' ? Zap : plan.id === 'pro' ? Rocket : Crown;
              return (
                <div
                  key={plan.id}
                  className={`relative p-4 rounded-xl border transition-all ${
                    plan.popular
                      ? 'border-purple-500/50 bg-purple-500/5'
                      : isCurrent
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-white/10 glass hover:border-white/20'
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-purple-500 text-[10px]">
                      Popular
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="absolute -top-2 -right-2 bg-blue-500 text-[10px]">
                      Current
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${plan.popular ? 'text-purple-400' : 'text-white/60'}`} />
                    <span className="text-sm font-medium text-white">{plan.name}</span>
                  </div>
                  <div className="mb-3">
                    <span className="text-xl font-bold text-white">${plan.price}</span>
                    <span className="text-xs text-white/40">/{plan.period}</span>
                  </div>
                  <div className="space-y-1">
                    {plan.features.slice(0, 3).map((feature) => (
                      <div key={feature} className="flex items-center gap-1.5 text-xs text-white/50">
                        <Check className="w-3 h-3 text-green-400" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 rounded-xl glass">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white">Messages remaining today</p>
                <p className="text-xs text-white/40">
                  {messagesRemaining} / {messagesLimit > 0 ? messagesLimit : 'Unlimited'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">{Math.round(usagePercent)}%</p>
                <p className="text-[10px] text-white/40">used</p>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all" 
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </motion.section>

        {/* Profile Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <p className="text-xs text-white/40">Your identity and display settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Display Name</label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                />
                <Button onClick={handleSaveProfile} disabled={saving} variant="secondary">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">Email</label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm text-white/50 font-mono">{walletAddress || 'Not connected'}</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Appearance</h2>
              <p className="text-xs text-white/40">Customize the look and feel</p>
            </div>
          </div>

          <div className="space-y-2">
            {(['dark', 'light', 'neumorphism', 'cyberpunk'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAppTheme(t)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  appTheme === t ? 'bg-blue-600/10 border border-blue-500/30' : 'glass hover:bg-white/[0.06]'
                }`}
              >
                <div>
                  <span className="text-sm text-white">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  <p className="text-xs text-white/30">
                    {t === 'dark' && 'Default dark theme'}
                    {t === 'light' && 'Clean light mode'}
                    {t === 'neumorphism' && 'Soft extruded shadows'}
                    {t === 'cyberpunk' && 'Industrial neon style'}
                  </p>
                </div>
                {appTheme === t && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Data Management */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Data Management</h2>
              <p className="text-xs text-white/40">Export and manage your data</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {exporting ? 'Exporting...' : 'Export All Data'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-amber-400 hover:text-amber-300"
              onClick={handleClearMemories}
              disabled={clearingMemories}
            >
              {clearingMemories ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {clearingMemories ? 'Clearing...' : 'Clear All Memories'}
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {deletingAccount ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
