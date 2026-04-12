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
  User, Key, Cpu, Palette, Shield, Database, 
  ExternalLink, Save, Eye, EyeOff, Check
} from 'lucide-react';

export default function SettingsPage() {
  const { walletAddress, displayName, preferredModel, token } = useUser();
  const { setCurrentModel } = useChat();
  const { theme, setTheme } = useUI();
  
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [name, setName] = useState(displayName || '');
  const [saving, setSaving] = useState(false);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim() || !token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey }),
      });
      if (res.ok) {
        toast.success('API key saved securely');
        setApiKey('');
      } else {
        toast.error('Failed to save API key');
      }
    } catch {
      toast.error('Error saving API key');
    } finally {
      setSaving(false);
    }
  };

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

        {/* API Configuration */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl glass"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">API Configuration</h2>
              <p className="text-xs text-white/40">Your 4EverLand AI API key — encrypted at rest</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">4EverLand API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="pr-10"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button onClick={handleSaveApiKey} disabled={!apiKey.trim() || saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
              <p className="text-[10px] text-white/30 mt-1">
                Get your key at{' '}
                <a href="https://ai.4everland.org" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  ai.4everland.org
                </a>
              </p>
            </div>
          </div>
        </motion.section>

        {/* Default Model */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.3 }}
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
          transition={{ delay: 0.4 }}
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
