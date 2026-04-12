'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import { useUser } from '@/app/store/useUser';
import { useChat } from '@/app/store/useChat';
import { useUI } from '@/app/store/useUI';
import { ALL_MODELS } from '@/lib/constants';
import { toast } from 'sonner';
import {
  User, Cpu, Palette, Shield, Database, 
  ExternalLink, Save, Check, CreditCard, Zap, Star, Crown, Rocket
} from 'lucide-react';
import { PLANS } from '@/lib/integrations';

export default function SettingsPage() {
  const { walletAddress, displayName, preferredModel, token } = useUser();
  const { setCurrentModel } = useChat();
  const { theme, setTheme } = useUI();
  
  const [name, setName] = useState(displayName || '');
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">
          Configure your XERON experience
        </p>
      </div>

      <div className="space-y-8">
        {/* Subscription */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Subscription</h2>
              <p className="text-xs text-white/40">Manage your plan and billing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === 'free';
              const Icon = plan.id === 'free' ? Check : plan.id === 'starter' ? Zap : plan.id === 'pro' ? Rocket : Crown;
              return (
                <div
                  key={plan.id}
                  className={`relative p-4 rounded-xl border transition-all ${
                    plan.popular
                      ? 'border-purple-500/50 bg-purple-500/5'
                      : isCurrent
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-white/10 glass hover:border-white/20'
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-purple-500 text-[10px]">
                      Popular
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500 text-[10px]">
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
                  {!isCurrent && (
                    <Button
                      className="w-full mt-3"
                      variant={plan.popular ? 'default' : 'outline'}
                      size="sm"
                    >
                      {plan.trialDays ? 'Start Trial' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between p-4 rounded-xl glass">
            <div>
              <p className="text-sm text-white">Current usage</p>
              <p className="text-xs text-white/40">25 / 50 messages today</p>
            </div>
            <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-1/2 bg-blue-500 rounded-full" />
            </div>
          </div>
        </motion.section>

        {/* Profile */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
              <label className="text-sm text-white/60 mb-1 block">Wallet Address</label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm text-white/50 font-mono">{walletAddress || 'Not connected'}</span>
                <Badge variant="default" className="text-[10px]">Base</Badge>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Default Model */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Default Model</h2>
              <p className="text-xs text-white/40">Model used for new conversations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_MODELS.filter(m => m.category === 'chat').slice(0, 10).map((model) => (
              <button
                key={model.modelId}
                onClick={() => setCurrentModel(model.modelId)}
                className={`flex items-center justify-between p-3 rounded-lg transition-all text-left ${
                  preferredModel === model.modelId
                    ? 'bg-blue-600/10 border border-blue-500/30'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div>
                  <span className="text-sm text-white">{model.displayName}</span>
                  <span className="text-[10px] text-white/30 block">{model.provider}</span>
                </div>
                {preferredModel === model.modelId && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            ))}
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-white">Dark Mode</span>
                <p className="text-xs text-white/30">Toggle between dark and light themes</p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
            </div>
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
            <Button variant="outline" className="w-full justify-start gap-2">
              <ExternalLink className="w-4 h-4" />
              Export All Data
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-amber-400 hover:text-amber-300">
              <Database className="w-4 h-4" />
              Clear All Memories
            </Button>
            <Button variant="destructive" className="w-full justify-start gap-2">
              <Shield className="w-4 h-4" />
              Delete Account
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
